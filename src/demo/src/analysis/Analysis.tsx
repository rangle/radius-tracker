import React, { memo, useEffect, useState } from "react";
import axios from "axios";

import { TrackerResponse } from "../tracker/payloads";
import { Results } from "./Results";
import api from "../api.json";

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
        return Promise.reject(error);
    });

    useEffect(() => {
        analyze();
    }, [githubUrl]);

    const analyze = async () => {
        setAnalysisState("loading");
        setAnalysisProgress(initialProgressMessage);
        const {
            api_invoke_url,
        } = api;
        axios({
            method: "post",
            url: `${ api_invoke_url }/snowflakes`,
            data: githubUrl,
        }).then(async response => {
            if (response.data.code === 200) {
                s3ObjectRetrive({
                    method: "get",
                    url: `${ response.data.payload }`,
                    data: githubUrl,
                }).then(res => {
                    setAnalysis(res.data);
                    setAnalysisState("resolved");
                }).catch(err => console.log("S3 bucket error => ", err));
            } else {
                setAnalysisError(response.data.payload);
                setAnalysisState("rejected");
            }

        })
            .catch(error => {
                setAnalysisState("rejected");
                setAnalysisError(error);
            });
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
