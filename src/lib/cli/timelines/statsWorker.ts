import { parentPort as parentPortImport, threadId } from "worker_threads";
import { rmSync, statSync, writeFileSync } from "fs";

import { collectStats } from "../collectStats";
import {
    PostMessageOf,
    WorkerFailureResponse,
    WorkerPayload,
    WorkerSuccessResponse,
} from "./workerTypes";
import { performance } from "perf_hooks";
import { join } from "path";
import { cacheDirPath, cacheFileName, threadSpaceDirPath } from "../util/cache";
import { getGit, getProjectPath } from "./git";
import { Project } from "ts-morph";

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
    const tag = (keepTimestamp = false) => {
        const ts = performance.now();
        const tg = `[Thread ${ threadId } - ${ config.displayName } - ${ Math.floor(prev ? (ts - prev) / 1000 : 0) }s]`;
        if (!keepTimestamp) { prev = ts; }
        return tg;
    };

    let heartbeatInterval: NodeJS.Timer;
    (async () => {
        const sourceRepo = getGit(getProjectPath(cacheDir, config));

        const commitCache = join(cacheDirPath(cacheDir), `commit_${ cacheFileName(config) }_${ commit }.json`);
        if (statSync(commitCache, { throwIfNoEntry: false })?.isFile()) {
            console.log(`${ tag() } Using cached stats for commit ${ commit }`);
            const cachedStats = require(commitCache); // eslint-disable-line @typescript-eslint/no-var-requires

            if (!cachedStats || !Array.isArray(cachedStats.stats) || !Array.isArray(cachedStats.warnings)) {
                throw new Error("Unexpected cache format: " + JSON.stringify(cachedStats));
            }
            const success: WorkerSuccessResponse = {
                status: "result",
                result: cachedStats.stats,
                warnings: cachedStats.warnings,
            };
            return parentPort.postMessage(success);
        }

        const threadSpacePath = threadSpaceDirPath(cacheDir);

        console.log(`${ tag() } Collecting stats for commit ${ commit }`);
        rmSync(threadSpacePath, { force: true, recursive: true, maxRetries: 10 });

        console.log(`${ tag() } Cloning from ${ getProjectPath(cacheDir, config) }`);
        const threadspaceRepo = await sourceRepo.cloneNoCheckout(threadSpacePath);

        console.log(`${ tag() } Checking out commit ${ commit }`);
        await threadspaceRepo.checkout(commit);

        heartbeatInterval = setInterval(() => console.log(`${ tag(true) } still running`), 60000);
        const stats = await collectStats(
            new Project().getFileSystem(), // Provide the disk filesystem
            config,
            (message: string) => console.log(`${ tag() } ${ message }`),
            threadSpacePath,
        );
        clearInterval(heartbeatInterval);

        writeFileSync(commitCache, JSON.stringify(stats), "utf8");
        const success: WorkerSuccessResponse = {
            status: "result",
            result: stats.stats,
            warnings: stats.warnings,
        };
        parentPort.postMessage(success);
    })().catch(err => {
        clearInterval(heartbeatInterval);
        const failure: WorkerFailureResponse = { status: "error", error: err };
        parentPort.postMessage(failure);
    });
});
