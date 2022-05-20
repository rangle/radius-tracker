import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { WorkerInitPayload } from "../../shared_types/workerInitPayload";
import { PublishCommand } from "@aws-sdk/client-sns";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { getSignedUrl as signedUrlGetter } from "@aws-sdk/s3-request-presigner";

export type RepoInfo = {
    id: number,
    clone_url: string,
    default_branch: string,
};
export type InjectedOctokit = { repos: { get: (val: { owner: string, repo: string }) => Promise<{ data: RepoInfo }> } };
export type InjectedSnsClient = { send: (command: PublishCommand) => Promise<unknown> };
export type InjectedS3Client = S3Client;
export type InjectedPresignedUrlGetter = typeof signedUrlGetter;

export const createHandler = (
    octokit: InjectedOctokit,
    snsClient: InjectedSnsClient,
    s3Client: InjectedS3Client,
    getSignedUrl: InjectedPresignedUrlGetter,
    env: {
        BUCKET_NAME: string,
        SNS_ARN: string,
    },
) => async (event: Pick<APIGatewayProxyEvent, "body">): Promise<APIGatewayProxyResult> => {
    if (!event.body) {
        return responseEvent({
            statusCode: 400, payload: "event body expected",
        });
    }
    let url = undefined;
    try {
        url = new URL(event.body);
    } catch (error) {
        return responseEvent({
            statusCode: 400, payload: error as string,
        });
    }
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

    const workerInit: WorkerInitPayload = {
        owner,
        repo,
        cloneUrl: repoInfo.data.clone_url,
        defaultBranch: repoInfo.data.default_branch,
        repoId: repoInfo.data.id.toString(),
    };
    const params = {
        Message: JSON.stringify(workerInit),
        TopicArn: env.SNS_ARN,
    };

    // Create a message to SNS.
    try {
        const data = await snsClient.send(new PublishCommand(params));
        console.log("PUBLISH Success.", data);
    } catch (err) {
        console.log("PUBLISH Error.", err);
        return responseEvent({
            statusCode: 500, payload: "Error publish message to SNS",
        });
    }

    const bucketParams = {
        Bucket: `${ env.BUCKET_NAME }`,
        Key: `reports/${ repoInfo.data.id }`,
    };
    let signedUrl = "";

    // Create a presigned URL.
    try {
        const command = new GetObjectCommand(bucketParams);
        signedUrl = await getSignedUrl(s3Client, command, {
            expiresIn: 3600,
        });
        console.log("SIGNED_URL Success.", signedUrl);
    } catch (err) {
        console.log("SIGNED_URL Error", err);
        return responseEvent({
            statusCode: 500, payload: "Error creating presigned URL",
        });
    }

    return responseEvent({
        statusCode: 200, payload: signedUrl,
    });
};


const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
};
function responseEvent(response: { statusCode: 200 | 400 | 500, payload: string }): APIGatewayProxyResult {
    return {
        statusCode: response.statusCode,
        headers,
        body: JSON.stringify({
            payload: response.payload,
        }),
    };
}
