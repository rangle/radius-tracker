import { S3Client } from "@aws-sdk/client-s3";

import { createHandler, InjectedS3Client, TrackerEvent } from "./handler";
import type { WorkerInitPayload } from "../../shared_types/workerInitPayload";


let handler: ReturnType<typeof createHandler>;
let s3Client: InjectedS3Client;
let bucketName: string;
let eventBody: {
    Message: string,
};
let message: WorkerInitPayload;
let workerEvent: TrackerEvent;

describe("Worker lambda", () => {
    beforeEach(() => {
        s3Client = new S3Client({});
        bucketName = "BUCKET_NAME_" + Math.random();

        message = {
            repo: "test_repo",
            cloneUrl: "https://github.com/rangle/radius-tracker.git",
            defaultBranch: "main",
            repoId: "test_repoId",
            owner: "test_owner",
        },

        eventBody = {
            Message: JSON.stringify(message),
        };

        workerEvent = {
            Records: [
                {
                    messageId: "test_id",
                    body: JSON.stringify(eventBody),
                },
            ],
        };

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
        workerEvent = {
            Records: [
                {
                    messageId: "test_id",
                    body: "",    
                },
            ],
        };
        try {
            await handler(workerEvent);
        } catch (err: unknown) {
            err instanceof Error && expect(err.message).toBe("No data provided with event's body");
        }
    });

    it("should throw an error if cloneUrl is not valid", async () => {
        message = {
            repo: "test_repo",
            cloneUrl: "",
            defaultBranch: "main",
            repoId: "test_repoId",
            owner: "test_owner",
        };

        try {
            await handler(workerEvent);
        } catch (err: unknown) {
            err instanceof Error && expect(err.message).toBe("No data provided with event's body");
        }
    })
});
