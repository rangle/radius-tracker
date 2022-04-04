"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const ts_morph_1 = require("ts-morph");
const rest_1 = require("@octokit/rest");
const buffer_1 = require("buffer");
const isomorphic_git_1 = tslib_1.__importDefault(require("isomorphic-git"));
const node_1 = tslib_1.__importDefault(require("isomorphic-git/http/node"));
const common_1 = require("@ts-morph/common");
const memfs_1 = require("memfs");
const radius_tracker_1 = require("radius-tracker");
global.Buffer = buffer_1.Buffer; // TODO: provide via webpack globals
const testFileRe = /\.(tests?|specs?|stories|story)\./; // TODO: accept as a parameter
const yarnDirRe = /\/\.yarn\//;
const jsRe = /\.jsx?$/;
const octokit = new rest_1.Octokit();
exports.handler = (event) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const githubUrl = event.body;
    const url = new URL(githubUrl);
    if (url.hostname !== "github.com") {
        return responseEvent({
            statusCode: 400, message: "github.com url expected",
        });
    }
    const [, owner, repo] = url.pathname.split("/");
    if (!owner || !repo) {
        return responseEvent({
            statusCode: 400, message: "Url does not point to a github repo",
        });
    }
    const repoInfo = yield octokit.repos.get({ owner, repo });
    const cloneFs = memfs_1.Volume.fromJSON({});
    yield isomorphic_git_1.default.clone({
        fs: { promises: cloneFs.promises },
        http: node_1.default,
        dir: "/",
        url: repoInfo.data.clone_url,
        depth: 1,
        singleBranch: true,
        noTags: true,
    });
    const tsconfigPath = "/tsconfig.json";
    const jsconfigPath = "/jsconfig.json";
    const allFiles = findF(cloneFs, "/");
    const getTsconfigCompilerOptions = () => {
        // TSConfig is a .json file, but it's not a json — e.g. it allows comments and `extends` references.
        const memoFsHost = new ts_morph_1.InMemoryFileSystemHost();
        allFiles.filter(f => f.endsWith(".json")).map(f => memoFsHost.writeFileSync(f, readFile(cloneFs, f)));
        const tsconfigResolutionFs = new common_1.TransactionalFileSystem(memoFsHost);
        return new common_1.TsConfigResolver(tsconfigResolutionFs, tsconfigResolutionFs.getStandardizedAbsolutePath(tsconfigPath), "utf8")
            .getCompilerOptions();
    };
    const isTsProject = isFile(cloneFs, tsconfigPath);
    const config = isTsProject ? { compilerOptions: getTsconfigCompilerOptions() }
        : isFile(cloneFs, jsconfigPath) ? { compilerOptions: Object.assign(Object.assign({}, (_a = JSON.parse(readFile(cloneFs, jsconfigPath)).compilerOptions) !== null && _a !== void 0 ? _a : {}), { allowJs: true }) }
            : { compilerOptions: { allowJs: true } };
    const project = new ts_morph_1.Project(Object.assign(Object.assign({}, config), { useInMemoryFileSystem: true }));
    const allowJs = isTsProject ? (_b = project.getCompilerOptions().allowJs) !== null && _b !== void 0 ? _b : false : true;
    allFiles
        .filter(f => radius_tracker_1.SUPPORTED_FILE_TYPES.some(ext => f.endsWith(ext)))
        .filter(f => allowJs || !jsRe.test(f))
        .filter(f => !yarnDirRe.test(f))
        .map(f => project.createSourceFile(f, readFile(cloneFs, f)));
    const relevantSourceFiles = project.getSourceFiles().filter(f => !testFileRe.test(f.getFilePath()));
    const snowflakes = relevantSourceFiles
        .map(f => {
        return (0, radius_tracker_1.detectSnowflakes)(f);
    })
        .reduce((a, b) => [...a, ...b], []);
    const dependencies = (0, radius_tracker_1.resolveDependencies)(project, (0, radius_tracker_1.setupModuleResolution)(project, "/"));
    const findUsages = (0, radius_tracker_1.setupFindUsages)(dependencies);
    const findUsageWarnings = [];
    const snowflakeUsageData = snowflakes.map(snowflake => {
        var _a;
        const target = (_a = snowflake.identifier) !== null && _a !== void 0 ? _a : snowflake.declaration;
        const { usages, warnings } = findUsages(target);
        findUsageWarnings.push(...warnings);
        return { target, usages: usages.filter(({ use }) => !testFileRe.test(use.getSourceFile().getFilePath())) };
    });
    function nodeRef(node) {
        var _a;
        const filepath = node.getSourceFile().getFilePath();
        const startLine = node.getStartLineNumber(true);
        const endLine = node.getEndLineNumber();
        return {
            filepath,
            text: node.print({ removeComments: true }),
            startLine, endLine,
            context: (_a = node.getParent()) === null || _a === void 0 ? void 0 : _a.print({ removeComments: true }),
            url: `https://github.com/${owner}/${repo}/blob/${repoInfo.data.default_branch}${filepath}#L${startLine}-L${endLine}`,
        };
    }
    const response = {
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
                    node: nodeRef((0, radius_tracker_1.getTraceNode)(t)),
                })),
            })),
        })),
    };
    return responseEvent({
        statusCode: 200, payload: response,
    });
});
function isFile(fs, path) {
    var _a, _b;
    return (_b = (_a = fs.statSync(path, { throwIfNoEntry: false })) === null || _a === void 0 ? void 0 : _a.isFile()) !== null && _b !== void 0 ? _b : false;
}
function readFile(fs, path) {
    const data = fs.readFileSync(path);
    return buffer_1.Buffer.from(data).toString("utf8");
}
const join = (base, path) => base === "/" ? `/${path}` : `${base}/${path}`;
function findF(fs, path) {
    const files = [];
    const dir = fs.readdirSync(path);
    for (const p of dir) {
        if (typeof p !== "string") {
            throw new Error("String expected");
        }
        const filepath = join(path, p);
        const stat = fs.statSync(filepath);
        if (stat.isFile()) {
            files.push(filepath);
        }
        if (stat.isDirectory()) {
            files.push(...findF(fs, filepath));
        }
    }
    return files;
}
function responseEvent(response) {
    const headers = {
        "Content-Type": "application/json",
    };
    switch (response.statusCode) {
        case 200:
            console.log("200");
            return {
                statusCode: response.statusCode,
                headers,
                body: JSON.stringify(response.payload),
            };
        case 400:
            console.log("400");
            return {
                statusCode: response.statusCode,
                headers,
                body: JSON.stringify(response.message),
            };
        default:
            console.log("500");
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify("Something went wrong, please try again."),
            };
    }
}
