import { defineYargsModule } from "../util/defineYargsModule";
import { collectStats } from "../collectStats";
import { performance } from "perf_hooks";
import { resolveStatsConfig } from "../resolveStatsConfig";
import { StatsConfig } from "../sharedTypes";
import { processStats, ProjectMetadata, statsMessage } from "../processStats";
import { writeFileSync } from "fs";
import { join, resolve } from "path";
import { Merge } from "ts-toolbelt/out/Union/Merge";
import { OptionalKeys } from "ts-toolbelt/out/Object/OptionalKeys";
import { RequiredKeys } from "ts-toolbelt/out/Object/RequiredKeys";
import { Project } from "ts-morph";

export default defineYargsModule(
    "in-place [path]",
    "Stats collected directly from the filesystem",
    args => args
        .positional("path", {
            type: "string",
            normalize: true,
            demandOption: false,
        })
        .options("ignoredFileRe", { type: "string" })
        .options("targetRe", { type: "string", demandOption: true })
        .options("tsconfigPath", { type: "string", normalize: true, conflicts: "jsconfigPath" })
        .options("jsconfigPath", { type: "string", normalize: true, conflicts: "tsconfigPath" })
        .options("outfile", { type: "string", normalize: true }),

    async args => {
        let prev: number | null = null;
        const tag = () => {
            const ts = performance.now();
            const tg = `[${ Math.floor(prev ? (ts - prev) / 1000 : 0) }s]`;
            prev = ts;
            return tg;
        };

        type Explicit<T extends object> =
            { [P in OptionalKeys<T>]: T[P] | undefined }
            & { [P in RequiredKeys<T>]: T[P] };
        const unresolvedConfig: Explicit<Merge<StatsConfig>> = {
            tsconfigPath: args.tsconfigPath ?? null,
            jsconfigPath: args.jsconfigPath ?? null,
            isTargetModuleOrPath: new RegExp(args.targetRe),
            isTargetImport: undefined,
            isValidUsage: undefined,
            subprojectPath: "/",
            isIgnoredFile: args.ignoredFileRe ? new RegExp(args.ignoredFileRe) : undefined,
        };

        const config = resolveStatsConfig(unresolvedConfig);

        const project: ProjectMetadata = {
            name: args.path ?? "Current directory",
            url: args.path ?? ".",
            subprojectPath: "/",
        };
        const stats = await processStats([{ project, config, stats: [{
            commit: {
                oid: "latest",
                weeksAgo: 0,
                ts: new Date(),
                expectedDate: new Date(),
            },
            stats: await collectStats(
                new Project().getFileSystem(), // Provide the disk filesystem
                config,
                (message: string) => console.log(`${ tag() } ${ message }`),
                resolve(args.path ?? process.cwd()),
            ),
        }] }]);

        const outfile = resolve(args.outfile || join(process.cwd(), "usages.sqlite"));
        writeFileSync(outfile, Buffer.from(stats.export()));
        console.log(statsMessage(outfile));
    },
);
