import { join } from "path";
import { Project } from "ts-morph";
import { ResolveModule, setupModuleResolution } from "./resolveModule";

describe("Resolve module", () => {
    let baseUrl: string;
    let project: Project;
    let resolveModule: ResolveModule;

    beforeEach(async () => {
        baseUrl = "./whatso/ever";
        project = new Project({ useInMemoryFileSystem: true, compilerOptions: { baseUrl } });
        resolveModule = setupModuleResolution(project, "/");
    });

    it("should return null for external library", async () => {
        project.createSourceFile("node_modules/third-party-lib/index.js", `
            export default "Hello";
        `);
        project.createSourceFile("tst.js", `
            import * as ThirdParty from 'third-party-lib';
        `);

        expect(resolveModule("third-party-lib", "tst.js")).toBe(null);
    });

    it("should return null for a specific external library file", async () => {
        project.createSourceFile("node_modules/third-party-lib/lib/file.js", `
            export default "Hello";
        `);
        project.createSourceFile("tst.js", `
            import * as ThirdParty from 'third-party-lib/lib/file.js';
        `);

        expect(resolveModule("third-party-lib/lib/file.js", "tst.js")).toBe(null);
    });

    it("should return null for missing specific external library file", async () => {
        project.createSourceFile("tst.js", `
            import * as ThirdParty from 'third-party-lib/lib/file.js';
        `);

        expect(resolveModule("third-party-lib/lib/file.js", "tst.js")).toBe(null);
    });

    it("should return null for non-code files", async () => {
        project.createSourceFile("styles.module.scss", `
            .someClass { background: red; }
        `);
        project.createSourceFile("tst.js", `
            import * as styles from './styles.module.scss';
        `);
        expect(resolveModule("./styles.module.scss", "tst.js")).toBe(null);
    });

    it("should resolve the relative module name", async () => {
        const targetSource = project.createSourceFile("target.js", `
            export const HELLO = "world";
        `);
        project.createSourceFile("dependant.js", `
            import { HELLO } from "./target.js";
            console.log(HELLO);
        `);
        expect(resolveModule("./target.js", "dependant.js")).toBe(targetSource);
    });

    it("should resolve the file specified relative to base url", async () => {
        const targetSource = project.createSourceFile(join(baseUrl, "target.js"), `
            export const HELLO = "world";
        `);
        project.createSourceFile("dependant.js", `
            import { HELLO } from "target.js";
            console.log(HELLO);
        `);
        expect(resolveModule("target.js", "dependant.js")).toBe(targetSource);
    });

    it("should warn if file requested by relative path can not be resolved", async () => {
        project.createSourceFile("dependant.js", `
            import { HELLO } from "./target.js";
        `);
        const res = resolveModule("./target.js", "dependant.js");
        expect(res).toHaveProperty("type", "module-resolution");
    });

    it("should warn if a file that exists on the filesystem is excluded from project sources", async () => {
        project.getFileSystem().writeFileSync("./file.js", "");

        project.createSourceFile("dependant.js", `
            import * from "./file.js";
        `);

        const res = resolveModule("./file.js", "dependant.js");
        expect(res).toHaveProperty("type", "module-resolution");
    });

    it("should return null for a resolved file of an unsupported format", async () => {
        project.getFileSystem().writeFileSync("./file.png", "");

        project.createSourceFile("dependant.js", `
            import url from "./file.png";
        `);

        const res = resolveModule("./file.png", "dependant.js");
        expect(res).toBe(null);
    });
});
