import {
    APIGatewayProxyResult,
    APIGatewayProxyEvent,
    Context,
} from "aws-lambda";
import { SNS } from "aws-sdk";
import { Buffer } from "buffer";
import { Octokit } from "@octokit/rest";



interface TrackerEvent extends APIGatewayProxyEvent {
    body: string, // Github repo url
}


type TrackerResponseSuccess = { statusCode: 200, payload: string };
type TrackerResponseFailure = { statusCode: 400, payload: string };
type TrackerResponseMessage = TrackerResponseSuccess | TrackerResponseFailure;




global.Buffer = Buffer; // TODO: provide via webpack globals

const octokit = new Octokit();
const sns = new SNS();


exports.handler = async (event: TrackerEvent, context: Context): Promise<APIGatewayProxyResult> => {
    const url = new URL(event.body);
    if (url.hostname !== "github.com") {
        return responseEvent({
            statusCode: 400, payload: "github.com url expected",
        });
    }
    const [, owner, repo] = url.pathname.split("/");
    if (!owner || !repo) {
        return responseEvent({
            statusCode: 400, payload: "Url does not point to a github repo",
        });
    }

    const repoInfo = await octokit.repos.get({ owner, repo });


    const params = {
        Message: JSON.stringify({ owner, repo, data: repoInfo.data }),
        Subject: `Data to analyze ${ url }`,
        TopicArn: process.env.SNS_ARN,
    };

    sns.publish(params, context.done);

    return responseEvent({
        statusCode: 200, payload: repoInfo.data.clone_url,
    });


};




function responseEvent(response: TrackerResponseMessage): APIGatewayProxyResult {
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
    };

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            payload: response.payload,
            code: response.statusCode,
        }),
    };
}
