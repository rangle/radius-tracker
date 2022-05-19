import { S3Client } from "@aws-sdk/client-s3";

import { createHandler, InjectedS3Client } from "./handler";


let handler: ReturnType<typeof createHandler>;
let s3Client: Omit<InjectedS3Client, "send"> & Pick<jest.Mocked<InjectedS3Client>, "send">;
let bucketName: string;

const message = {
    repo: "test_repo",
    cloneUrl: "https://github.com/rangle/radius-tracker.git",
    defaultBranch: "main",
    repoId: "test_repoId",
    owner: "test_owner",
};

const eventBody = {
    Message: JSON.stringify(message),
};

const workerEvent = {
    Records: [
        {
            messageId: "test_id",
            body: JSON.stringify(eventBody),
        },
    ],
};

describe("Worker lambda", () => {
    beforeEach(() => {
        s3Client = Object.assign(new S3Client({}), { send: jest.fn().mockResolvedValue(undefined as never) });
        bucketName = "BUCKET_NAME_" + Math.random();

        handler = createHandler(
            s3Client,
            {
                BUCKET_NAME: bucketName,
            },
        );
    });

    it("should execute successfully", async () => {
        await expect(handler(workerEvent)).resolves.toBe(undefined);
    });

    it("should call s3Client.send method", async () => {
        await handler(workerEvent);
        expect(s3Client.send).toHaveBeenCalled();
    });
    
    it("should be rejected because bucket doesn't exist", async () => {
        await handler(workerEvent);
        await expect(s3Client.send.mock.calls[0]?.[0]?.input).toHaveProperty("Bucket", bucketName);
    });

    it("should throw an error if body is missing", async () => {
        const noBodyEvent = {
            Records: [
                {
                    messageId: "test_id",
                    body: "",    
                },
            ],
        };
        await expect(handler(noBodyEvent)).rejects.toThrowError("No data provided with event's body");
    });

    it("should throw an error if cloneUrl is not valid", async () => {
        const noGitCloneMessage = {
            cloneUrl: "test",
        };
        const noDataEvent = {
            Records: [
                {
                    messageId: "test_id",
                    body: JSON.stringify({ Message: JSON.stringify(noGitCloneMessage) }),    
                },
            ],
        };
        await expect(handler(noDataEvent)).rejects.toThrowError(/Cannot parse remote URL:/i);
    });
});
