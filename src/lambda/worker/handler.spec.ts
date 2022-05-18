import { S3Client } from "@aws-sdk/client-s3";

import { createHandler, InjectedS3Client } from "./handler";


let handler: ReturnType<typeof createHandler>;
let s3Client: InjectedS3Client;
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
    jest.useFakeTimers();

    beforeEach(() => {
        jest.runAllTimers();
        s3Client = new S3Client({});
        bucketName = "BUCKET_NAME_" + Math.random();

        handler = createHandler(
            s3Client,
            {
                BUCKET_NAME: bucketName,
            },
        );
    });

    it("should execute successfully", async () => {
        s3Client.send = jest.fn().mockReturnValue(true),
        await expect(handler(workerEvent)).toBeTruthy();
    });

    it("should call s3Client.send method", async () => {
        const spySend = jest.spyOn(s3Client, "send");
        await handler(workerEvent);
        expect(spySend).toHaveBeenCalled();
    });
    
    it("should be rejected because bucket doesn't exist", async () => {
        const spySend = jest.spyOn(s3Client, "send");
        await handler(workerEvent);
        await expect(spySend).toThrowError();
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
        try {
            await handler(noBodyEvent);
        } catch (err: unknown) {
            err instanceof Error && expect(err.message).toBe("No data provided with event's body");
        }
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
        try {
            await handler(noDataEvent);
        } catch (err: unknown) {
            err instanceof Error && expect(err.message).toContain("Cannot parse remote URL:");
        }
    });
});
