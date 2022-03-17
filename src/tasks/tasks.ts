import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { work, exec, cmd, detectLog } from "tasklauncher";

type LintOptions = { fix?: boolean };
const lint = (opt: LintOptions) => cmd(`eslint ./ --ext .ts,.tsx --ignore-path .gitignore --max-warnings 0${ opt.fix ? " --fix" : "" }`);

type JestOptions = { foreground?: boolean };  // TODO: coverage
const jest = (opt: JestOptions) => cmd("jest ./src", opt.foreground ? () => Promise.resolve() : undefined);

const typecheck = cmd("tsc -p tsconfig.json --noEmit");

const test = work(jest, typecheck, lint);

type BuildOptions = { test?: boolean };
const buildTasks = (opt: BuildOptions) => {
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

yargs(hideBin(process.argv))
    .command(
        "test", "Execute the test suite",
        () => exec(test),
    )
    .command(
        "lint", "Run eslint",
        args => args
            .option("fix", {
                type: "boolean",
                default: false,
            }),
        args => exec(lint, args),
    )
    .command(
        "jest", "Run jest",
        () => exec(jest, { foreground: true }),
    )
    .command(
        "build", "Build the package",
        args => args
            .option("test", {
                type: "boolean",
                default: true,
            }),
        args => exec(buildTasks, args),
    )
    .strictCommands()
    .strictOptions()
    .demandCommand(1, "Specify a command to execute")
    .scriptName("npm run task")
    .parse();
