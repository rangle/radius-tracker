import {
    CommitData,
    JsonOf,
    PostMessageOf,
    ResolvedWorkerConfig,
    Stats,
    WorkerPayload,
    WorkerResponse,
} from "./workerTypes";
import { GitAPI } from "./git";
import { cacheFileName } from "../util/cache";
import { setupWorkerPool } from "./workerPool";
import { unexpected } from "../../guards";
import { UsageStat } from "../sharedTypes";
import { dateWeeksAgo, midnightToday } from "./dates";
import { isSubprojectPathEmptyWarning, Warning } from "../collectStats";

export const getTimelineForOneRepo = async (
    cacheDir: string,
    config: ResolvedWorkerConfig,
    workerPool: ReturnType<typeof setupWorkerPool>["pool"],
    git: GitAPI,
): Promise<Stats> => {
    console.log(`Fetching ${ config.repoUrl }`);
    await git.cloneOrUpdate(config.repoUrl, config.since);

    const timeline = await getCommitsTimeline(config.since, git.listCommits);
    console.log(`Processing the timeline of ${ timeline.length } commits`);
    console.log(`Cache id ${ cacheFileName(config) }`);

    const uniqueCommits = timeline.map(({ oid }) => oid).reduce((uniq, commit) => {
        if (uniq.length === 0) { return [commit]; }
        if (uniq[0] === commit) { return uniq; }
        return [commit, ...uniq];
    }, [] as string[]);

    const commitStats: { commit: string, stats: UsageStat[], warnings: Warning[] }[] = await Promise.all(uniqueCommits.reverse().map(async commit => {
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
        if (resp.status === "result") { return { commit, stats: resp.result, warnings: resp.warnings }; }
        return unexpected(resp);
    }));

    const statsByCommit = new Map<string, { stats: UsageStat[], warnings: Warning[] }>();
    commitStats.forEach(({ commit, stats, warnings }) => statsByCommit.set(commit, { stats, warnings }));

    if (commitStats.every(stat => stat.warnings.some(isSubprojectPathEmptyWarning))) {
        // In every commit there is a warning about a missing subproject path —
        // that path is missing through entire checked history, and is certainly a configuration mistake.
        throw new Error(`Subproject path '${ config.subprojectPath }' missing in all analyzed commits`);
    }

    return timeline.map(commitData => {
        const stats = statsByCommit.get(commitData.oid);
        if (!stats) { throw new Error(`No stats found for commit ${ commitData.oid }`); }

        return {
            commit: commitData,
            ...stats,
        };
    });
};

async function getCommitsTimeline(since: Date, listCommits: GitAPI["listCommits"]): Promise<CommitData[]> {
    const commitData = await listCommits();

    const first = commitData.shift();
    if (!first) { throw new Error("No commits"); }

    const targetCommits: CommitData[] = [{ ...first, weeksAgo: 0, expectedDate: midnightToday() }];
    while (commitData.length) {
        const expectedDate = dateWeeksAgo(targetCommits.length);
        if (expectedDate < since) { break; }

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
