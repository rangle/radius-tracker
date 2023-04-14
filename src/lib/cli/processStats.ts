// noinspection SqlResolve

import initSqlight, { BindParams, Database } from "sql.js";
import { CommitData, Stats } from "./timelines/workerTypes";
import { atLeastOne, isRegexp, objectKeys } from "../guards";
import { ResolvedStatsConfig, UsageStat } from "./sharedTypes";
import { version } from "../packageInfo";
import { relative } from "path";

export type ProjectMetadata = {
    name: string,
    url: string,
    subprojectPath: string,
};
export const processStats = async ( // TODO: include warnings in the output
    allStats: {
        project: ProjectMetadata,
        config: ResolvedStatsConfig, stats: Stats,
    }[],
): Promise<Database> => {
    const SQL = await initSqlight();
    const db = new SQL.Database();

    db.run(`
        CREATE TABLE meta (
            id INTEGER PRIMARY KEY, 
            key TEXT UNIQUE,
            value TEXT
        );
    `);
    const meta: { [key: string]: string } = {
        version,
        schemaVersion: "3",
        collectedAt: new Date().toISOString(),
    };
    objectKeys(meta).forEach(key => {
        const val = meta[key];
        if (!val) { throw new Error(`String meta value expected for key '${ key }'`); }
        db.run("INSERT INTO meta(key, value) VALUES ($1, $2)", [key, val]);
    });

    // Project config specifiers targets, sometimes multiple targets per project with their own regexps.
    // Targets with matching keys are considered the same target, even if they have different regexps.
    // This is meaningful because same thing may sometimes be imported in different ways.
    // TODO: capture what exactly was the regexp for a given source per project.
    db.run(`
        CREATE TABLE sources (
            id INTEGER PRIMARY KEY, 
            source TEXT UNIQUE
        );
    `);
    db.run(`
        CREATE TABLE projects (
            id INTEGER PRIMARY KEY, 
            name TEXT,
            url TEXT,
            subproject_path TEXT
        );
    `);
    db.run(`
        CREATE TABLE files (
            id INTEGER PRIMARY KEY,
            project INTEGER,
            file TEXT,
            FOREIGN KEY (project) REFERENCES projects(id)
       );
    `);
    db.run(`
        CREATE UNIQUE INDEX file_uniq_per_project ON files(project, file);
    `);
    db.run(`
        CREATE TABLE components (
            id INTEGER PRIMARY KEY,
            source INTEGER,
            homebrew_project INTEGER,
            component TEXT,
            FOREIGN KEY (source) REFERENCES sources(id),
            FOREIGN KEY (homebrew_project) REFERENCES projects(id)
        );
    `);
    db.run(`
        CREATE UNIQUE INDEX components_uniq_per_homebrew_project ON components(homebrew_project, component);
    `);
    db.run(`
        CREATE TABLE commits (
            id INTEGER PRIMARY KEY,
            project INTEGER,
            oid TEXT,
            committedAt TEXT, 
            FOREIGN KEY (project) REFERENCES projects(id)
        );
    `);
    db.run(`
        CREATE UNIQUE INDEX commit_uniq_per_project ON commits(project, oid);
    `);
    db.run(`
        CREATE TABLE usages (
            id INTEGER PRIMARY KEY,
            source INTEGER,
            project INTEGER,
            oid INTEGER,
            weeksAgo INTEGER,
            importedFrom INTEGER,
            targetNodeFile INTEGER,
            usageFile INTEGER,
            component INTEGER,
            FOREIGN KEY (source) REFERENCES sources(id),
            FOREIGN KEY (project) REFERENCES projects(id),
            FOREIGN KEY (oid) REFERENCES commits(id),
            FOREIGN KEY (importedFrom) REFERENCES files(id),
            FOREIGN KEY (targetNodeFile) REFERENCES files(id),
            FOREIGN KEY (usageFile) REFERENCES files(id),
            FOREIGN KEY (component) REFERENCES components(id)
        );
    `);


    const execReturning = (sql: string, params?: BindParams) => {
        if (!sql.toLowerCase().includes("returning")) { throw new Error(`Expected a \`returning\` statement in the given sql, got: ${ sql }`); }
        const res = db.exec(sql, params);
        const row = res[0]?.values[0];
        if (row === undefined) { throw new Error("Expected to find a row"); }
        const value = row[0];
        if (value === undefined) { throw new Error("Expected to find a returned value in the row"); }
        return value;
    };

    const homebrewId = execReturning("INSERT INTO sources(source) VALUES ($1) RETURNING id", ["homebrew"]);
    if (typeof homebrewId !== "number") { throw new Error("Expected homebrew source id to be a number"); }

    const sourceIdMap = [...new Set(
        allStats
            .map(x => x.config.isTargetModuleOrPath)
            .flatMap(target => isRegexp(target) ? "target" : objectKeys(target)),
    )]
        .map(source => {
            const id = execReturning("INSERT INTO sources(source) VALUES ($1) RETURNING id", [source]);
            if (typeof id !== "number") { throw new Error("Expected source id to be a number"); }
            return { source, id };
        })
        .reduce((map, { source, id }) => {
            map.set(source, id);
            return map;
        }, new Map<string, number>([["homebrew", homebrewId]]));

    const getSourceId = (source: string) => {
        const id = sourceIdMap.get(source);
        if (!id) { throw new Error(`Can not find source ${ source }`); }
        return id;
    };

    const commitCache: { [key: string]: number } = {};
    const upsertCommit = (project: number, commit: string, commitTime: Date) => {
        const cacheKey = `${ project }:::${ commit }`;
        const cached = commitCache[cacheKey];
        if (cached) { return cached; }

        const commitId = execReturning("INSERT INTO commits(project, oid, committedAt) VALUES ($0, $1, $2) ON CONFLICT DO UPDATE SET oid = oid RETURNING id", [project, commit, commitTime.toISOString()]);
        if (typeof commitId !== "number") { throw new Error("Expected a numeric commit id"); }

        commitCache[cacheKey] = commitId;
        return commitId;
    };

    const fileCache: { [key: string]: number } = {};
    const upsertFile = (project: number, file: string) => {
        const cacheKey = `${ project }:::${ file }`;
        const cached = fileCache[cacheKey];
        if (cached) { return cached; }

        const fileId = execReturning("INSERT INTO files(project, file) VALUES ($0, $1) ON CONFLICT DO UPDATE SET file = file RETURNING id", [project, file]);
        if (typeof fileId !== "number") { throw new Error("Expected a numeric file id"); }

        fileCache[cacheKey] = fileId;
        return fileId;
    };

    const componentCache: { [key: string]: number } = {};
    const upsertComponent = (source: number, homebrewProject: number | null, component: string) => {
        const cacheKey = `${ source }:::${ homebrewProject }:::${ component }`;
        const cached = componentCache[cacheKey];
        if (cached) { return cached; }

        const componentId = execReturning(`
            INSERT INTO components(source, homebrew_project, component)
            VALUES ($0, $1, $2)
            ON CONFLICT DO UPDATE SET component = component RETURNING id
        `, [source, homebrewProject, component]);
        if (typeof componentId !== "number") { throw new Error("Expected a numeric component id"); }

        componentCache[cacheKey] = componentId;
        return componentId;
    };

    const usageColumns = (
        project: number,
        commit: Pick<CommitData, "oid" | "weeksAgo" | "ts">,
        usage: UsageStat,
    ) => {
        const sourceId = getSourceId(usage.source);
        return {
            project,
            oid: upsertCommit(project, commit.oid, commit.ts),
            weeksAgo: commit.weeksAgo,

            source: sourceId,
            importedFrom: upsertFile(project, usage.imported_from),
            targetNodeFile: upsertFile(project, usage.target_node_file),
            usageFile: upsertFile(project, usage.usage_file),
            component: upsertComponent(sourceId, usage.source === "homebrew" ? project : null, usage.component_name),
        };
    };

    const write = (project: number, commit: Pick<CommitData, "oid" | "weeksAgo" | "ts">, usagesArr: UsageStat[]) => {
        if (usagesArr.length === 0) { return; }

        const usages = atLeastOne(usagesArr);
        const columns = objectKeys(usageColumns(project, commit, usages[0]));

        const chunks = usages.reduce((all, item, i) => {
            const chunkId = Math.floor(i / 1000);
            const chunk = all[chunkId] ?? [];
            chunk.push(item);
            all[chunkId] = chunk;
            return all;
        }, [] as UsageStat[][]);

        for (const chunk of chunks) {
            let placeholder = 0;
            const allValues = chunk.map(usage => {
                const usageData = usageColumns(project, commit, usage);
                const usageValues = columns.map(k => usageData[k]);
                return {
                    placeholders: `(${ usageValues.map(() => `$${ placeholder++ }`).join(", ") })`,
                    values: usageValues,
                };
            });

            db.run(`
                INSERT INTO usages(${ columns.join(", ") })
                VALUES ${ allValues.map(v => v.placeholders).join(", ") }
            `, allValues.map(v => v.values).flat());
        }
    };

    for (const { project, stats: projectStats } of allStats) {
        console.log(`Processing stats for ${ project.name }`);
        const projectId = execReturning(`
            INSERT INTO projects(name, url, subproject_path)
            VALUES($0, $1, $2) RETURNING id
        `, [project.name, project.url, project.subprojectPath]);
        if (typeof projectId !== "number") { throw new Error("Numeric project id expected"); }

        for (const pointInTime of projectStats) {
            write(projectId, pointInTime.commit, pointInTime.stats);
        }
    }

    return db;
};

export const statsMessage = (outfile: string) => {
    const out = relative(process.cwd(), outfile);
    return `

        Stats were saved to: ${ out }
        It's an SQLite database you can use as an input for your analysis.

        Generate a local report by running:
        npx radius-tracker report --database ${ out }

        See https://rangle.github.io/radius-tracker/analysis for details.
    `.replace(/\n(?!\n)\s+/g, "\n");
};
