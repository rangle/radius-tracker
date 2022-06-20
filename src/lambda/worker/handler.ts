import { Buffer } from "buffer";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";
import { Volume } from "memfs";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
    tsMorph,
    tsMorphCommon,
    detectSnowflakes,
    FindUsageWarning,
    getTraceNode,
    resolveDependencies,
    setupFindUsages,
    setupModuleResolution,
    SUPPORTED_FILE_TYPES,
} from "radius-tracker";

import type { AnalysisResult } from "../../shared_types/analysisResult";
import type { WorkerInitPayload } from "../../shared_types/workerInitPayload";

const { InMemoryFileSystemHost, Project } = tsMorph;
const { TransactionalFileSystem, TsConfigResolver } = tsMorphCommon;

export interface TrackerEvent {
    Records: Array<{
        messageId: string,
        body: string,
    }>,
}

type MemfsVolume = ReturnType<(typeof Volume)["fromJSON"]>;

type NodeRef = {
    text: string,
    startLine: number,
    endLine: number,
    filepath: string,
    context?: string,
    url: string,
};

export type InjectedS3Client = S3Client;

const testFileRe = /\.(tests?|specs?|stories|story)\./; // TODO: accept as a parameter
const yarnDirRe = /\/\.yarn\//;
const jsRe = /\.jsx?$/;


export const createHandler = (
    s3Client: InjectedS3Client,
    env: {
        BUCKET_NAME: string,
    },
) => async (event: TrackerEvent) => {
    const body = event.Records[0]?.body;
    if (!body) {
        throw new Error("No data provided with event's body");
    }
    const { Message } = JSON.parse(body);
    const initData: WorkerInitPayload = JSON.parse(Message);
    const { owner, repo, cloneUrl, defaultBranch, repoId } = initData;
    const cloneFs = Volume.fromJSON({});
    await git.clone({
        fs: { promises: cloneFs.promises },
        http,
        dir: "/",
        url: cloneUrl,
        depth: 1,
        singleBranch: true,
        noTags: true,
        onProgress: progEvent => console.log(`Cloning ${ cloneUrl }: ${ progEvent.phase } ${ [progEvent.loaded, progEvent.total].filter(Boolean).join("/") }`),
    });

    console.log("GIT cloned");

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
    const config: tsMorph.ProjectOptions =
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
        .map(detectSnowflakes)
        .reduce((a, b) => [...a, ...b], []);

    const dependencies = resolveDependencies(project, setupModuleResolution(project, "/"));

    const findUsages = setupFindUsages(dependencies);
    const findUsageWarnings: FindUsageWarning[] = [];

    const snowflakeUsageData = snowflakes.map(snowflake => {

        const target = snowflake.identifier ?? snowflake.declaration;
        const { usages, warnings } = findUsages(target);
        findUsageWarnings.push(...warnings);

        return { target, usages: usages.filter(({ use }) => !testFileRe.test(use.getSourceFile().getFilePath())) };
    });

    function nodeRef(node: tsMorph.Node): NodeRef {
        const filepath = node.getSourceFile().getFilePath();
        const startLine = node.getStartLineNumber(true);
        const endLine = node.getEndLineNumber();
        return {
            filepath,
            text: node.print({ removeComments: true }),
            startLine, endLine,
            context: node.getParent()?.print({ removeComments: true }),
            url: `https://github.com/${ owner }/${ repo }/blob/${ defaultBranch }${ filepath }#L${ startLine }-L${ endLine }`,
        };
    }
    const response: AnalysisResult = {
        warnings: [...dependencies.warnings, ...findUsageWarnings].map(w => ({
            type: w.type,
            message: w.message,
        })),
        snowflakeUsages: snowflakeUsageData
            .sort((a, b) => b.usages.length - a.usages.length)
            .map(d => ({
                target: nodeRef(d.target),
                usages: d.usages.map(u => ({
                    use: nodeRef(u.use),
                    aliasPath: u.aliasPath,
                    trace: u.trace.map(t => ({
                        type: t.type,
                        node: nodeRef(getTraceNode(t)),
                    })),
                })),
            })),
    };

    await putS3Object(s3Client, env.BUCKET_NAME, response, repoId);
};

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

export async function putS3Object(s3Client: InjectedS3Client, bucketName: string, response: AnalysisResult, repoId: string) {
    // Set the parameters.
    const bucketParams = {
        Bucket: bucketName,
        // Specify the name of the new object.
        Key: `reports/${ repoId }`,
        // Content of the new object.
        Body: JSON.stringify(response),
    };

    // Create and upload the object to the S3 bucket.
    try {
        await s3Client.send(new PutObjectCommand(bucketParams));
        console.log(
            `S3 OBJECT Successfully uploaded: ${ bucketParams.Bucket }/${ bucketParams.Key }`,
        );
    } catch (err) {
        console.log("S3 OBJECT error on upload", err);
    }
}
