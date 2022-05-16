import { S3Client } from "@aws-sdk/client-s3";

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
    new S3Client({ region: process.env.REGION }),
    pickEnv(
        "SNS_ARN",
        "BUCKET_NAME",
    ),
);
