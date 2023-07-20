import { work, cmd, detectLog } from "tasklauncher";
import { satisfies } from "semver";

import { engines as docsPackageEngines } from "../docs/package.json";
import { join, normalize } from "path";
import { isNotNull } from "../lib/guards";

type LintOptions = { fix?: boolean };
export const lint = (opt: LintOptions) => cmd(`eslint ./ --ext .ts,.tsx --ignore-path .gitignore --max-warnings 0${ opt.fix ? " --fix" : "" }`);

type JestOptions = { foreground?: boolean };  // TODO: coverage
export const jest = (opt: JestOptions) => cmd("jest ./src", opt.foreground ? () => Promise.resolve() : undefined);

export const typecheck = cmd("tsc -p tsconfig.json --noEmit");

// For the purpose of test, build the docs if engine matches
const buildDocs = satisfies(process.version, docsPackageEngines.node)
    ? cmd("yarn docs-build")
    : cmd("echo Doc build skipped due to engine mismatch");

export const test = work(jest, typecheck, lint, buildDocs);

type BuildOptions = { test?: boolean, generateReportTemplate?: boolean };
export const buildTasks = (opt: BuildOptions) => {
    const generateReportTemplate = cmd("yarn cli report-generate-template");

    const copyFiles: { from: string, to?: string }[] = [
        { from: "./README.md" },
        { from: "./package.json" },

        // Non-js files for the report template generator
        ...["additional_styles.css", "generate_report_template.sh"]
            .flatMap(reportFile => ["cjs", "esm"].map(target => ({
                from: `src/lib/cli/report/${ reportFile }`,
                to: `${ target }/cli/report/`,
            }))),
    ];
    const copyTasks = work(...copyFiles.map(({ from, to }) => cmd(`cp ${ from } ${ normalize(join("build", to ?? from)) }`)));
    const buildLib = work(copyTasks)
        .after(
            cmd("tsc -b tsconfig-lib-cjs.json"),
            cmd("tsc -b tsconfig-lib-esm.json"),
            cmd("tsc -b tsconfig-lib-types.json"),
        );

    const buildAll = work(...[
        buildLib,
        opt.generateReportTemplate ? generateReportTemplate : null,
    ].filter(isNotNull));
    if (!opt.test) { return buildAll; }

    const launchLocalRegistry = work(cmd("verdaccio -l 8080 -c ./src/tasks/verdaccio.yml", detectLog("http://localhost:8080")))
        .after(cmd("rm -rf /tmp/verdaccio-storage"));

    return work(cmd("./src/tasks/execute_from_local_registry.sh")).after(
        launchLocalRegistry,
        work(cmd("./src/tasks/publish_to_local_registry.sh")).after(launchLocalRegistry, buildAll, test),
    );
};
