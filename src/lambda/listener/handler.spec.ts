import {
    createHandler,
    InjectedOctokit,
    InjectedPresignedUrlGetter,
    InjectedS3Client,
    InjectedSnsClient,
    RepoInfo,
} from "./handler";
import { S3Client } from "@aws-sdk/client-s3";

describe("Listener lambda", () => {
    let repoData: RepoInfo;
    let presignedUrl: string;
    let snsArn: string;
    let bucketName: string;

    let octokit: InjectedOctokit;
    let snsClient: InjectedSnsClient;
    let s3Client: InjectedS3Client;
    let presign: InjectedPresignedUrlGetter;

    let handler: ReturnType<typeof createHandler>;

    beforeEach(async () => {
        repoData = {
            id: 0,
            clone_url: "https://github.com/rangle/radius-tracker.git",
            default_branch: "main",
        };

        presignedUrl = "https://s3.aws.whatever/bucket/" + Math.random();
        snsArn = "SNS_ARN_" + Math.random();
        bucketName = "BUCKET_NAME_" + Math.random();

        octokit = { repos: { get: jest.fn().mockResolvedValue(repoData) } };
        snsClient = { send: jest.fn().mockResolvedValue(void 0) };
        s3Client = new S3Client({});
        presign = jest.fn().mockResolvedValue(presignedUrl);

        handler = createHandler(
            octokit,
            snsClient,
            s3Client,
            presign,
            {
                BUCKET_NAME: bucketName,
                SNS_ARN: snsArn,
            },
        );
    });

    it("should return an error when given event body is not a url", async () => {
        const resp = await handler({ body: "this is not a URL" });
        expect(resp.statusCode).toBe(400);
    });
});
