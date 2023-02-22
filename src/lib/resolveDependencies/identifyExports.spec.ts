import { Node, Project } from "ts-morph";
import {
    Export,
    identifyExports,
    isESMDefaultExport,
    isESMNamedExport,
    isESMReexportStar,
    isESMReexportStarAsNamed,
    isESMNamedReexport, isCJSOverwriteExport, isCJSPropExport,
} from "./identifyExports";
import { atLeastOne } from "../guards";

describe("Identify exports", () => {
    let project: Project;

    beforeEach(async () => {
        project = new Project({ useInMemoryFileSystem: true, compilerOptions: { allowJs: true } });
    });

    it("should find esm default export of a literal", async () => {
        const exports = identifyExports(project.createSourceFile("tst.js", `
            export default 1;
        `));

        expect(exports).toHaveLength(1);

        const exp = atLeastOne(exports)[0];
        if (!isESMDefaultExport(exp)) { throw new Error("Expected an ESM default export"); }
        expect(Node.isNumericLiteral(exp.exported)).toBe(true);
    });

    it("should find esm default export of a variable identifier", async () => {
        const exports = identifyExports(project.createSourceFile("tst.js", `
            const a = 1;
            export default a;
        `));

        expect(exports).toHaveLength(1);

        const exp = atLeastOne(exports)[0];
        if (!isESMDefaultExport(exp)) { throw new Error("Esm default export expected"); }
        expect(Node.isIdentifier(exp.exported)).toBe(true);
        expect(exp.exported.getText()).toBe("a");
        expect(exp.exported.getParent()?.getText()).not.toContain("const");
    });

    it("should find esm named function export", async () => {
        const exports = identifyExports(project.createSourceFile("tst.js", `
            export function named() { return void 0; }
        `));

        expect(exports).toHaveLength(1);

        const exp = atLeastOne(exports)[0];
        if (!isESMNamedExport(exp)) { throw new Error("Export is not ESM named export"); }

        expect(exp).toHaveProperty("alias", "named");
        expect(Node.isFunctionDeclaration(exp.exported)).toBe(true);
    });

    it("should find esm default function export without identifier", async () => {
        const exports = identifyExports(project.createSourceFile("tst.js", `
            export default function() { return void 0; }
        `));

        expect(exports).toHaveLength(1);

        const exp = atLeastOne(exports)[0];
        if (!isESMDefaultExport(exp)) { throw new Error("Export is not ESM named export"); }
        expect(Node.isFunctionDeclaration(exp.exported)).toBe(true);
    });

    it("should find esm default function export with identifier", async () => {
        const exports = identifyExports(project.createSourceFile("tst.js", `
            export default function tst() { return void 0; }
        `));

        expect(exports).toHaveLength(1);

        const exp = atLeastOne(exports)[0];
        if (!isESMDefaultExport(exp)) { throw new Error("Export is not ESM named export"); }
        expect(Node.isFunctionDeclaration(exp.exported)).toBe(true);
    });

    it("should find esm named const exports", async () => {
        const exports = identifyExports(project.createSourceFile("tst.js", `
            export const a = 1, b = 2;
        `));

        expect(exports).toHaveLength(2);

        const checkConstExport = (exp: Export | undefined, expectedName: string) => {
            if (!exp || !isESMNamedExport(exp)) { throw new Error("Expected an esm named export"); }

            expect(exp).toHaveProperty("alias", expectedName);
            expect(Node.isVariableDeclaration(exp.exported)).toBe(true);
        };

        checkConstExport(exports[0], "a");
        checkConstExport(exports[1], "b");
    });

    it("should find esm named exports", async () => {
        const exports = identifyExports(project.createSourceFile("tst.js", `
            const a = 1, b = 2;
            export { a as one, b as two };
        `));

        expect(exports).toHaveLength(2);

        const checkNamedExport = (exp: Export | undefined, expectedAlias: string, expectedIdentifierName: string) => {
            if (!exp || !isESMNamedExport(exp)) { throw new Error("Expected an esm named export"); }

            expect(exp).toHaveProperty("alias", expectedAlias);

            if (!Node.isIdentifier(exp.exported)) { throw new Error("Expected to export an identifier"); }
            expect(exp.exported.getText()).toBe(expectedIdentifierName);
        };
        checkNamedExport(exports[0], "one", "a");
        checkNamedExport(exports[1], "two", "b");
    });

    it("should find esm reexport star", async () => {
        project.createSourceFile("source.js", `
            const val1 = 1;
            const val2 = 2;
            export { val1, val2 };
        `);
        const exports = identifyExports(project.createSourceFile("tst.js", `
            export * from "/source.js";
        `));

        expect(exports).toHaveLength(1);

        const exp = atLeastOne(exports)[0];
        if (!isESMReexportStar(exp)) { throw new Error("Expected an ESM reexport star"); }
        expect(exp.moduleSpecifier).toBe("/source.js");
    });

    it("should find aliased esm reexport star", async () => {
        project.createSourceFile("source.js", `
            const val1 = 1;
            const val2 = 2;
            export { val1, val2 };
        `);
        const exports = identifyExports(project.createSourceFile("tst.js", `
            export * as alias from "/source.js";
        `));

        expect(exports).toHaveLength(1);

        const exp = atLeastOne(exports)[0];
        if (!isESMReexportStarAsNamed(exp)) { throw new Error("Expected an aliased ESM reexport star"); }
        expect(exp.moduleSpecifier).toBe("/source.js");
        expect(exp.alias).toBe("alias");
    });

    it("should find named esm reexport", async () => {
        const exports = identifyExports(project.createSourceFile("tst.js", `
            export { val as alias } from "blah";
        `));

        expect(exports).toHaveLength(1);

        const exp = atLeastOne(exports)[0];
        if (!isESMNamedReexport(exp)) { throw new Error("Expected a named ESM reexport"); }
        expect(exp.moduleSpecifier).toBe("blah");
        expect(exp.referencedExport).toBe("val");
        expect(exp.alias).toBe("alias");
    });

    it("should correctly process multiple ESM exports in a single file", async () => {
        const exports = identifyExports(project.createSourceFile("tst.js", `
            export * as whop from "external";
            export * as hey from "module";
            export { a, b, c } from "dep1";
            export { d, e, f } from "dep2";
            export default 1;
        `));

        expect(exports).toHaveLength(9);
    });

    it("should not return typescript type exports", async () => {
        const exports = identifyExports(project.createSourceFile("tst.js", `
            export type Tst = 1;
            export interface Blah {};
        `));

        expect(exports).toHaveLength(0);
    });

    it("should not return duplicate typescript type exports", async () => {
        const exports = identifyExports(project.createSourceFile("tst.js", `
            export interface Something { label: Label; }
            export interface Label { col: number; }
            export interface Label { row: number; }
        `));

        expect(exports).toHaveLength(0);
    });

    it("should correctly process export referenced multiple times throughout the file", async () => {
        const exports = identifyExports(project.createSourceFile("tst.js", `
            export function tst() {}
            tst.x = 1;
        `));

        expect(exports).toHaveLength(1);
    });

    it("should find cjs export overwrite", async () => {
        const exports = identifyExports(project.createSourceFile("tst.js", `
            module.exports = 1;
        `));

        expect(exports).toHaveLength(1);

        const exp = atLeastOne(exports)[0];
        if (!isCJSOverwriteExport(exp)) { throw new Error("Expected a CJS overwrite export"); }
        expect(Node.isNumericLiteral(exp.exported)).toBe(true);
    });

    it("should find cjs prop export", async () => {
        const exports = identifyExports(project.createSourceFile("tst.js", `
            module.exports.prop = 1;
        `));

        expect(exports).toHaveLength(1);

        const exp = atLeastOne(exports)[0];
        if (!isCJSPropExport(exp)) { throw new Error("Expected a CJS prop export"); }
        expect(Node.isNumericLiteral(exp.exported)).toBe(true);
        expect(exp.alias).toBe("prop");
    });

    it("should find property access used as cjs prop export", async () => {
        const exports = identifyExports(project.createSourceFile("tst.js", `
            module.exports.prop = 1;
        `));

        expect(exports).toHaveLength(1);

        const exp = atLeastOne(exports)[0];
        if (!isCJSPropExport(exp)) { throw new Error("Expected a CJS prop export"); }
        expect(Node.isNumericLiteral(exp.exported)).toBe(true);
        expect(exp.alias).toBe("prop");
    });

    it("should find element access expression used as cjs prop export", async () => {
        const exports = identifyExports(project.createSourceFile("tst.js", `
            module.exports["prop"] = 1;
        `));

        expect(exports).toHaveLength(1);

        const exp = atLeastOne(exports)[0];
        if (!isCJSPropExport(exp)) { throw new Error("Expected a CJS prop export"); }
        expect(Node.isNumericLiteral(exp.exported)).toBe(true);
        expect(exp.alias).toBe("prop");
    });

    it("should ignore dynamic cjs prop exports", async () => {
        const exports = identifyExports(project.createSourceFile("tst.js", `
            ["a", "b", "c"].forEach(x => module.exports[x] = 1);
        `));
        expect(exports).toHaveLength(0);
    });

    it("should identify an implementation of an overloaded function in TS", async () => {
        const exports = identifyExports(project.createSourceFile("tst.ts", `
            export function tst(val: number): number;
            export function tst(val: string): string;
            export function tst<T>(val: T): T { return val; }
        `));

        expect(exports).toHaveLength(1);

        const exp = atLeastOne(exports)[0];
        if (!isESMNamedExport(exp)) { throw new Error("Expected an ESM named export"); }
        expect(exp.alias).toBe("tst");

        if (!Node.isFunctionDeclaration(exp.exported)) { throw new Error("Expected a function declaration"); }
        expect(exp.exported.hasBody()).toBe(true);
    });
});
