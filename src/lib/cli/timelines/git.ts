import { promisify } from "util";
import { exec as execWithCB, spawnSync } from "child_process";
import { join } from "path";
import { statSync } from "fs";
import { ResolvedWorkerConfig } from "./workerTypes";
import { cacheFileName, repoDirPath, threadSpaceDirPath } from "../util/cache";

const exec = promisify(execWithCB);
const maxBuffer = 1024 * 1024 * 1024; // ~1GB

const formatDate = (val: Date): string => {
    const datePart = val.toISOString().split("T")[0];
    if (!datePart) { throw new Error(`No date part found in ${ val.toISOString() }`); }
    return datePart;
};

export const gitExists = () => spawnSync("git", ["--version"], { maxBuffer }).status === 0;

export const getProjectPath = (cacheDir: string, config: ResolvedWorkerConfig) => join(repoDirPath(cacheDir), cacheFileName(config));
const gitCommand = (projectPath: string, command: string) => `git --git-dir=${ join(projectPath, ".git") } --work-tree=${ projectPath } ${ command }`;
const isShallowInfoProcessingError = (e: unknown) => e && typeof e === "object" && e.toString().toLowerCase().includes("error processing shallow info");
export async function cloneOrUpdate(cacheDir: string, config: ResolvedWorkerConfig, cloneUrl: string, since: Date) {
    const projectPath = getProjectPath(cacheDir, config);
    if (statSync(projectPath, { throwIfNoEntry: false })) {
        // Don't clone if already exists
        await exec(gitCommand(projectPath, "repack -d"));

        try {
            await exec(gitCommand(projectPath, `fetch --shallow-since=${ formatDate(since) }`), { maxBuffer });
        } catch (e) {
            if (!isShallowInfoProcessingError(e)) {
                throw e;
            }

            // Sometimes shallow info doesn't contain enough data to process the update, so we need to fetch the entire repo
            await exec(gitCommand(projectPath, "fetch"), { maxBuffer });
        }

    } else {
        try {
            await exec(`git clone --no-tags --single-branch --no-checkout --shallow-since=${ formatDate(since) } ${ cloneUrl } ${ projectPath }`, { maxBuffer });
        } catch (e) {
            if (!isShallowInfoProcessingError(e)) {
                throw e;
            }

            // Sometimes shallow info doesn't contain enough data to process the update, so we need to fetch the entire repo
            await exec(`git clone --no-tags --single-branch --no-checkout ${ cloneUrl } ${ projectPath }`, { maxBuffer });
        }
    }
}
export async function checkout(projectPath: string, ref: string) {
    await exec(gitCommand(projectPath, `checkout --force ${ ref }`), { maxBuffer });
}
export async function gitlog(cacheDir: string, config: ResolvedWorkerConfig) {
    const { stdout } = await exec(gitCommand(getProjectPath(cacheDir, config), "log --pretty=format:'%H %as'"), { maxBuffer });
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

export const cloneToThreadSpace = (cacheDir: string, config: ResolvedWorkerConfig) => exec(`git clone --no-checkout ${ getProjectPath(cacheDir, config) } ${ threadSpaceDirPath(cacheDir) }`, { maxBuffer });
