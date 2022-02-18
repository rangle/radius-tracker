#!/usr/bin/env node

import "./checkEngine";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { readFileSync, statSync } from "fs";
import ignore from "ignore";
import { sync as globSync } from "glob";
import { SUPPORTED_FILE_TYPES } from "./supportedFileTypes";
import { Project, ProjectOptions } from "ts-morph";
import { detectSnowflakes } from "./detectSnowflakes/detectSnowflakes";
import { resolveDependencies } from "./resolveDependencies/resolveDependencies";
import { setupModuleResolution } from "./resolveModule/resolveModule";
import { FindUsageWarning, setupFindUsages, Usage } from "./findUsages/findUsages";
import { isPromiseLike, objectKeys } from "./guards";
import { getImportNode } from "./resolveDependencies/identifyImports";

const args = yargs(hideBin(process.argv))
    .command("$0 <path>", "Detect snowflakes and target usages in the specified codebase")
    .option("targetImportRe", {
        description: "Regexp used to determine if a particular import is from a target component library package",
        type: "string",
    })
    .option("testFileRe", {
        description: "Regexp matching the test files",
        type: "string",
        default: "(\\.(test|spec)\\.)",
    })
    .strictCommands()
    .demandCommand()
    .parse();

if (isPromiseLike(args)) { throw new Error("Implementation error: Unexpected promise from yargs"); }

const pathToProject = args.path;
if (!pathToProject || typeof pathToProject !== "string") { throw new Error("Please specify a path to the codebase that should be investigated"); }

const nonMatchingRe = /^(?!x)x/; // Not-followed by x & followed by x
const targetImportRe = args.targetImportRe ? new RegExp(args.targetImportRe) : nonMatchingRe;
const testFileRe = new RegExp(args.testFileRe);

process.chdir(pathToProject);

let gitignore = null;
try {
    // Detect gitignore
    gitignore = readFileSync(".gitignore", "utf8");
} catch (e) { /* ignore file read errors */ }

// Collect project files not ignored by gitignore
const ignoreFilter = gitignore ? ignore().add(gitignore).createFilter() : () => true;
const projectFiles = globSync(`**/*{${ SUPPORTED_FILE_TYPES.join(",") }}`, {
    dot: true,
    mark: true,
    ignore: "node_modules/**",
}).filter(ignoreFilter);

const tsconfigPath = "tsconfig.json";
const jsconfigPath = "jsconfig.json";
const config: ProjectOptions =
      statSync(tsconfigPath, { throwIfNoEntry: false }) ? { tsConfigFilePath: tsconfigPath }
    : statSync(jsconfigPath, { throwIfNoEntry: false }) ? { compilerOptions: { ...JSON.parse(readFileSync(jsconfigPath, "utf8")).compilerOptions ?? {}, allowJs: true } }
    : { compilerOptions: { allowJs: true } };

const project = new Project(config);
projectFiles.forEach(f => project.addSourceFileAtPath(f));
const snowflakes = project.getSourceFiles().map(detectSnowflakes).reduce((a, b) => [...a, ...b], []);

const dependencies = resolveDependencies(project, setupModuleResolution(project, process.cwd()));
const findUsages = setupFindUsages(dependencies);
const findUsageWarnings: FindUsageWarning[] = [];

const snowflakeUsageData = snowflakes.map(snowflake => {
    const { usages, warnings } = findUsages(snowflake.identifier ?? snowflake.declaration);
    findUsageWarnings.push(...warnings);

    return {
        description: snowflake.identifier?.getText() ?? snowflake.declaration.print(),
        usages: usages.filter(({ use }) => !testFileRe.test(use.getSourceFile().getFilePath())),
        type: "SNOWFLAKE",
    };
});

const targetImports = dependencies.filterImports(imp => targetImportRe.test(imp.moduleSpecifier));
const usagesByImportKey = targetImports
    .map(imp => {
        const { usages, warnings } = findUsages(getImportNode(imp));
        findUsageWarnings.push(...warnings);

        return {
            key: getImportNode(imp).print(),
            usages: usages.filter(({ use }) => !testFileRe.test(use.getSourceFile().getFilePath())),
        };
    })
    .reduce((components, { key, usages }) => {
        // eslint-disable-next-line @typescript-eslint/no-extra-parens
        components[key] = [...(components[key] ?? []), ...usages];
        return components;
    }, {} as { [prop: string]: Usage[] });

const targetUsageData = objectKeys(usagesByImportKey).map(description => ({
    usages: usagesByImportKey[description] ?? [],
    type: "TARGET",
    description,
}));

[...dependencies.warnings, ...findUsageWarnings].forEach(warn => console.log(`WARNING: ${ warn.message }`));
[...snowflakeUsageData, ...targetUsageData].forEach(({ type, description, usages }) => {
    console.log("\n\n\n-----------------\n");
    console.log(type, description, usages.length);
    usages.forEach(({ use }) => console.log(use.getParent()?.print() ?? use.print()));
});
