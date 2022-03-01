import { Buffer } from "buffer";
import git from "isomorphic-git";
import gitHttp from "isomorphic-git/http/web";
import { TransactionalFileSystem, TsConfigResolver } from "@ts-morph/common";
import { Volume } from "memfs";

import { InMemoryFileSystemHost, Node, Project, ProjectOptions } from "ts-morph";
import { Octokit } from "@octokit/rest";
import {
    detectSnowflakes,
    FindUsageWarning,
    getTraceNode,
    resolveDependencies,
    setupFindUsages,
    setupModuleResolution,
    SUPPORTED_FILE_TYPES,
} from "radius-tracker";

import { NodeRef, TrackerRequest, TrackerResponse, TrackerResponseMessage } from "./payloads";
import { stringifyError } from "../util/stringifyError";

global.Buffer = Buffer; // TODO: provide via webpack globals

const testFileRe = /\.(tests?|specs?|stories|story)\./; // TODO: accept as a parameter
const yarnDirRe = /\/\.yarn\//;
const jsRe = /\.jsx?$/;

const octokit = new Octokit();
async function track(githubUrl: TrackerRequest, reportProgress: (message: string) => void): Promise<TrackerResponse> {
    const url = new URL(githubUrl);
    if (url.hostname !== "github.com") { throw new Error("github.com url expected"); }
    const [,owner, repo] = url.pathname.split("/");
    if (!owner || !repo) { throw new Error("Url does not point to a github repo"); }

    reportProgress(`Fetching repo metadata for https://github.com/${ owner }/${ repo }`);
    const repoInfo = await octokit.repos.get({ owner, repo });

    reportProgress(`Cloning ${ repoInfo.data.clone_url }`);
    const cloneFs = Volume.fromJSON({});
    await git.clone({
        fs: { promises: cloneFs.promises },
        http: gitHttp,
        dir: "/",
        url: repoInfo.data.clone_url,
        depth: 1,
        singleBranch: true,
        noTags: true,
        corsProxy: "https://cors.isomorphic-git.org", // TODO: get rid of cors proxy
        onProgress: progEvent => reportProgress(`Cloning ${ repoInfo.data.clone_url }: ${ progEvent.phase } ${ [progEvent.loaded, progEvent.total].filter(Boolean).join("/") }`),
    });

    console.log(cloneFs.toJSON());

    reportProgress("Setting up TS compiler");
    const tsconfigPath = "/tsconfig.json";
    const jsconfigPath = "/jsconfig.json";

    const allFiles = findF(cloneFs, "/");
    const getTsconfigCompilerOptions = () => {
        // TSConfig is a .json file, but it's not a json — e.g. it allows comments and `extends` references.
        const memoFsHost = new InMemoryFileSystemHost();
        allFiles.filter(f => f.endsWith(".json")).map(f => memoFsHost.writeFileSync(f, readFile(cloneFs, f)));
        const tsconfigResolutionFs = new TransactionalFileSystem(memoFsHost);
        return new TsConfigResolver(tsconfigResolutionFs, tsconfigResolutionFs.getStandardizedAbsolutePath(tsconfigPath), "utf8")
            .getCompilerOptions();
    };

    const isTsProject = isFile(cloneFs, tsconfigPath);
    const config: ProjectOptions =
          isTsProject ? { compilerOptions: getTsconfigCompilerOptions() }
        : isFile(cloneFs, jsconfigPath) ? { compilerOptions: { ...JSON.parse(readFile(cloneFs, jsconfigPath)).compilerOptions ?? {}, allowJs: true } }
        : { compilerOptions: { allowJs: true } };

    const project = new Project({ ...config, useInMemoryFileSystem: true });
    const allowJs = isTsProject ? project.getCompilerOptions().allowJs ?? false : true;
    allFiles
        .filter(f => SUPPORTED_FILE_TYPES.some(ext => f.endsWith(ext)))
        .filter(f => allowJs || !jsRe.test(f))
        .filter(f => !yarnDirRe.test(f))
        .map(f => project.createSourceFile(f, readFile(cloneFs, f)));

    const relevantSourceFiles = project.getSourceFiles().filter(f => !testFileRe.test(f.getFilePath()));
    const snowflakes = relevantSourceFiles
        .map((f, i) => {
            reportProgress(`Detecting snowflakes in files ${ i + 1 }/${ relevantSourceFiles.length }`);
            return detectSnowflakes(f);
        })
        .reduce((a, b) => [...a, ...b], []);

    reportProgress("Resolving import/export dependencies");
    const dependencies = resolveDependencies(project, setupModuleResolution(project, "/"));

    const findUsages = setupFindUsages(dependencies);
    const findUsageWarnings: FindUsageWarning[] = [];

    const snowflakeUsageData = snowflakes.map((snowflake, i) => {
        reportProgress(`Finding snowflake usages ${ i + 1 }/${ snowflakes.length }`);

        const target = snowflake.identifier ?? snowflake.declaration;
        const { usages, warnings } = findUsages(target);
        findUsageWarnings.push(...warnings);

        return { target, usages: usages.filter(({ use }) => !testFileRe.test(use.getSourceFile().getFilePath())) };
    });

    function nodeRef(node: Node): NodeRef {
        const filepath = node.getSourceFile().getFilePath();
        const startLine = node.getStartLineNumber(true);
        const endLine = node.getEndLineNumber();
        return {
            filepath,
            text: node.print({ removeComments: true }),
            startLine, endLine,
            context: node.getParent()?.print({ removeComments: true }),
            url: `https://github.com/${ owner }/${ repo }/blob/${ repoInfo.data.default_branch }${ filepath }#L${ startLine }-L${ endLine }`,
        };
    }
    return {
        warnings: [...dependencies.warnings, ...findUsageWarnings].map(w => ({
            type: w.type,
            message: w.message,
        })),
        snowflakeUsages: snowflakeUsageData
            .sort((a, b) => b.usages.length - a.usages.length)
            .map(data => ({
                target: nodeRef(data.target),
                usages: data.usages.map(u => ({
                    use: nodeRef(u.use),
                    aliasPath: u.aliasPath,
                    trace: u.trace.map(t => ({
                        type: t.type,
                        node: nodeRef(getTraceNode(t)),
                    })),
                })),
            })),
    };
}

type MemfsVolume = ReturnType<(typeof Volume)["fromJSON"]>;
function isFile(fs: MemfsVolume, path: string): boolean {
    return fs.statSync(path, { throwIfNoEntry: false })?.isFile() ?? false;
}

function readFile(fs: MemfsVolume, path: string): string {
    const data = fs.readFileSync(path);
    return Buffer.from(data).toString("utf8");
}

const join = (base: string, path: string) => base === "/" ? `/${ path }` : `${ base }/${ path }`;
function findF(fs: MemfsVolume, path: string): string[] {
    const files: string[] = [];
    const dir = fs.readdirSync(path);
    for (const p of dir) {
        if (typeof p !== "string") { throw new Error("String expected"); }
        const filepath = join(path, p);
        const stat = fs.statSync(filepath);
        if (stat.isFile()) { files.push(filepath); }
        if (stat.isDirectory()) { files.push(...findF(fs, filepath)); }
    }
    return files;
}

onmessage = function messageReceived(msg) {
    const data: TrackerRequest = msg.data;

    const reportProgress = (text: string) => {
        const message: TrackerResponseMessage = { type: "progress", message: text };
        this.postMessage(message);
    };

    track(data, reportProgress).then(
        payload => {
            const message: TrackerResponseMessage = { type: "success", payload };
            this.postMessage(message);
        },
        err => {
            console.log(err);
            const message: TrackerResponseMessage = { type: "failure", error: stringifyError(err) };
            this.postMessage(message);
        },
    );
};
