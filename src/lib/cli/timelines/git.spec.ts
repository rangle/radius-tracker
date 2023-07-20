import { GitAPI, setupGitAPI } from "./git";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockedFn<T extends (...args: any) => any> = jest.Mock<ReturnType<T>, Parameters<T>>;

describe("Git API", () => {
    let exec: MockedFn<Parameters<typeof setupGitAPI>[0]>;
    let fileExists: MockedFn<Parameters<typeof setupGitAPI>[1]>;
    let projectPath: string;
    let git: GitAPI;

    beforeEach(() => {
        exec = jest.fn<ReturnType<typeof exec>, Parameters<typeof exec>>().mockResolvedValue({ stdout: "" });
        fileExists = jest.fn<ReturnType<typeof fileExists>, Parameters<typeof fileExists>>().mockReturnValue(false);
        projectPath = "./path/to/project/directory";
        git = setupGitAPI(exec, fileExists)(projectPath);
    });

    describe("listCommits", () => {
        let hash: string;
        let date: string;
        beforeEach(() => {
            hash = "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";
            date = "2021-03-13";
            exec.mockResolvedValue({ stdout: `${ hash } ${ date }` });
        });

        it("should call git log with a custom format", async () => {
            await git.listCommits();
            const firstCallArgs = exec.mock.calls[0];
            if (!firstCallArgs) { throw new Error("Expected a git log to be called at least once"); }
            expect(firstCallArgs[0]).toContain("log --pretty=format:\"%H %as\"");
        });

        it("should return the parsed commit data", async () => {
            expect(await git.listCommits()).toEqual([{
                ts: new Date(date),
                oid: hash,
            }]);
        });
    });
});
