import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { exec } from "tasklauncher";
import { test, lint, jest, buildTasks } from "./lib";

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
            })
            .option("generateReportTemplate", {
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
