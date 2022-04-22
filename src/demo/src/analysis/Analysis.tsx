import React, { memo, useEffect, useState } from "react";
import axios from "axios";

import { TrackerResponse } from "../../../tracker/payloads";
import { Results } from "./Results";

const unexpected = (val: never) => { throw new Error(`Unexpected value: ${ val }`); };

const s3ObjectRetrive = axios.create();



const initialProgressMessage = "Loading...";
function Analysis({ githubUrl }: { githubUrl: string }) {
    const [analysis, setAnalysis] = useState<TrackerResponse | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [analysisState, setAnalysisState] = useState<"loading" | "resolved" | "rejected">("loading");
    const [analysisProgress, setAnalysisProgress] = useState<string>(initialProgressMessage);

    s3ObjectRetrive.interceptors.response.use(undefined, error => {
        const originalRequest = error.config;
        if (error.response.status === 403) {
            return s3ObjectRetrive(originalRequest);
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

    useEffect(() => {
        analyze();
    }, [githubUrl]);

    const analyze = async () => {
        setAnalysisState("loading");
        setAnalysisProgress(initialProgressMessage);

        try {
            const listenerResponse = await axios({
                method: "post",
                url: `${ process.env.REACT_APP_API_URL }/snowflakes`,
                data: githubUrl,
            });

            const result = await s3ObjectRetrive({
                method: "get",
                url: `${ listenerResponse.data.payload }`,
            });

            setAnalysis(result.data);
            setAnalysisState("resolved");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            setAnalysisError(error.response.data.payload);
            setAnalysisState("rejected");
        }

    };

    switch (analysisState) {
        case "loading": return <>
            <div>{ analysisProgress }</div>
            <div>This might take a while.</div>
        </>;

        case "rejected": return <div>
            <p>Error analyzing { githubUrl }:</p>
            <div>{ JSON.stringify(analysisError) }</div>
        </div>;

        case "resolved":
            if (!analysis) { throw new Error("Implementation error: analysis is not defined when state is resolved"); }
            return <Results data={ analysis } />;

        default: return unexpected(analysisState);
    }
}

export default memo(Analysis);
