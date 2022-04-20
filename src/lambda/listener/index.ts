import {
    APIGatewayProxyResult,
    APIGatewayProxyEvent,
} from "aws-lambda";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Octokit } from "@octokit/rest";



interface TrackerEvent extends APIGatewayProxyEvent {
    body: string, // Github repo url
}


type TrackerResponseSuccess = { statusCode: 200, payload: string };
type TrackerResponseFailure = { statusCode: 400, payload: Error };
type TrackerResponseMessage = TrackerResponseSuccess | TrackerResponseFailure;


const octokit = new Octokit();

// Create SNS service object.
const snsClient = new SNSClient({ region: process.env.REGION });
// Create an Amazon S3 service client object.
const s3Client = new S3Client({ region: process.env.REGION });


exports.handler = async (event: TrackerEvent): Promise<APIGatewayProxyResult> => {
    const url = new URL(event.body);
    if (url.hostname !== "github.com") {
        return responseEvent({
            statusCode: 400, payload: new Error("github.com url expected"),
        });
    }
    const [, owner, repo] = url.pathname.split("/");
    if (!owner || !repo) {
        return responseEvent({
            statusCode: 400, payload: new Error("Url does not point to a github repo"),
        });
    }

    const repoInfo = await octokit.repos.get({ owner, repo });

    const params = {
        Message: JSON.stringify({ owner, repo, data: repoInfo.data }),
        TopicArn: process.env.SNS_ARN,
    };

    // Create a message to SNS.
    try {
        const data = await snsClient.send(new PublishCommand(params));
        console.log("PUBLISH Success.", data);
    } catch (err) {
        console.log("PUBLISH Error.", err);
        return responseEvent({
            statusCode: 400, payload: new Error("Error publish message to SNS"),
        });
    }

    const bucketParams = {
        Bucket: `${ process.env.BUCKET_NAME }`,
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
            statusCode: 400, payload: new Error("Error creating presigned URL"),
        });
    }

    return responseEvent({
        statusCode: 200, payload: signedUrl,
    });


};




function responseEvent(response: TrackerResponseMessage): APIGatewayProxyResult {
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
    };

    return {
        statusCode: response.statusCode,
        headers,
        body: JSON.stringify({
            payload: response.payload,
        }),
    };
}
