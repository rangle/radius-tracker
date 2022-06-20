export type NodeRef = {
    text: string,
    startLine: number,
    endLine: number,
    filepath: string,
    context?: string,
    url: string,
};

export type AnalysisWarning = {
    type: string,
    message: string,
    node?: NodeRef,
};

export type AnalysisUsageData = {
    target: NodeRef,
    usages: AnalysisUsage[],
};
export type AnalysisUsage = {
    use: NodeRef,
    trace: AnalysisTrace[],
    aliasPath: string[],
};
export type AnalysisTrace = {
    type: string,
    node: NodeRef,
};

export type AnalysisResult = {
    warnings: AnalysisWarning[],
    homebrewUsages: AnalysisUsageData[],
};

