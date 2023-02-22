import { ResolvedWorkerConfig, WorkerConfig } from "./workerTypes";
import { setupWorkerPool } from "./workerPool";
import { getTimelineForOneRepo } from "./getTimelineForOneRepo";
import { processStats, statsMessage } from "../processStats";
import { mkdirSync, writeFileSync } from "fs";
import { isAbsolute, join, resolve } from "path";
import { defineYargsModule } from "../util/defineYargsModule";
import { gitExists } from "./git";
import { hasProp, isNumber, isString, StringKeys } from "../../guards";
import { repoName } from "../util/cache";
import { resolveStatsConfig } from "../resolveStatsConfig";
import { concurrentQueue } from "./concurrentQueue";


const repoUrlKey: StringKeys<WorkerConfig> = "repoUrl";
const hasRepoUrl = hasProp(repoUrlKey);

const maxWeeksKey: StringKeys<WorkerConfig> = "maxWeeks";
const hasMaxWeeks = hasProp(maxWeeksKey);

const resolveConfig = (config: unknown): ResolvedWorkerConfig => {
    if (!hasRepoUrl(config)) { throw new Error(`Config has no repo url: ${ JSON.stringify(config) }`); }
    const repoUrl = config.repoUrl;
    if (!repoUrl || !isString(repoUrl)) { throw new Error(`Expected a string repo URL, got: ${ repoUrl }`); }

    if (!hasMaxWeeks(config)) { throw new Error(`Config does not specify max weeks to process: ${ JSON.stringify(config) }`); }
    const maxWeeks = config.maxWeeks;
    if (!maxWeeks || !isNumber(maxWeeks)) { throw new Error(`Expected max weeks to be a number, got: ${ maxWeeks }`); }

    return {
        repoUrl,
        maxWeeks,
        ...resolveStatsConfig(config),
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
            if (!config) {
                throw new Error(`Could not find a config at idx '${ idx }'`);
            }

            const repo = repoName(config.repoUrl);
            const projectName = config.subprojectPath !== "/" ? `${ repo } at ${ config.subprojectPath }` : repo;
            return { projectName, config, stats: stat };
        }));
        writeFileSync(outfile, Buffer.from(statsDB.export()));
        console.log(statsMessage(outfile));
    } finally {
        await pool.destroy();
    }
}
