import { promisify } from "util";
import { exec as execWithCB, spawnSync } from "child_process";
import { join } from "path";
import { ResolvedWorkerConfig } from "./workerTypes";
import { cacheFileName, repoDirPath } from "../util/cache";
import { statSync } from "fs";

const maxBuffer = 1024 * 1024 * 1024; // ~1GB

const formatDate = (val: Date): string => {
    const datePart = val.toISOString().split("T")[0];
    if (!datePart) { throw new Error(`No date part found in ${ val.toISOString() }`); }
    return datePart;
};

export const gitExists = () => spawnSync("git", ["--version"], { maxBuffer }).status === 0;
export const getProjectPath = (cacheDir: string, config: ResolvedWorkerConfig) => join(repoDirPath(cacheDir), cacheFileName(config));

const gitCommand = (projectPath: string, command: string) => `GIT_TERMINAL_PROMPT=false git --git-dir=${ join(projectPath, ".git") } --work-tree=${ projectPath } ${ command }`;
const isShallowInfoProcessingError = (e: unknown) => e && typeof e === "object" && e.toString().toLowerCase().includes("error processing shallow info");

export type GitAPI = {
    listCommits: () => Promise<{ ts: Date, oid: string }[]>,
    cloneOrUpdate: (cloneUrl: string, since: Date) => Promise<void>,
    cloneNoCheckout: (destination: string) => Promise<GitAPI>,
    checkout: (ref: string) => Promise<void>,
};

export const setupGitAPI = (
    exec: (command: string) => Promise<{ stdout: string }>,
    fileExists: (path: string) => boolean,
): (projectPath: string) => GitAPI => {
    const getAPI = (projectPath: string): GitAPI => {
        return {
            listCommits,
            cloneOrUpdate,
            cloneNoCheckout,
            checkout,
        };

        async function cloneOrUpdate(cloneUrl: string, since: Date) {
            const retryOnShallowInfoProcessingError = async (commandAndOpts: string, pathParams = "") => {
                try {
                    await exec(gitCommand(projectPath, `${ commandAndOpts } --shallow-since=${ formatDate(since) } ${ pathParams }`));
                } catch (e) {
                    if (!isShallowInfoProcessingError(e)) { throw e; }

                    // Sometimes shallow info doesn't contain enough data to process the update, so we need to fetch the entire repo history
                    await exec(gitCommand(projectPath, `${ commandAndOpts } ${ pathParams }`));
                }
            };

            const dotGitPath = join(projectPath, ".git");
            if (fileExists(dotGitPath)) {
                // Don't clone if already exists
                await exec(gitCommand(projectPath, "repack -d"));
                await retryOnShallowInfoProcessingError("fetch -q");
            } else {
                // Clone just the main branch
                await retryOnShallowInfoProcessingError("clone -q --no-tags --single-branch --no-checkout", `${ cloneUrl } ${ dotGitPath }`);
            }
        }

        async function listCommits() {
            const { stdout } = await exec(gitCommand(projectPath, "log --pretty=format:'%H %as'"));
            return stdout
                .split("\n")
                .map(line => {
                    const [commit, date] = line.split(" ");
                    if (!commit || !date) { throw new Error(`Unexpected line format, expected commit hash & date, got: ${ line }`); }

                    const ts = new Date(date);
                    return { ts, oid: commit };
                })
                .sort((a, b) => b.ts.getTime() - a.ts.getTime());
        }

        async function cloneNoCheckout(destination: string) {
            await exec(`git clone --no-checkout ${ projectPath } ${ destination }`);
            return getAPI(destination);
        }

        async function checkout(ref: string) {
            await exec(gitCommand(projectPath, `checkout --force ${ ref }`));
        }
    };

    return getAPI;
};


const exec = promisify(execWithCB);
export const getGit = setupGitAPI(
    command => exec(command, { maxBuffer, encoding: "utf8" }),
    path => Boolean(statSync(path, { throwIfNoEntry: false })),
);
