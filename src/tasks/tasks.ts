import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { work, exec, cmd } from "tasklauncher";
import { identity } from "../lib/guards";


type LintOptions = { fix?: boolean };
const lint = (opt: LintOptions) => cmd(`eslint src --ext .ts --ignore-path .gitignore --max-warnings 0${ opt.fix ? " --fix" : "" }`);

type JestOptions = { foreground?: boolean };  // TODO: coverage
const jest = (opt: JestOptions) => cmd("jest ./src", opt.foreground ? () => Promise.resolve() : undefined);

const typecheck = cmd("tsc -p tsconfig.json --noEmit");

const test = work(jest, typecheck, lint);
const buildTasks = work(cmd("cp package.json README.md build"))
    .after(cmd("tsc -b tsconfig-lib-release.json"))
    .after(test);

yargs(hideBin(process.argv))
    .command(
        "test", "Execute the test suite",
        identity,
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
        identity,
        () => exec(jest, { foreground: true }),
    )
    .command(
        "build", "Build the package",
        () => exec(buildTasks),
    )
    .strictCommands()
    .strictOptions()
    .demandCommand(1, "Specify a command to execute")
    .scriptName("npm run task")
    .parse();
