import { Project } from "ts-morph";
import { resolveDependencies } from "./resolveDependencies";
import { ResolveModule } from "../resolveModule/resolveModule";
import { Export, isESMDefaultExport, isESMNamedExport } from "./identifyExports";
import { Import, isCJSImport, isESMImportDefault, isESMImportNamed, isESMImportNamespace } from "./identifyImports";
import { atLeastOne } from "../guards";

describe("Resolve dependencies", () => {
    let project: Project;
    let resolveModule: ResolveModule;

    beforeEach(async () => {
        project = new Project({ useInMemoryFileSystem: true, compilerOptions: { allowJs: true } });

        // Mock resolve module, that finds files by file path
        resolveModule = jest.fn<ReturnType<ResolveModule>, Parameters<ResolveModule>>()
            .mockImplementation(target => project.getSourceFiles().find(f => f.getFilePath() === target) ?? null);
    });

    describe("filterImports", () => {
        it("should find no imports in an empty file", async () => {
            project.createSourceFile("/tst.js", "");
            const dependencies = resolveDependencies(project, resolveModule);

            const predicate = jest.fn();
            dependencies.filterImports(predicate);
            expect(predicate).not.toHaveBeenCalled();
        });

        it("should find imports in the project files", async () => {
            project.createSourceFile("/a.js", `
                import * as whop from "external";
                export default 1;
            `);
            project.createSourceFile("/b.js", `
                import one from "/a.js";
            `);
            const dependencies = resolveDependencies(project, resolveModule);

            const predicate = jest.fn<boolean, [Import]>();
            dependencies.filterImports(predicate);
            expect(predicate).toHaveBeenCalledTimes(2);

            expect(predicate.mock.calls.some(([exp]) => isESMImportNamespace(exp))).toBe(true);
            expect(predicate.mock.calls.some(([exp]) => isESMImportDefault(exp))).toBe(true);
        });
    });

    describe("filterExports", () => {
        it("should find no exports in an empty file", async () => {
            project.createSourceFile("/tst.js", "");
            const dependencies = resolveDependencies(project, resolveModule);

            const predicate = jest.fn();
            dependencies.filterExports(predicate);
            expect(predicate).not.toHaveBeenCalled();
        });

        it("should find exports in the project files", async () => {
            project.createSourceFile("/a.js", `
                export * as whop from "external"; // Reexport not returned
                export default 1;
            `);
            project.createSourceFile("/b.js", `
                import one from "/a.js";
                export const x = one;
            `);
            const dependencies = resolveDependencies(project, resolveModule);

            const predicate = jest.fn<boolean, [Export]>();
            dependencies.filterExports(predicate);
            expect(predicate).toHaveBeenCalledTimes(2);

            expect(predicate.mock.calls.some(([exp]) => isESMNamedExport(exp))).toBe(true);
            expect(predicate.mock.calls.some(([exp]) => isESMDefaultExport(exp))).toBe(true);
        });

        it("should avoid listing reexports", async () => {
            project.createSourceFile("/source.js", `
                export default 1;
            `);
            project.createSourceFile("/intermediary1.js", `
                export { default as target } from "/source.js";
            `);
            project.createSourceFile("/intermediary2.js", `
                export * as ns from "/intermediary1.js";
            `);
            project.createSourceFile("/consumer.js", `
                import * as imported from "/intermediary2.js";
            `);

            const dependencies = resolveDependencies(project, resolveModule);

            const predicate = jest.fn<boolean, [Export]>();
            dependencies.filterExports(predicate);

            // Only one export, and that export is esm default export
            const firstCall = atLeastOne(predicate.mock.calls)[0];
            expect(isESMDefaultExport(firstCall[0])).toBe(true);
        });
    });

    describe("resolveExportUses", () => {
        it("should return no imports for an unused export", async () => {
            project.createSourceFile("/a.js", `
                export default 1;
            `);

            const dependencies = resolveDependencies(project, resolveModule);
            const exp = atLeastOne(dependencies.filterExports(() => true))[0];
            expect(dependencies.resolveExportUses(exp)).toHaveLength(0);
        });

        it("should list imports of a given export", async () => {
            project.createSourceFile("/source.js", `
                export default 1;
            `);

            project.createSourceFile("/consumer1.js", `
                import val from "/source.js";
            `);
            project.createSourceFile("/consumer2.js", `
                import def from "/source.js";
            `);

            const dependencies = resolveDependencies(project, resolveModule);
            const exp = atLeastOne(dependencies.filterExports(() => true))[0];
            const imports = dependencies.resolveExportUses(exp);

            expect(imports).toHaveLength(2);
            expect(imports.map(({ imp }) => imp).every(isESMImportDefault)).toBe(true);
        });

        it("should transparently follow reexports", async () => {
            project.createSourceFile("/source.js", `
                export default 1;
            `);

            project.createSourceFile("/intermediary1.js", `
                export * as val from "/source.js";
            `);
            project.createSourceFile("/consumer1.js", `
                import { val } from "/intermediary1.js";
            `);

            project.createSourceFile("/intermediary2.js", `
                export { default } from "/source.js";
            `);
            project.createSourceFile("/consumer2.js", `
                import def from "/intermediary2.js";
            `);

            const dependencies = resolveDependencies(project, resolveModule);
            const exp = atLeastOne(dependencies.filterExports(() => true))[0];
            const imports = dependencies.resolveExportUses(exp).map(({ imp }) => imp);

            expect(imports).toHaveLength(2);

            const namedImport = imports.find(isESMImportNamed);
            if (!namedImport) { throw new Error("Expected to find a named import"); }
            expect(namedImport.referencedExport).toBe("val");
            expect(namedImport.moduleSpecifier).toBe("/intermediary1.js");

            const defaultImport = imports.find(isESMImportDefault);
            if (!defaultImport) { throw new Error("Expected to find a default import"); }
            expect(defaultImport.moduleSpecifier).toBe("/intermediary2.js");
        });

        it("should specify that the default export is accessible directly on the default import", async () => {
            project.createSourceFile("/source.js", `
                export default 1;
            `);
            project.createSourceFile("/consumer.js", `
                import def from "/source.js";
            `);

            const dependencies = resolveDependencies(project, resolveModule);
            const exp = atLeastOne(dependencies.filterExports(() => true))[0];
            const [{ aliasPath }] = atLeastOne(dependencies.resolveExportUses(exp));

            expect(aliasPath).toHaveLength(0);
        });

        it("should specify that the named export is accessible directly on the named import", async () => {
            project.createSourceFile("/source.js", `
                export const num = 1;
            `);
            project.createSourceFile("/consumer.js", `
                import { num as one } from "/source.js";
            `);

            const dependencies = resolveDependencies(project, resolveModule);
            const exp = atLeastOne(dependencies.filterExports(() => true))[0];
            const [{ aliasPath }] = atLeastOne(dependencies.resolveExportUses(exp));

            expect(aliasPath).toHaveLength(0); // `one` directly points to the exported value
        });

        it("should specify that the named export is accessible under the export alias name in a namespace import", async () => {
            project.createSourceFile("/source.js", `
                export const num = 1;
            `);
            project.createSourceFile("/consumer.js", `
                import * as ns from "/source.js";
            `);

            const dependencies = resolveDependencies(project, resolveModule);
            const exp = atLeastOne(dependencies.filterExports(() => true))[0];
            const [{ aliasPath }] = atLeastOne(dependencies.resolveExportUses(exp));

            expect(aliasPath).toHaveLength(1);
            expect(aliasPath[0]).toBe("num"); // Target is accessible via `ns.num`
        });

        it("should specify that the default export is accessible via a path when the value is reexported", async () => {
            project.createSourceFile("/source.js", `
                export default 1;
            `);
            project.createSourceFile("/intermediary1.js", `
                export { default as target } from "/source.js";
            `);
            project.createSourceFile("/intermediary2.js", `
                export * as ns1 from "/intermediary1.js";
            `);
            project.createSourceFile("/intermediary3.js", `
                export * from "/intermediary2.js";
            `);
            project.createSourceFile("/intermediary4.js", `
                export * as ns2 from "/intermediary3.js";
            `);
            project.createSourceFile("/intermediary5.js", `
                export { ns2 } from "/intermediary4.js";
            `);
            project.createSourceFile("/consumer.js", `
                import * as imported from "/intermediary5.js";
            `);

            const dependencies = resolveDependencies(project, resolveModule);
            const exp = atLeastOne(dependencies.filterExports(() => true))[0];
            const [{ aliasPath }] = atLeastOne(dependencies.resolveExportUses(exp));

            // `1` is accessible on `imported` via `imported.ns2.ns1.target`
            expect(aliasPath).toEqual(["ns2", "ns1", "target"]);
        });

        it("should track cjs imports of a cjs overwrite export", async () => {
            project.createSourceFile("/source.js", `
                module.exports = 1;
            `);
            project.createSourceFile("/consumer1.js", `
                const val = require("/source.js");
            `);

            const dependencies = resolveDependencies(project, resolveModule);
            const exp = atLeastOne(dependencies.filterExports(() => true))[0];
            const imports = dependencies.resolveExportUses(exp);

            expect(imports).toHaveLength(1);

            const [imp] = atLeastOne(imports);
            if (!isCJSImport(imp.imp)) { throw new Error("Expected a cjs import"); }
            expect(imp.aliasPath).toEqual([]);
        });

        it("should track cjs imports of a cjs prop export", async () => {
            project.createSourceFile("/source.js", `
                module.exports.prop = 1;
            `);
            project.createSourceFile("/consumer1.js", `
                const val = require("/source.js");
            `);

            const dependencies = resolveDependencies(project, resolveModule);
            const exp = atLeastOne(dependencies.filterExports(() => true))[0];
            const imports = dependencies.resolveExportUses(exp);

            expect(imports).toHaveLength(1);

            const [{ imp, aliasPath }] = atLeastOne(imports);
            if (!isCJSImport(imp)) { throw new Error("Expected a cjs import"); }
            expect(aliasPath).toEqual(["prop"]);
        });

        it("should track esm named import of a cjs prop export", async () => {
            project.createSourceFile("/source.js", `
                module.exports.prop = 1;
            `);
            project.createSourceFile("/consumer1.js", `
                import { prop } from "/source.js";
            `);

            const dependencies = resolveDependencies(project, resolveModule);
            const exp = atLeastOne(dependencies.filterExports(() => true))[0];
            const imports = dependencies.resolveExportUses(exp);

            expect(imports).toHaveLength(1);

            const [{ imp, aliasPath }] = atLeastOne(imports);
            if (!isESMImportNamed(imp)) { throw new Error("Expected an ESM named import"); }
            expect(aliasPath).toEqual([]);
        });

        it("should track esm named import of a cjs overwrite export", async () => {
            project.createSourceFile("/source.js", `
                module.exports = { prop: 1 };
            `);
            project.createSourceFile("/consumer1.js", `
                import { prop } from "/source.js";
            `);

            const dependencies = resolveDependencies(project, resolveModule);
            const exp = atLeastOne(dependencies.filterExports(() => true))[0];
            const imports = dependencies.resolveExportUses(exp);

            expect(imports).toHaveLength(1);

            const [{ imp, aliasPath }] = atLeastOne(imports);
            if (!isESMImportNamed(imp)) { throw new Error("Expected an ESM named import"); }
            expect(aliasPath).toEqual([]);
        });

        it("should throw if ESM default import is used to import a CJS overwrite export", async () => {
            // This behaviour depends on the project configuration and I'm choosing to ignore resolving it for now
            project.createSourceFile("/source.js", `
                module.exports = 1;
            `);
            project.createSourceFile("/consumer.js", `
                import one from "/source.js";
            `);
            expect(() => resolveDependencies(project, resolveModule)).toThrowError(/Ambiguous default ESM import of a CJS export/);
        });

        it("should throw if ESM default import is used to import a CJS prop export", async () => {
            // This behaviour depends on the project configuration and I'm choosing to ignore resolving it for now
            project.createSourceFile("/source.js", `
                module.exports.prop = 1;
            `);
            project.createSourceFile("/consumer.js", `
                import one from "/source.js";
            `);
            expect(() => resolveDependencies(project, resolveModule)).toThrowError(/Ambiguous default ESM import of a CJS export/);
        });
    });
});
