import React, { memo, useEffect, useState } from "react";
import axios from "axios";

import { stringifyError } from "../util/stringifyError";
import { TrackerRequest, TrackerResponse, TrackerResponseMessage } from "../tracker/payloads";
import { Results } from "./Results";
import api from "../api.json";

const unexpected = (val: never) => { throw new Error(`Unexpected value: ${ val }`); };
const analyze = async (githubUrl: string) => {
    const snowFlakes: TrackerResponse | {} = {};
    const {
        api_invoke_url,
    } = api;
    axios({
        method: "post",
        url: `${ api_invoke_url }/snowflakes`,
        data: githubUrl,
    }).then(response => {
        console.log("lambda response => ", response);
    })
        .catch(error => {
            console.log("lambda error => ", error);
        });


    return snowFlakes;
};

const initialLoadState = "loading";
const initialProgressMessage = "Loading";
function Analysis({ githubUrl }: { githubUrl: string }) {
    const [analysis, setAnalysis] = useState<TrackerResponse | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [analysisState, setAnalysisState] = useState<"loading" | "resolved" | "rejected">(initialLoadState);
    const [analysisProgress, setAnalysisProgress] = useState<string>(initialProgressMessage);

    useEffect(() => {
        analyze(githubUrl);

        setAnalysisState(initialLoadState);
        setAnalysisProgress(initialProgressMessage);
    }, [githubUrl]);

    switch (analysisState) {
        case "loading": return <>
            <div>{ analysisProgress }</div>
            <div>This might take a while.</div>
        </>;

        case "rejected": return <div>
            <p>Error analyzing { githubUrl }:</p>
            <pre>{ analysisError }</pre>
        </div>;

        case "resolved":
            if (!analysis) { throw new Error("Implementation error: analysis is not defined when state is resolved"); }
            return <Results data={ analysis } />;

        default: return unexpected(analysisState);
    }
}

export default memo(Analysis);
