import { dirname, isAbsolute, join, normalize } from "path";
import { Node, Project, Statement } from "ts-morph";
import { isEither } from "../../guards";
import { URL } from "url";
import { readdir, readFile, writeFile } from "fs/promises";
import { asyncExec } from "./async_exec";

const reportDirArg = process.argv[2];
if (!reportDirArg) { throw new Error("Missing report directory argument"); }
const absoluteReportDir = normalize(isAbsolute(reportDirArg) ? reportDirArg : join(process.cwd(), reportDirArg));

const getStatement = (node: Node): Statement => {
    if (Node.isStatement(node)) { return node; }
    const parent = node.getParent();
    if (!parent) { throw new Error("Implementation error: node without parent is not a statement"); }
    return getStatement(parent);
};

const isStringLikeLiteral = isEither(Node.isStringLiteral, Node.isNoSubstitutionTemplateLiteral);
const isFunction = isEither(Node.isFunctionDeclaration, Node.isFunctionExpression, Node.isArrowFunction);

(async () => {
    // Set up the project
    const project = new Project({
        useInMemoryFileSystem: false,
        compilerOptions: {
            baseUrl: absoluteReportDir,
            rootDir: absoluteReportDir,
            allowJs: true,
        },
    });
    project.addSourceFilesAtPaths(`${ absoluteReportDir }/**/*.js`);
    const ignoredFiles = ["runtime.js", "index.js"];
    project.getSourceFiles()
        .filter(f => ignoredFiles.includes(f.getBaseName()))
        .forEach(f => project.removeSourceFile(f));


    // Check no static esm imports are used
    // TODO: for the future might be useful to recursively fetch & rewrite esm imports
    const staticImport = project.getSourceFiles()
        .flatMap(f => f.getDescendantStatements())
        .filter(Node.isImportDeclaration)
        .find(node => node.getModuleSpecifierValue().startsWith("http"));
    if (staticImport) { throw new Error(`Static imports are not supported. Found ${ getStatement(staticImport).print() }`); }


    // Check no dynamic imports are used
    // TODO: for the future might be useful to find a way to support dynamic imports
    const importExpression = project.getSourceFiles()
        .flatMap(f => f.forEachDescendantAsArray())
        .find(Node.isImportExpression);
    if (importExpression) { throw new Error(`Dynamic imports are not supported. Found ${ getStatement(importExpression).print() }`); }


    // Find `knownExternalResources` list
    const knownExternalResourcesDefinitionCall = findCellDefinitionCall("knownExternalResources");

    const knownExternalResourcesDefinitionFn = knownExternalResourcesDefinitionCall.getArguments()[1];
    if (!Node.isIdentifier(knownExternalResourcesDefinitionFn)) { throw new Error("Could not find `knownExternalResources` identifier"); }

    const knownExternalResourcesImplementations = knownExternalResourcesDefinitionFn.getImplementations();
    if (knownExternalResourcesImplementations.length !== 1) { throw new Error(`Expected a single \`knownExternalResources\` implementation, got ${ knownExternalResourcesImplementations.length }`); }

    const knownExternalResourcesImplementationNode = knownExternalResourcesImplementations[0]?.getNode()?.getParent();
    if (!knownExternalResourcesImplementationNode) { throw new Error("Could not find `knownExternalResources` implementation node"); }
    if (!isFunction(knownExternalResourcesImplementationNode)) { throw new Error("`knownExternalResources` implementation node is not a function"); }

    const knownExternalResourceElements = knownExternalResourcesImplementationNode.getBody()
        ?.getDescendantStatements().find(Node.isReturnStatement)
        ?.forEachDescendantAsArray()
        .find(Node.isArrayLiteralExpression)
        ?.getElements();
    if (!knownExternalResourceElements) { throw new Error("Could not find known external resource links in cell implementation"); }
    if (!knownExternalResourceElements.every(isStringLikeLiteral)) { throw new Error("Expected a list of string literals in known external resource links cell implementation"); }
    const knownExternalResources = knownExternalResourceElements.map(el => el.getLiteralText());


    // Set up a mechanism to save remote dependencies
    const savedFiles = new Map<string, string>();
    async function save(urlString: string) {
        const url = new URL(urlString);
        const filename = url.pathname;
        const filepath = normalize(join(absoluteReportDir, "dependencies", filename));

        await asyncExec(`mkdir -p ${ dirname(filepath) }`);
        await asyncExec(`curl "${ urlString }" --output "${ filepath }"`);
        savedFiles.set(urlString, filename);
    }


    // Fetch external resources
    await Promise.all(knownExternalResources.map(save));


    // Rewrite the database filename
    const attachments = await readdir(join(absoluteReportDir, "files"));
    const databaseFile = attachments[0];
    if (attachments.length !== 1 || !databaseFile) { throw new Error(`Expected a single attachment with the sqlite database, got ${ attachments.length } instead`); }

    const databaseReferenceNode = project.getSourceFiles()
        .flatMap(f => f.forEachDescendantAsArray())
        .filter(isStringLikeLiteral)
        .find(node => node.getLiteralValue().includes(databaseFile));
    if (!databaseReferenceNode) { throw new Error(`Could not find a string literal node referencing database attachment: ${ databaseFile }`); }
    databaseReferenceNode.setLiteralValue(databaseReferenceNode.getLiteralValue().replace(databaseFile, "usages.sqlite"));


    // Remove dev-mode require overwrite
    getStatement(findCellDefinitionCall("require")).remove();


    // Rewrite the require calls to point to local files
    const indexHtmlPath = join(absoluteReportDir, "index.html");
    const indexHtml = await readFile(indexHtmlPath, "utf-8");
    const numScriptTags = indexHtml.match(/<script(?:.|\n)*?>/)?.length ?? 0;
    if (numScriptTags !== 1) { throw new Error(`Expected a single script tag in index.html, got ${ numScriptTags } instead`); }

    const scriptContent = indexHtml.match(/<script(?:.|\n)*?>((?:.|\n)*)<\/script>/)?.[1];
    if (!scriptContent) { throw new Error("No script content found"); }
    const indexFile = project.createSourceFile("tmp_index_script", scriptContent);

    const runtimeImport = indexFile.forEachDescendantAsArray()
        .filter(Node.isImportDeclaration)
        .find(imp => imp.getModuleSpecifierValue() === "./runtime.js");
    if (!runtimeImport) { throw new Error("Could not find import from ./runtime.js"); }
    if (!runtimeImport.getNamedImports().find(named => named.getName() === "Library")) {
        // Add library import if missing
        runtimeImport.addNamedImport("Library");
    }

    const runtimeInstantiation = indexFile.forEachDescendantAsArray()
        .filter(Node.isNewExpression)
        .find(newExpr => newExpr.getExpression().getText(false) === "Runtime");
    if (!runtimeInstantiation) { throw new Error("Could not find `new Runtime()` call"); }
    if (runtimeInstantiation.getArguments().length !== 0) { throw new Error("Expected runtime instantiation to have no arguments"); }

    // Prepend pre-fetched libs
    indexFile.insertStatements(getStatement(runtimeInstantiation).getChildIndex(), `
        const localLibraries = {
            ${ [...savedFiles.entries()].map(([url, file]) => `"${ url }": "./dependencies${ file }"`).join(",\n") }
        };
        const libraryUrls = Object.keys(localLibraries);
        
        const strictRequire = Library.requireFrom(async (name) => {
            const match = libraryUrls.find(u => u.includes(name));
            if (!match) {
                throw new Error(\`Unknown require resource. Please add it to knownExternalResources list, so that it can be statically resolved for report archival: \${ name }\`);
            }
    
            return localLibraries[match];
        });
    
        strictRequire.resolve = (path) => {
            const match = libraryUrls.find(u => u.includes(path));
            if (!match) {
                throw new Error(\`Unknown resolve resource. Please add a matching URL to knownExternalResources list, so that it can be statically resolved for report archival: \${ path }\`);
            }
    
            // Observable stdlib uses \`require.resolve\` to find where \`sql-wasm.wasm\` is located
            // relative to \`sql-wasm.js\` in \`sql.js\` module.
            // https://github.com/observablehq/stdlib/blob/fd48793e9e1bea5379e98d7f246a3442226562f2/src/sqlite.js#L5
            //
            // This contraption 1) assumes wasm file is loaded using knownExternalResources list,
            // and 2) local dependencies are organized in the same way the files in the original CDN are.
            const matchedPathname = new URL(sliceUntilAndIncluding(match, path)).pathname;
            return sliceUntilAndIncluding(localLibraries[match], matchedPathname);
            
            function sliceUntilAndIncluding(str, chunk) {
                const index = str.indexOf(chunk);
                if (index === -1) { throw new Error(\`Can not find \${ chunk } in \${ str }\`); }
                return str.slice(0, index + chunk.length);
            }
        };
    
        // Overwrite the default require
        Library.require = strictRequire;
    `);

    // Add instantiation arg to runtime
    runtimeInstantiation.addArgument("new Library()");

    // Write out the updated index file
    indexFile.formatText();
    await writeFile(indexHtmlPath, indexHtml.replace(scriptContent, indexFile.getFullText()), "utf-8");
    indexFile.delete(); // Remove the temporary file


    // Save the rewrites
    await project.save();


    // Find cell helper
    function findCellDefinitionCall(cellName: string) {
        const definitionCall = project.getSourceFiles()
            .flatMap(f => f.forEachDescendantAsArray())
            .filter(Node.isPropertyAccessExpression)
            .filter(propertyAccess => propertyAccess.getName() === "define")
            .map(propertyAccess => propertyAccess.getParent())
            .filter(Node.isCallExpression)
            .find(callExpression => {
                const firstArg = callExpression.getArguments()[0];
                return isStringLikeLiteral(firstArg) && firstArg.getLiteralText() === cellName;
            });

        if (!definitionCall) {
            throw new Error(`Did not find '${ cellName }' cell`);
        }

        return definitionCall;
    }
})().catch(err => {
    console.log(err);
    process.exit(1);
});
