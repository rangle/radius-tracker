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
    const baseURL = "https://github.com/rangle/radius-tracker";

    let repoData: RepoInfo;
    let presignedUrl: string;
    let snsArn: string;
    let bucketName: string;

    let octokit: InjectedOctokit;
    let snsClient: InjectedSnsClient;
    let s3Client: InjectedS3Client;
    let presign: InjectedPresignedUrlGetter;

    let handler: ReturnType<typeof createHandler>;

    beforeEach(() => {
        repoData = {
            id: 0,
            clone_url: "https://github.com/rangle/radius-tracker.git",
            default_branch: "main",
        };

        presignedUrl = "https://s3.aws.whatever/bucket/" + Math.random();
        snsArn = "SNS_ARN_" + Math.random();
        bucketName = "BUCKET_NAME_" + Math.random();

        octokit = { repos: { get: jest.fn().mockResolvedValue({ data: repoData }) } };
        presign = jest.fn().mockResolvedValue(presignedUrl);

        snsClient = { send: jest.fn().mockResolvedValue(void 0) };
        s3Client = new S3Client({});

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
    it("should return signedURL", async () => {
        const resp = await handler({ body: baseURL });
        expect(resp.statusCode).toBe(200);
    });

    it("should return an error when given event body is null", async () => {
        const resp = await handler({ body: null });
        expect(resp.statusCode).toBe(400);
    });

    it("should return an error when given event body is not a valid url", async () => {
        const resp = await handler({ body: "this is not a URL" });
        expect(resp.statusCode).toBe(400);
    });

    it("should return an error when given event body is not a github hosted url", async () => {
        const resp = await handler({ body: "https://example.com" });
        expect(resp.statusCode).toBe(400);
    });

    it("should return an error when given event body is not a github repo", async () => {
        const resp = await handler({ body: "https://example.com/any_user" });
        expect(resp.statusCode).toBe(400);
    });

    it("should return an error if can't publish message to SNS", async () => {
        handler = createHandler(
            octokit,
            { send: jest.fn().mockRejectedValue(new Error) },
            s3Client,
            presign,
            {
                BUCKET_NAME: bucketName,
                SNS_ARN: snsArn,
            },
        );
        const resp = await handler({ body: baseURL });
        expect(resp.statusCode).toBe(500);
    });

    it("should return an error if can't create a presigned URL", async () => {
        handler = createHandler(
            octokit,
            snsClient,
            s3Client,
            jest.fn().mockRejectedValue(new Error),
            {
                BUCKET_NAME: bucketName,
                SNS_ARN: snsArn,
            },
        );
        const resp = await handler({ body: baseURL });
        expect(resp.statusCode).toBe(500);
    });


});

