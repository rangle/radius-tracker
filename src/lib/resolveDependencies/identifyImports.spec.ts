import { Project } from "ts-morph";
import {
    identifyImports, isCJSImport,
    isESMImportDefault,
    isESMImportDynamic,
    isESMImportEquals,
    isESMImportNamed,
    isESMImportNamespace,
} from "./identifyImports";
import { atLeastOne } from "../guards";

describe("Identify imports", () => {
    let project: Project;

    beforeEach(async () => {
        project = new Project({ useInMemoryFileSystem: true, compilerOptions: { allowJs: true } });
    });

    it("should find default import", async () => {
        const imports = identifyImports(project.createSourceFile("tst.js", `
            import val from "module"
        `));

        expect(imports).toHaveLength(1);

        const imp = atLeastOne(imports)[0];
        if (!isESMImportDefault(imp)) { throw new Error("Expected an ESM default import"); }
        expect(imp).toHaveProperty("moduleSpecifier", "module");
        expect(imp.identifier.getText()).toBe("val");
    });

    it("should find namespace import", async () => {
        const imports = identifyImports(project.createSourceFile("tst.js", `
            import * as val from "module"
        `));

        expect(imports).toHaveLength(1);

        const imp = atLeastOne(imports)[0];
        if (!isESMImportNamespace(imp)) { throw new Error("Expected an ESM namespace import"); }
        expect(imp).toHaveProperty("moduleSpecifier", "module");
        expect(imp.identifier.getText()).toBe("val");
    });

    it("should find named import", async () => {
        const imports = identifyImports(project.createSourceFile("tst.js", `
            import { val as alias } from "module"
        `));

        expect(imports).toHaveLength(1);

        const imp = atLeastOne(imports)[0];
        if (!isESMImportNamed(imp)) { throw new Error("Expected an ESM named import"); }
        expect(imp).toHaveProperty("moduleSpecifier", "module");
        expect(imp).toHaveProperty("referencedExport", "val");
        expect(imp.identifier.getText()).toBe("alias");
    });

    it("should find combined imports in a single import definition", async () => {
        const imports = identifyImports(project.createSourceFile("tst.js", `
            import def, { val as alias, thirdOne } from "module"
        `));

        expect(imports).toHaveLength(3);
    });

    it("should find import equals assignment", async () => {
        const imports = identifyImports(project.createSourceFile("tst.js", `
            import val = require("module");
        `));

        expect(imports).toHaveLength(1);

        const imp = atLeastOne(imports)[0];
        if (!isESMImportEquals(imp)) { throw new Error("Expected an ESM import equals"); }
        expect(imp).toHaveProperty("moduleSpecifier", "module");
        expect(imp.identifier.getText()).toBe("val");
    });

    it("should throw import equals assignment does not have a string module identifier", async () => {
        expect(() => identifyImports(project.createSourceFile("tst.js", `
            const mod = "module"; 
            import val = require(mod);
        `))).toThrowError(/Dynamic imports not supported/);
    });

    it("should find dynamic imports", async () => {
        const imports = identifyImports(project.createSourceFile("tst.js", `
            async function tst() {
                await import("module");
            }
        `));

        expect(imports).toHaveLength(1);

        const imp = atLeastOne(imports)[0];
        if (!isESMImportDynamic(imp)) { throw new Error("Expected an ESM dynamic import"); }
        expect(imp).toHaveProperty("moduleSpecifier", "module");
        expect(imp.importCall.getText()).toBe("import(\"module\")");
    });

    it("should throw if dynamic import is used without string module identifier", async () => {
        expect(() => identifyImports(project.createSourceFile("tst.js", `
            async function tst() {
                const mod = "module"; 
                await import(mod);
            }
        `))).toThrowError(/Dynamic imports not supported/);
    });

    it("should detect cjs require imports", async () => {
        const imports = identifyImports(project.createSourceFile("tst.js", `
            const val = require("module");
        `));

        expect(imports).toHaveLength(1);

        const imp = atLeastOne(imports)[0];
        if (!isCJSImport(imp)) { throw new Error("Expected a CJS import"); }
        expect(imp).toHaveProperty("moduleSpecifier", "module");
        expect(imp.importCall.getText()).toBe("require(\"module\")");
    });

    it("should throw if cjs require import is used without string module identifier", async () => {
        expect(() => identifyImports(project.createSourceFile("tst.js", `
            const mod = "module"; 
            require(mod);
        `))).toThrowError(/Dynamic cjs require calls not supported/);
    });

    it("should ignore type-only imports", async () => {
        const imports = identifyImports(project.createSourceFile("tst.js", `
            import type { t } from "module"
        `));

        expect(imports).toHaveLength(0);
    });
});
