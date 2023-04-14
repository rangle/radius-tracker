import { ResolvedWorkerConfig, WorkerConfig } from "./workerTypes";
import { setupWorkerPool } from "./workerPool";
import { getTimelineForOneRepo } from "./getTimelineForOneRepo";
import { processStats, ProjectMetadata, statsMessage } from "../processStats";
import { mkdirSync, writeFileSync } from "fs";
import { isAbsolute, join, resolve } from "path";
import { defineYargsModule } from "../util/defineYargsModule";
import { gitExists } from "./git";
import { hasProp, isDate, isNumber, isString, StringKeys } from "../../guards";
import { defaultSubprojectPath, resolveStatsConfig } from "../resolveStatsConfig";
import { concurrentQueue } from "./concurrentQueue";
import { dateWeeksAgo } from "./dates";


const repoUrlKey: StringKeys<WorkerConfig> = "repoUrl";
const hasRepoUrl = hasProp(repoUrlKey);

const displayNameKey: StringKeys<WorkerConfig> = "displayName";
const hasDisplayName = hasProp(displayNameKey);

const maxWeeksKey: StringKeys<WorkerConfig> = "maxWeeks";
const hasMaxWeeks = hasProp(maxWeeksKey);

const sinceKey: StringKeys<WorkerConfig> = "since";
const hasSince = hasProp(sinceKey);

const resolveConfig = (config: unknown): ResolvedWorkerConfig => {
    const statsConfig = resolveStatsConfig(config);

    if (!hasRepoUrl(config)) { throw new Error(`Config has no repo url: ${ JSON.stringify(config) }`); }
    const repoUrl = config.repoUrl;
    if (!repoUrl || !isString(repoUrl)) { throw new Error(`Expected a string repo URL, got: ${ repoUrl }`); }

    if (!hasRepoUrl(config)) { throw new Error(`Config has no repo url: ${ JSON.stringify(config) }`); }
    const defaultDisplayName = statsConfig.subprojectPath === defaultSubprojectPath ? config.repoUrl : `${ config.repoUrl } at ${ statsConfig.subprojectPath }`;
    const displayName = (hasDisplayName(config) ? config.displayName : defaultDisplayName) ?? defaultDisplayName;
    if (!displayName || !isString(displayName)) { throw new Error(`Expected a string project display name if given, got: ${ displayName }`); }


    let since: Date | null = null;
    if (hasMaxWeeks(config) && hasSince(config)) { throw new Error(`Config specifies both 'since' and 'maxWeeks' keys: ${ JSON.stringify(config) }`); }
    if (hasMaxWeeks(config)) {
        const maxWeeks = config.maxWeeks;
        if (!maxWeeks || !isNumber(maxWeeks)) { throw new Error(`Expected 'maxWeeks' to be a number, got: ${ maxWeeks }`); }
        if (maxWeeks < 1) { throw new Error(`Expected 'maxWeeks' to be a positive number, got: ${ maxWeeks }`); }
        since = dateWeeksAgo(maxWeeks); // Backwards compatible conversion from `maxWeeks` to explicit `since`
    }

    if (hasSince(config)) {
        const configSince = config.since;
        if (!configSince || !isDate(configSince)) { throw new Error(`Expected 'since' to be a Date, got: ${ configSince }`); }
        if (configSince > new Date()) { throw new Error(`Expected 'since' to be in the past, got: ${ configSince }`); }
        since = configSince;
    }

    if (!since) { throw new Error(`Config must specify either 'maxWeeks' or 'since' keys: ${ JSON.stringify(config) }`); }

    return {
        repoUrl,
        displayName,
        since,
        ...statsConfig,
    };
};

const hasDefault = hasProp("default");
export default defineYargsModule(
    "timelines <config>",
    "Collect timelines of stats from set of projects",
    args => args
        .positional("config", {
            type: "string",
            normalize: true,
            demandOption: true,
        })
        .options("cacheDir", {
            type: "string",
            normalize: true,
        })
        .options("outfile", {
            type: "string",
            normalize: true,
        }),
    async args => {
        if (!gitExists()) { throw new Error("Git seems to not be runnable. Make sure `git` is available on your system."); }

        // Make sure cache dir exists and is a directory
        const cacheDir = resolve(args.cacheDir ?? join(process.cwd(), "radius-tracker-cache"));
        mkdirSync(join(cacheDir, "cache"), { recursive: true });

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const configFile = require(isAbsolute(args.config) ? args.config : join(process.cwd(), args.config)); // Load the config

        const configs = hasDefault(configFile) ? configFile.default : configFile;
        if (!Array.isArray(configs)) { throw new Error(`Expected an array of configs, got: ${ JSON.stringify(configs) }`); }

        await collectAllStats(cacheDir, args.outfile || join(process.cwd(), "usages.sqlite"), configs.map(resolveConfig));
    },
);

async function collectAllStats(cacheDir: string, outfile: string, configs: ReadonlyArray<ResolvedWorkerConfig>) {
    const { pool, size: poolSize } = setupWorkerPool();

    try {
        const concurrencyLimit = 2 * poolSize; // Proportional to pool size, but oversized on purpose to avoid waiting on network
        const stats = await concurrentQueue(concurrencyLimit, configs, config => getTimelineForOneRepo(cacheDir, config, pool));

        const statsDB = await processStats(stats.map((stat, idx) => {
            const config = configs[idx];
            if (!config) { throw new Error(`Could not find a config at idx '${ idx }'`); }

            const project: ProjectMetadata = {
                name: config.displayName,
                url: config.repoUrl,
                subprojectPath: config.subprojectPath,
            };
            return { project, config, stats: stat };
        }));
        writeFileSync(outfile, Buffer.from(statsDB.export()));
        console.log(statsMessage(outfile));
    } finally {
        await pool.destroy();
    }
}
