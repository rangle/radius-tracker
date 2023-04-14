import { createHash } from "crypto";
import { ResolvedStatsConfig } from "../sharedTypes";
import { ResolvedWorkerConfig } from "../timelines/workerTypes";
import { objectKeys, StringKeys } from "../../guards";
import { join } from "path";
import { threadId } from "worker_threads";
import { statSync } from "fs";
import { cacheVersion } from "./cacheVersion";

const md5 = (str: string): string => createHash("md5").update(str).digest("hex");
const sanitize = (val: string) => val.toLowerCase().replace(/[^a-z0-9]/ig, "_");

type CacheConfig = ResolvedStatsConfig & Pick<ResolvedWorkerConfig, "repoUrl">;
const cacheConfigKeys: { [P in StringKeys<CacheConfig>]-?: null } = {
    repoUrl: null,
    isIgnoredFile: null,
    isTargetModuleOrPath: null,
    isTargetImport: null,
    isValidUsage: null,
    subprojectPath: null,
    tsconfigPath: null,
    jsconfigPath: null,
};

export const cacheFileName = (config: CacheConfig) => {
    const configHash = md5(JSON.stringify(
        objectKeys(config).filter(k => k in cacheConfigKeys).reduce((_obj, k) => {
            (_obj[k] as unknown) = config[k];
            return _obj;
        }, {} as CacheConfig),
        (_k, v) =>
            v instanceof RegExp ? `REGEXP:${ v.toString() }`
                : typeof v === "function" ? `FUNC:${ v.toString() }`
                    : v,
    ));

    return sanitize(`${ config.repoUrl }_v${ cacheVersion }_${ configHash }`);
};

let checkedBase: string | null = null;
const withExistenceCheck = (cb: (base: string) => string) => (base: string) => {
    if (checkedBase === base) { return cb(base); }

    statSync(base, { throwIfNoEntry: true }); // Make sure the base exists before using it to construct path
    checkedBase = base;

    return cb(base);
};

export const cacheDirPath = withExistenceCheck((base: string) => join(base, "cache"));
export const threadSpaceDirPath = withExistenceCheck((base: string) => join(base, "threadspace", `thread_${ threadId }`));
export const repoDirPath = withExistenceCheck((base: string) => join(base, "repos"));
