import React, { memo, useEffect, useState } from "react";
import createWorker from "worker-loader!../tracker/worker";
import { TrackerRequest, TrackerResponse, TrackerResponseMessage } from "../tracker/payloads";
import { stringifyError } from "../util/stringifyError";
import { Results } from "./Results";

const unexpected = (val: never) => { throw new Error(`Unexpected value: ${ val }`); };
const analyze = (githubUrl: string) => {
    let terminated = false;
    const trackerWorker = createWorker();

    type Subscriber = (message: string) => void;
    const progressSubscribers: Subscriber[] = [];

    const analysisRequest = new Promise<TrackerResponse>((res, rej) => {
        const onError = (err: unknown) => {
            if (terminated) { return; }
            rej(stringifyError(err));
        };

        trackerWorker.onerror = onError;
        trackerWorker.onmessageerror = onError;
        trackerWorker.onmessage = message => {
            if (terminated) { return; }

            const data: TrackerResponseMessage = message.data;
            switch (data.type) {
                case "success": return res(data.payload);
                case "failure": return rej(data.error);
                case "progress": return progressSubscribers.forEach(s => s(data.message));
                default: return unexpected(data);
            }
        };

        const request: TrackerRequest = githubUrl;
        trackerWorker.postMessage(request);
    });

    return {
        analysisRequest,
        subscribeToProgress: (subscriber: Subscriber) => progressSubscribers.push(subscriber),
        terminate: () => {
            terminated = true;
            trackerWorker.terminate();
        },
    };
};

const initialLoadState = "loading";
const initialProgressMessage = "Loading";
function Analysis({ githubUrl }: { githubUrl: string }) {
    const [analysis, setAnalysis] = useState<TrackerResponse | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [analysisState, setAnalysisState] = useState<"loading" | "resolved" | "rejected">(initialLoadState);
    const [analysisProgress, setAnalysisProgress] = useState<string>(initialProgressMessage);

    useEffect(() => {
        const { analysisRequest, terminate, subscribeToProgress } = analyze(githubUrl);
        subscribeToProgress(setAnalysisProgress);

        setAnalysisState(initialLoadState);
        setAnalysisProgress(initialProgressMessage);
        analysisRequest.then(
            data => {
                setAnalysis(data);
                setAnalysisState("resolved");
            },
            err => {
                setAnalysisError(err);
                setAnalysisState("rejected");
            });

        return terminate;
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
            return <Results data={ analysis }/>;

        default: return unexpected(analysisState);
    }
}

export default memo(Analysis);
