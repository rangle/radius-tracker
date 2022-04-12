import { InMemoryFileSystemHost, Node, Project, ProjectOptions } from "ts-morph";
import { Buffer } from "buffer";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";
import { TransactionalFileSystem, TsConfigResolver } from "@ts-morph/common";
import { Volume } from "memfs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {
    detectSnowflakes,
    FindUsageWarning,
    getTraceNode,
    resolveDependencies,
    setupFindUsages,
    setupModuleResolution,
    SUPPORTED_FILE_TYPES,
} from "radius-tracker";

interface TrackerEvent {
    Records: Array<eventType>,
}

type eventType = {
    messageId: string,
    body: string,
};

type TrackerWarning = {
    type: string,
    message: string,
    node?: NodeRef,
};

type TrackerUsageData = {
    target: NodeRef,
    usages: TrackerUsage[],
};
type TrackerUsage = {
    use: NodeRef,
    trace: TrackerTrace[],
    aliasPath: string[],
};
type TrackerTrace = {
    type: string,
    node: NodeRef,
};

type TrackerResponse = {
    warnings: TrackerWarning[],
    snowflakeUsages: TrackerUsageData[],
};

type MemfsVolume = ReturnType<(typeof Volume)["fromJSON"]>;

type NodeRef = {
    text: string,
    startLine: number,
    endLine: number,
    filepath: string,
    context?: string,
    url: string,
};

const testFileRe = /\.(tests?|specs?|stories|story)\./; // TODO: accept as a parameter
const yarnDirRe = /\/\.yarn\//;
const jsRe = /\.jsx?$/;

// Create an Amazon S3 service client object.
const s3Client = new S3Client({ region: process.env.REGION });

exports.handler = async (event: TrackerEvent) => {
    let body = "";
    if (event.Records[0] !== undefined && event.Records[0].body !== undefined) {
        body = event.Records[0].body;
    } else {
        throw new Error("No data provided with event's body");
    }
    const { Message } = JSON.parse(body);
    const { owner, repo, data } = JSON.parse(Message);
    const cloneFs = Volume.fromJSON({});
    await git.clone({
        fs: { promises: cloneFs.promises },
        http,
        dir: "/",
        url: data.clone_url,
        depth: 1,
        singleBranch: true,
        noTags: true,
    });

    console.log("LAMBDA git cloned");

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
        .map(f => {
            return detectSnowflakes(f);
        })
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

    function nodeRef(node: Node): NodeRef {
        const filepath = node.getSourceFile().getFilePath();
        const startLine = node.getStartLineNumber(true);
        const endLine = node.getEndLineNumber();
        return {
            filepath,
            text: node.print({ removeComments: true }),
            startLine, endLine,
            context: node.getParent()?.print({ removeComments: true }),
            url: `https://github.com/${ owner }/${ repo }/blob/${ data.default_branch }${ filepath }#L${ startLine }-L${ endLine }`,
        };
    }
    const response = {
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

    console.log("LAMBDA response => ", response);
    await putS3Object(response, data.id);
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

const putS3Object = async (response: TrackerResponse, id: number) => {
    // Set the parameters.
    const bucketParams = {
        Bucket: process.env.BUCKET_NAME,
        // Specify the name of the new object.
        Key: `reports/${ id.toString() }`,
        // Content of the new object.
        Body: JSON.stringify(response),
    };

    console.log("LAMBDA bucketParams => ", bucketParams);

    // Create and upload the object to the S3 bucket.
    const run = async () => {
        try {
            const data = await s3Client.send(new PutObjectCommand(bucketParams));
            console.log(
                `Successfully uploaded object to S3: ${ bucketParams.Bucket }/${ bucketParams.Key }`,
            );
            console.log(
                `Object created with data: ${ data }`,
            );
        } catch (err) {
            console.log("Error on upload object to S3", err);
        }

    };
    await run();
};
