import initSqlight, { BindParams, Database } from "sql.js";
import { CommitData, Stats } from "./timelines/workerTypes";
import { atLeastOne, objectKeys } from "../guards";
import { UsageStat } from "./sharedTypes";
import { relative } from "path";

export const processStats = async (allStats: { projectName: string, stats: Stats }[]): Promise<Database> => {
    const SQL = await initSqlight();
    const db = new SQL.Database();

    // noinspection SqlNoDataSourceInspection
    db.run(`
        CREATE TABLE projects (
            id INTEGER PRIMARY KEY, 
            project TEXT UNIQUE
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
            project INTEGER,
            component TEXT,
            FOREIGN KEY (project) REFERENCES projects(id)
        );
    `);
    db.run(`
        CREATE UNIQUE INDEX components_uniq_per_project ON components(project, component);
    `);
    db.run(`
        CREATE TABLE commits (
            id INTEGER PRIMARY KEY,
            project INTEGER,
            oid TEXT,
            FOREIGN KEY (project) REFERENCES projects(id)
        );
    `);
    db.run(`
        CREATE UNIQUE INDEX commit_uniq_per_project ON commits(project, oid);
    `);
    db.run(`
        CREATE TABLE usages (
            id INTEGER PRIMARY KEY,
            project INTEGER,
            oid INTEGER,
            weeksAgo INTEGER,
            type TEXT,
            importedFrom INTEGER,
            targetNodeFile INTEGER,
            usageFile INTEGER,
            component INTEGER,
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

    const commitCache: { [key: string]: number } = {};
    const upsertCommit = (project: number, commit: string) => {
        const cacheKey = `${ project }:::${ commit }`;
        const cached = commitCache[cacheKey];
        if (cached) { return cached; }

        const commitId = execReturning("INSERT INTO commits(project, oid) VALUES ($0, $1) ON CONFLICT DO UPDATE SET oid = oid RETURNING id", [project, commit]);
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
    const upsertComponent = (project: number, component: string) => {
        const cacheKey = `${ project }:::${ component }`;
        const cached = componentCache[cacheKey];
        if (cached) { return cached; }

        const componentId = execReturning("INSERT INTO components(project, component) VALUES ($0, $1) ON CONFLICT DO UPDATE SET component = component RETURNING id", [project, component]);
        if (typeof componentId !== "number") { throw new Error("Expected a numeric component id"); }

        componentCache[cacheKey] = componentId;
        return componentId;
    };

    const usageColumns = (project: number, commit: Pick<CommitData, "oid" | "weeksAgo">, usage: UsageStat) => ({
        project,
        oid: upsertCommit(project, commit.oid),
        weeksAgo: commit.weeksAgo,

        type: usage.type,
        importedFrom: upsertFile(project, usage.imported_from),
        targetNodeFile: upsertFile(project, usage.target_node_file),
        usageFile: upsertFile(project, usage.usage_file),
        component: upsertComponent(project, usage.name),
    });

    const write = (project: number, commit: Pick<CommitData, "oid" | "weeksAgo">, usagesArr: UsageStat[]) => {
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

    for (const { projectName, stats: projectStats } of allStats) {
        console.log(`Processing stats for ${ projectName }`);
        const projectId = execReturning("INSERT INTO projects(project) VALUES($0) RETURNING id", [projectName]);
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
        Fork this report: https://observablehq.com/@smoogly/design-system-metrics
        or see https://github.com/rangle/radius-tracker#report for details.
    `.replace(/\n\s+/g, "\n");
};
