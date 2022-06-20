import {
    CommitData,
    PostMessageOf,
    Stats,
    ResolvedWorkerConfig,
    WorkerPayload,
    WorkerResponse,
    JsonOf,
} from "./workerTypes";
import { cloneOrUpdate, gitlog } from "./git";
import { cacheFileName } from "../util/cache";
import { setupWorkerPool } from "./workerPool";
import { unexpected } from "../../guards";
import { UsageStat } from "../sharedTypes";

export const getTimelineForOneRepo = async (cacheDir: string, config: ResolvedWorkerConfig, workerPool: ReturnType<typeof setupWorkerPool>): Promise<Stats> => {
    const cloneSince = new Date();
    cloneSince.setDate(cloneSince.getDate() - (config.maxWeeks + 1) * 7);

    console.log(`Fetching ${ config.repoUrl }`);
    await cloneOrUpdate(cacheDir, config, config.repoUrl, cloneSince);

    const timeline = await getCommitsTimeline(cacheDir, config);
    console.log(`Processing the timeline of ${ timeline.length } commits`);
    console.log(`Cache id ${ cacheFileName(config) }`);

    const uniqueCommits = timeline.map(({ oid }) => oid).reduce((uniq, commit) => {
        if (uniq.length === 0) { return [commit]; }
        if (uniq[0] === commit) { return uniq; }
        return [commit, ...uniq];
    }, [] as string[]);

    const commitStats: { commit: string, stats: UsageStat[] }[] = await Promise.all(uniqueCommits.reverse().map(async commit => {
        const payload: PostMessageOf<WorkerPayload> = {
            commit,
            cacheDir,
            config: {
                ...config,
                isTargetImport: config.isTargetImport.toString(),
                isValidUsage: config.isValidUsage.toString(),
            },
        };

        const resp: PostMessageOf<WorkerResponse> | PostMessageOf<JsonOf<WorkerResponse>> = await workerPool.exec(payload);
        if (resp.status === "error") { throw resp.error; }
        if (resp.status === "result") { return { commit, stats: resp.result }; }
        return unexpected(resp);
    }));

    const statsByCommit = new Map<string, UsageStat[]>();
    commitStats.forEach(({ commit, stats }) => statsByCommit.set(commit, stats));

    return timeline.map(commitData => {
        const stats = statsByCommit.get(commitData.oid);
        if (!stats) { throw new Error(`No stats found for commit ${ commitData.oid }`); }

        return {
            commit: commitData,
            stats,
        };
    });
};

async function getCommitsTimeline(cacheDir: string, config: ResolvedWorkerConfig): Promise<CommitData[]> {
    const commitData = await gitlog(cacheDir, config);

    const first = commitData.shift();
    if (!first) { throw new Error("No commits"); }

    const midnightToday = new Date(new Date().toISOString().split("T")[0] + "T00:00:00.000Z"); // Today at 00:00
    const targetCommits: CommitData[] = [{ ...first, weeksAgo: 0, expectedDate: midnightToday }];
    while (targetCommits.length < config.maxWeeks && commitData.length) {
        const expectedDate = new Date(midnightToday);
        // Set to preceding Saturday N weeks ago — aligns all commits on a weekly grid
        expectedDate.setDate(expectedDate.getDate() - 7 * targetCommits.length - (expectedDate.getDay() + 1) % 7);

        const prev = targetCommits[targetCommits.length - 1];
        if (!prev) { throw new Error("Implementation error"); }

        if (prev.ts.getTime() < expectedDate.getTime()) {
            targetCommits.push({ ...prev, weeksAgo: targetCommits.length, expectedDate });
            continue;
        }

        const c = commitData.shift();
        if (!c) { throw new Error("Implementation error"); }

        if (c.ts.getTime() < expectedDate.getTime()) {
            targetCommits.push({ ...c, weeksAgo: targetCommits.length, expectedDate });
        }
    }

    return targetCommits;
}
