import { defineYargsModule } from "../util/defineYargsModule";
import { access, copyFile, mkdir, readdir, rm } from "fs/promises";
import { join, relative } from "path";
import { constants } from "fs";

export default defineYargsModule(
    "report",
    "Creates a local report",
    args => args
        .options("template", {
            type: "string",
            normalize: true,
            describe: "Location of the report template. Uses built-in report by default.",
            demandOption: false,
        })
        .options("database", {
            type: "string",
            normalize: true,
            default: "./usages.sqlite.gz",
            describe: "Location of the database",
            demandOption: false,
        })
        .options("outdir", {
            type: "string",
            normalize: true,
            default: "./radius-tracker-report/",
            describe: "Output location of the report",
            demandOption: false,
        }),
    async args => {
        // Check the target location
        const relativeOutdir = relative(process.cwd(), args.outdir);
        if ((!relativeOutdir || relativeOutdir.includes("..")) && await exists(args.outdir, constants.W_OK)) {
            throw new Error(`
                Looks like outdir is outside of current directory, and is not empty.
                It's really scary to wipe the target directory outside of cwd,
                assuming you might be doing this by mistake.

                Outdir resolved to ${ relativeOutdir || "current directory" }

                Please report an issue if you are doing this deliberately.
            `.replace(/\n(?!\n)\s+/g, "\n"));
        }

        // Clean up the target location
        await rm(args.outdir, { recursive: true, force: true });

        // Copy the report template
        const templatePath = args.template || await resolveBundledTemplateDirectory();
        await copyDir(templatePath, args.outdir);

        // Copy the database
        await copyFile(args.database, join(args.outdir, "files", "usages.sqlite.gz"));

        console.log(`
            Radius Tracker report written to ${ args.outdir }

            To view, host the report as static files, or serve locally using:
            npx serve ${ args.outdir }
        `.replace(/\n(?!\n)\s+/g, "\n"));
    },
);

async function copyDir(from: string, to: string): Promise<void> {
    // Read directory first, so that we fail early if the directory doesn't exist
    const directory = await readdir(from, { withFileTypes: true, encoding: "utf-8" });

    await mkdir(to, { recursive: true });
    for (const file of directory) {
        if (file.isDirectory()) {
            await copyDir(join(from, file.name), join(to, file.name));
            continue;
        }

        if (file.isFile()) {
            await copyFile(join(from, file.name), join(to, file.name));
            continue;
        }

        throw new Error(`Unhandled directory entry, not a file and not a directory: ${ file.name } `);
    }
}

async function resolveBundledTemplateDirectory() {
    // In package, report template is at the root of the package directory
    const packagePath = join(__dirname, "..", "..", "..", "report_template");
    if (await exists(packagePath)) {
        return packagePath;
    }

    // In dev, report template is at the root of the build directory
    const devPath = join(__dirname, "..", "..", "..", "..", "build", "report_template");
    if (await exists(devPath)) {
        return devPath;
    }

    throw new Error("Could not resolve a report template path. In dev, make sure to generate the template first.");
}

async function exists(path: string, mode?: number) {
    try {
        await access(path, mode);
        return true;
    } catch (e) {
        return false;
    }
}
