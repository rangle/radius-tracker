export type TrackerRequest = string; // Github repo url

export type NodeRef = {
    text: string,
    startLine: number,
    endLine: number,
    filepath: string,
    context?: string,
    url: string,
};

export type TrackerWarning = {
    type: string,
    message: string,
    node?: NodeRef,
};

export type TrackerUsageData = {
    target: NodeRef,
    usages: TrackerUsage[],
};
export type TrackerUsage = {
    use: NodeRef,
    trace: TrackerTrace[],
    aliasPath: string[],
};
export type TrackerTrace = {
    type: string,
    node: NodeRef,
};

export type TrackerResponse = {
    warnings: TrackerWarning[],
    snowflakeUsages: TrackerUsageData[],
};

type TrackerResponseSuccess = { type: "success", payload: TrackerResponse };
type TrackerResponseFailure = { type: "failure", error: string };
type TrackerResponseProgress = { type: "progress", message: string };
export type TrackerResponseMessage = TrackerResponseSuccess | TrackerResponseFailure | TrackerResponseProgress;
