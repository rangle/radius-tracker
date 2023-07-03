import { Primitive } from "ts-toolbelt/out/Misc/Primitive";
import { StatsConfig, UsageStat } from "../sharedTypes";
import { Merge } from "ts-toolbelt/out/Union/Merge";
import { Warning } from "../collectStats";

const maxWeeksKey = "maxWeeks";
type DurationConfig = { [maxWeeksKey]: number } | { since: Date };
export type WorkerConfig = StatsConfig & DurationConfig & {
    repoUrl: string,
    displayName?: string,
};
export type ResolvedWorkerConfig = Omit<Required<Merge<WorkerConfig>>, typeof maxWeeksKey>;

export type WorkerSuccessResponse = { status: "result", result: UsageStat[], warnings: Warning[] };
export type WorkerFailureResponse = { status: "error", error: unknown };
export type WorkerResponse = WorkerSuccessResponse | WorkerFailureResponse;
export type WorkerPayload = { config: ResolvedWorkerConfig, commit: string, cacheDir: string };


type Fn = (...args: any[]) => unknown; // eslint-disable-line @typescript-eslint/no-explicit-any

type PostMessagePreservedTypes = RegExp | Date | Blob | ArrayBuffer | NodeJS.TypedArray | Map<unknown, unknown> | Set<unknown>;

type SerializeForPostMessage<T> = T extends Fn ? string
    : never;

export type PostMessageOf<T> = T extends Exclude<Primitive, symbol> ? T
    : T extends symbol ? never
    : T extends PostMessagePreservedTypes ? T
    : [SerializeForPostMessage<T>] extends [never] ? (
        T extends ArrayLike<infer I> ? PostMessageOf<I>[]
        : { [P in keyof T]: PostMessageOf<T[P]> }
    )
    : SerializeForPostMessage<T>;

export type JsonOf<T> = T extends Exclude<Primitive, symbol | undefined> ? T
    : T extends symbol | undefined ? never
    : T extends Fn ? never
    : T extends Date ? string
    : T extends ArrayLike<infer I> ? JsonOf<I>[]
    : { [P in keyof T]: JsonOf<T[P]> };

export type CommitData = { oid: string, ts: Date, weeksAgo: number, expectedDate: Date };
export type Stats = { commit: CommitData, stats: UsageStat[], warnings: Warning[] }[];
