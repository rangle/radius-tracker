import { SNSClient } from "@aws-sdk/client-sns";
import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Octokit } from "@octokit/rest";
import { createHandler } from "./handler";

const pickEnv = <T extends string[]>(...keys: T): { [P in T[number]]: string } => {
    const pickedEnv = keys
        .map(key => {
            const val = process.env[key];
            if (!val) { throw new Error(`Expected env variable ${ key } to be set`); }
            return { key, val };
        })
        .reduce((agg, { key, val }) => {
            agg[key] = val;
            return agg;
        }, {} as { [prop: string]: string });

    return pickedEnv as never;
};

exports.handler = createHandler(
    new Octokit(),
    new SNSClient({ region: process.env.REGION }),
    new S3Client({ region: process.env.REGION }),
    getSignedUrl,
    pickEnv(
        "SNS_ARN",
        "BUCKET_NAME",
    ),
);
