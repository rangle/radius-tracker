import { parentPort as parentPortImport, threadId } from "worker_threads";
import { rmSync, writeFileSync } from "fs";

import { collectStats } from "../collectStats";
import {
    PostMessageOf,
    WorkerFailureResponse,
    WorkerPayload,
    WorkerSuccessResponse,
} from "./workerTypes";
import { performance } from "perf_hooks";
import { join } from "path";
import { statSync } from "fs";
import { cacheDirPath, cacheFileName, threadSpaceDirPath } from "../util/cache";
import { checkout, cloneToThreadSpace, getProjectPath } from "./git";

const parentPort = parentPortImport;
if (!parentPort) { throw new Error("Parent port not available, code not running as a worker"); }

const hydrateFunction = (fn: string) => new Function(`"use strict"; return (${ fn })`)();
parentPort.on("message", configParam => {
    const { commit, config: rawConfig, cacheDir }: PostMessageOf<WorkerPayload> = configParam;

    const config: WorkerPayload["config"] = {
        ...rawConfig,
        isTargetImport: hydrateFunction(rawConfig.isTargetImport),
        isValidUsage: hydrateFunction(rawConfig.isValidUsage),
    };

    let prev: number | null = null;
    const tag = () => {
        const ts = performance.now();
        const tg = `[Thread ${ threadId } - ${ Math.floor(prev ? (ts - prev) / 1000 : 0) }s]`;
        prev = ts;
        return tg;
    };

    (async () => {
        const commitCache = join(cacheDirPath(cacheDir), `commit_${ cacheFileName(config) }_${ commit }.json`);
        if (statSync(commitCache, { throwIfNoEntry: false })?.isFile()) {
            console.log(`${ tag() } Using cached stats for commit ${ commit }`);
            const cachedStats = require(commitCache); // eslint-disable-line @typescript-eslint/no-var-requires

            const success: WorkerSuccessResponse = { status: "result", result: cachedStats };
            return parentPort.postMessage(success);
        }

        const threadSpacePath = threadSpaceDirPath(cacheDir);

        console.log(`${ tag() } Collecting stats for commit ${ commit }`);
        rmSync(threadSpacePath, { force: true, recursive: true });

        console.log(`${ tag() } Cloning from ${ getProjectPath(cacheDir, config) }`);
        await cloneToThreadSpace(cacheDir, config);

        console.log(`${ tag() } Checking out commit ${ commit }`);
        await checkout(threadSpacePath, commit);

        const stats = await collectStats(config, tag, threadSpacePath);
        writeFileSync(commitCache, JSON.stringify(stats), "utf8");

        const success: WorkerSuccessResponse = { status: "result", result: stats };
        parentPort.postMessage(success);
    })().catch(err => {
        const failure: WorkerFailureResponse = { status: "error", error: err };
        parentPort.postMessage(failure);
    });
});
