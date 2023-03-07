import { defineYargsModule } from "../util/defineYargsModule";
import { copyFile, readdir, mkdir, access } from "fs/promises";
import * as path from "path";

export default defineYargsModule(
    "report",
    "Creates an HTML report",
    args => args
        .options("database", {
            type: "string",
            normalize: true,
            default: "./usages.sqlite",
            describe: "location of the database",
        })
        .options("target", {
            type: "string",
            normalize: true,
            default: "./radius-report/",
            describe: "output location of the report",
        }),
    async args => {
        await copyDB(args.database);
        await copyReport(args.target);
    },
);

async function copyDB(dbLocation: string) {
    try {
        //FIXME this `fileLocation` could potentially be unpredictable
        const fileLocation = path.join(__dirname, "..", "..", "..", ".." ,"build" ,"report" ,"usages.sqlite");
        await copyFile(dbLocation, fileLocation);
    } catch (err) {
        console.error("could not copy database", err);
    }
}

async function copyReport(targetLocation: string) {
    try {
        await createDir(targetLocation);
        const reportLocation = path.join(__dirname, "..", "..", "..", ".." ,"build" ,"report");
        const fileNames = await readdir(reportLocation);
        for (const file of fileNames) {
            await copyFile(path.join(reportLocation, file), path.join( targetLocation, file));
        }
    } catch (err) {
        console.error("Error copying report", err);
    }
}

async function createDir(targetLocation: string) {
    try {
        await access(targetLocation);
    }
    catch {
        await mkdir(targetLocation);
    }
}