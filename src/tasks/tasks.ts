import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { work, exec, cmd } from "tasklauncher";

type LintOptions = { fix?: boolean };
const lint = (opt: LintOptions) => cmd(`eslint ./ --ext .ts,.tsx,.json --ignore-path .gitignore --max-warnings 0${opt.fix ? " --fix" : ""}`);

type JestOptions = { foreground?: boolean };  // TODO: coverage
const jest = (opt: JestOptions) => cmd("jest ./src", opt.foreground ? () => Promise.resolve() : undefined);

const typecheck = cmd("tsc -p tsconfig.json --noEmit");

const test = work(jest, typecheck, lint);

type BuildOptions = { test?: boolean };
const buildTasks = (opt: BuildOptions) => {
    const build = work(cmd("cp package.json README.md build"))
        .after(
            cmd("tsc -b tsconfig-lib-cjs.json"),
            cmd("tsc -b tsconfig-lib-esm.json"),
            cmd("tsc -b tsconfig-lib-types.json"),
        );

    return opt.test ? build.after(test) : build;
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
