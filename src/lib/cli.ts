import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { isPromise } from "util/types";
import { readFileSync, statSync } from "fs";
import ignore from "ignore";
import { sync as globSync } from "glob";
import { SUPPORTED_FILE_TYPES } from "./supportedFileTypes";
import { Project, ProjectOptions } from "ts-morph";
import { ComponentDeclaration, detectSnowflakes } from "./detectSnowflakes/detectSnowflakes";
import { resolveDependencies } from "./resolveDependencies/resolveDependencies";
import { setupModuleResolution } from "./resolveModule/resolveModule";
import { setupFindUsages, Usage } from "./findUsages/findUsages";
import { isNotNull } from "./guards";
import { getImportNode, Import } from "./resolveDependencies/identifyImports";

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

if (isPromise(args)) { throw new Error("Unexpected promise"); }

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

project.addSourceFilesAtPaths(projectFiles);
const sourceFiles = project.getSourceFiles();

const snowflakes = sourceFiles.map(detectSnowflakes).reduce((a, b) => [...a, ...b], []);

const dependencies = resolveDependencies(project, setupModuleResolution(project, process.cwd()));
const findUsages = setupFindUsages(dependencies);

const snowflakeUsages = (def: ComponentDeclaration) => findUsages(def.identifier ?? def.declaration);
snowflakes
    .map(snowflake => ({ snowflake, usages: snowflakeUsages(snowflake) }))
    .forEach(({ snowflake, usages }) => {
        const useStrings = usages
            .map(({ use }) => {
                const fp = use.getSourceFile().getFilePath();
                if (testFileRe.test(fp)) { return null; } // Ignore test files
                return use.getParent()?.print() ?? use.print();
            })
            .filter(isNotNull);

        console.log("\n\n\n-----------------\n");
        console.log("SNOWFLAKE", snowflake.identifier?.getText() ?? snowflake.declaration.print(), useStrings.length);
        useStrings.forEach(us => console.log(us));
    });

const targetImports = dependencies.filterImports(imp => targetImportRe.test(imp.moduleSpecifier));
const targetUsages = Array.from(
    targetImports
        .map(imp => ({ imp, usages: findUsages(getImportNode(imp)) }))
        .reduce((components, one) => {
            const importKey = getImportNode(one.imp).print();
            const ofThatModule = components.get(importKey) ?? [];
            ofThatModule.push(one);
            components.set(importKey, ofThatModule);
            return components;
        }, new Map<string, { imp: Import, usages: Usage[] }[]>())
        .values(),
);

targetUsages.forEach(ofThatModule => {
    const useStrings = ofThatModule
        .map(({ usages }) => {
            return usages
                .map(({ use }) => {
                    const fp = use.getSourceFile().getFilePath();
                    if (testFileRe.test(fp)) { return null; } // Ignore test files
                    return use.getParent()?.print() ?? use.print();
                })
                .filter(isNotNull);
        })
        .reduce((a, b) => [...a, ...b], []);

    const [firstUsage] = ofThatModule;
    if (!firstUsage) { throw new Error("Implementation error: expected at least one usage"); }

    console.log("\n\n\n-----------------\n");
    console.log("TARGET", getImportNode(firstUsage.imp).print(), useStrings.length);
    useStrings.forEach(us => console.log(us));
});

