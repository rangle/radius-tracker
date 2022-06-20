import React, { memo, useEffect, useState } from "react";
import axios from "axios";

import { AnalysisResult } from "../../../shared_types/analysisResult";
import { Results } from "./Results";
import { hasProp } from "../util/hasProp";

const unexpected = (val: never) => { throw new Error(`Unexpected value: ${ val }`); };

const s3ObjectRetrieve = axios.create();
s3ObjectRetrieve.interceptors.response.use(undefined, error => {
    const originalRequest = error.config;
    if (error.response.status === 403) {
        return s3ObjectRetrieve(originalRequest);
    }
    return Promise.reject({
        ...error, response: {
            ...error.response,
            data: {
                payload: "Error retrieving S3 object",
            },
        },
    });
});

const warningsProp: keyof AnalysisResult = "warnings";
const hasWarningsProp = hasProp(warningsProp);

const usagesProp: keyof AnalysisResult = "homebrewUsages";
const hasUsagesProp = hasProp(usagesProp);

const isAnalysisResult = (data: unknown): data is AnalysisResult => // TODO: should be autogenerated based on type
    hasWarningsProp(data) && Array.isArray(data.warnings)
    && hasUsagesProp(data) && Array.isArray(data.homebrewUsages);

const analyze = async (url: string) => {
    const listenerResponse = await axios({
        method: "post",
        url: `${ process.env.REACT_APP_API_URL }/homebrew`,
        data: url,
    });

    const result = await s3ObjectRetrieve({
        method: "get",
        url: `${ listenerResponse.data.payload }`,
    });

    const data: unknown = result.data;
    if (!isAnalysisResult(data)) { throw new Error("Analysis result format doesn't match expected schema"); }

    return data;
};

const initialProgressMessage = "Loading...";
function Analysis({ githubUrl }: { githubUrl: string }) {
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [analysisState, setAnalysisState] = useState<"loading" | "resolved" | "rejected">("loading");
    const [analysisProgress, setAnalysisProgress] = useState<string>(initialProgressMessage);

    useEffect(() => {
        setAnalysisState("loading");
        setAnalysisProgress(initialProgressMessage);

        analyze(githubUrl).then(
            data => {
                setAnalysis(data);
                setAnalysisState("resolved");
            },
            (error: unknown) => {
                const message = axios.isAxiosError(error) ? error.response?.data.payload
                    : error instanceof Error ? error.message
                        : undefined;

                setAnalysisError(message ?? "Failed to analyze " + githubUrl);
                setAnalysisState("rejected");
            },
        );
    }, [githubUrl]);

    switch (analysisState) {
        case "loading": return <>
            <div>{ analysisProgress }</div>
            <div>This might take a while.</div>
        </>;

        case "rejected": return <div>
            <p>Error analyzing { githubUrl }:</p>
            <div>{ analysisError }</div>
        </div>;

        case "resolved":
            if (!analysis) { throw new Error("Implementation error: analysis is not defined when state is resolved"); }
            return <Results data={ analysis } />;

        default: return unexpected(analysisState);
    }
}

export default memo(Analysis);