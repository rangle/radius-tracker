import { collectStats, isFile, isSubprojectPathEmptyWarning, listFiles } from "./collectStats";
import { resolveStatsConfig } from "./resolveStatsConfig";
import { InMemoryFileSystemHost } from "ts-morph";
import { MultiTargetModuleOrPath, StatsConfig } from "./sharedTypes";
import { join } from "path";
import { atLeastOne } from "../guards";

const noop = () => void 0;
describe("Collect stats", () => {
    let config: StatsConfig;
    let filesystem: InMemoryFileSystemHost;

    beforeEach(() => {
        filesystem = new InMemoryFileSystemHost();
        config = { isTargetModuleOrPath: /target/ };
    });

    it("should return empty stats for an empty folder", async () => {
        const { stats } = await collectStats(filesystem, resolveStatsConfig(config), noop, "/");
        expect(stats).toEqual([]);
    });

    it("should return homebrew stats", async () => {
        filesystem.writeFileSync("/component.jsx", `
            const Component = () => <div>Hello</div>;
            export const App = () => {
                return <Component />;
            }
        `);

        const { stats } = await collectStats(filesystem, resolveStatsConfig(config), noop, "/");
        expect(stats.filter(x => x.source === "homebrew")).toHaveLength(1);
    });

    it("should ignore homebrew detections in files matching the target regexp", async () => {
        const filename = "component.jsx";
        filesystem.writeFileSync(`/${ filename }`, `
            const Component = () => <div>Hello</div>;
            export const App = () => {
                return <Component />;
            }
        `);

        config = { isTargetModuleOrPath: new RegExp(`.*${ filename }.*`) };
        const { stats } = await collectStats(filesystem, resolveStatsConfig(config), noop, "/");
        expect(stats).toEqual([]);
    });

    it("should return target stats", async () => {
        filesystem.writeFileSync("app.jsx", `
            import { Component } from "target";
            export const App = () => {
                return <Component />;
            }
        `);
        const { stats } = await collectStats(filesystem, resolveStatsConfig(config), noop, "/");
        expect(stats.filter(x => x.source === "target")).toHaveLength(1);
    });

    it("should return stats from multiple targets", async () => {
        const targets = ["one", "two", "three"];

        filesystem.writeFileSync("app.jsx", `
            ${ targets.map(t => `
                import * as ${ t } from "${ t }";
            `).join("\n") }
            export const App = () => <>
                ${ targets.map(t => `<${ t }.Component />`).join("\n") }
            </>;
        `);

        config = {
            isTargetModuleOrPath: targets.reduce((_set, t) => {
                _set[t] = new RegExp(t);
                return _set;
            }, {} as MultiTargetModuleOrPath),
        };

        const { stats } = await collectStats(filesystem, resolveStatsConfig(config), noop, "/");
        targets.forEach(t => {
            expect(stats.filter(x => x.source === t)).toHaveLength(1);
        });
    });

    it("should find homebrew components using a tag defined with a factory method", async () => {
        filesystem.writeFileSync("app.jsx", `
            import styled from 'styled-components';
            const Div = styled.div\`background: red\`;
            const Component = () => <Div>Hello, World!</Div>;
            export const App = () => <Component />;
        `);

        const { stats } = await collectStats(filesystem, resolveStatsConfig(config), noop, "/");
        expect(stats).toHaveLength(1);

        const stat = atLeastOne(stats)[0];
        expect(stat).toHaveProperty("source", "homebrew");
        expect(stat).toHaveProperty("homebrew_detection_reason", "styled-components");
        expect(stat).toHaveProperty("component_name", "Component");
    });

    it("should report warnings", async () => {
        config = { ...config, subprojectPath: "/does-not-exist" };
        const { warnings } = await collectStats(filesystem, resolveStatsConfig(config), noop, "/");

        expect(warnings).toHaveLength(1);

        const warning = atLeastOne(warnings)[0];
        expect(isSubprojectPathEmptyWarning(warning)).toBeTruthy();
    });
});

describe("collectStats fs helpers", () => {
    let filesystem: InMemoryFileSystemHost;

    beforeEach(() => {
        filesystem = new InMemoryFileSystemHost();
    });

    describe("listFiles", () => {
        it("should return a list of paths to all files in a given directory", async () => {
            const pathPrefix = "/dir/subdir";
            const expectedFiles = [
                "/deep/nested/file/a",
                "/deep/nested/file/b",
                "/deep/nested/c",
                "/deep/nested/d",
                "/deep/e",
                "/deep/f",
                "/another_dir/g",
                "/another_dir/h",
                "/root_i",
                "/root_j",
            ].map(f => join(pathPrefix, f));
            expectedFiles.forEach(f => filesystem.writeFileSync(f, ""));

            const files = listFiles(filesystem, pathPrefix, () => true);
            expect(files.sort()).toEqual(expectedFiles.sort());
        });
    });

    describe("isFile", () => {
        it("should return true for a file that exists", async () => {
            const path = "/path/to/file";
            filesystem.writeFileSync(path, "");
            expect(isFile(filesystem, path)).toEqual(true);
        });

        it("should return false if the file does not exists", async () => {
            const path = "/path/to/file";
            expect(isFile(filesystem, path)).toEqual(false);
        });

        it("should return false if the path points to a directory", async () => {
            const path = "/path/to/directory";
            filesystem.writeFileSync(join(path, "file"), "");
            expect(isFile(filesystem, path)).toEqual(false);
        });
    });
});
