import { work, cmd, detectLog } from "tasklauncher";
import { satisfies } from "semver";

import { engines as docsPackageEngines } from "../docs/package.json";

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

type BuildOptions = { test?: boolean };
export const buildTasks = (opt: BuildOptions) => {
    const build = work(cmd("./src/tasks/setup_package_meta.sh"))
        .after(
            cmd("tsc -b tsconfig-lib-cjs.json"),
            cmd("tsc -b tsconfig-lib-esm.json"),
            cmd("tsc -b tsconfig-lib-types.json"),
        );

    if (!opt.test) { return build; }

    const launchLocalRegistry = work(cmd("verdaccio -l 8080 -c ./src/tasks/verdaccio.yml", detectLog("http://localhost:8080")))
        .after(cmd("rm -rf /tmp/verdaccio-storage"));

    return work(cmd("./src/tasks/execute_from_local_registry.sh")).after(
        launchLocalRegistry,
        work(cmd("./src/tasks/publish_to_local_registry.sh")).after(launchLocalRegistry, build, test),
    );
};
