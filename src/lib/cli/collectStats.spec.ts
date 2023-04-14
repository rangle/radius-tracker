import { collectStats } from "./collectStats";
import { resolveStatsConfig } from "./resolveStatsConfig";
import { InMemoryFileSystemHost } from "ts-morph";
import { StatsConfig } from "./sharedTypes";

const noop = () => void 0;
describe("Collect stats", () => {
    let config: StatsConfig;
    let filesystem: InMemoryFileSystemHost;

    beforeEach(() => {
        filesystem = new InMemoryFileSystemHost();
        config = { isTargetModuleOrPath: /target/ };
    });

    it("should return empty stats for an empty folder", async () => {
        const stats = await collectStats(filesystem, resolveStatsConfig(config), noop, "/");
        expect(stats).toEqual([]);
    });

    it("should return homebrew stats", async () => {
        filesystem.writeFileSync("/component.jsx", `
            const Component = () => <div>Hello</div>;
            export const App = () => {
                return <Component />;
            }
        `);

        const stats = await collectStats(filesystem, resolveStatsConfig(config), noop, "/");
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
        const stats = await collectStats(filesystem, resolveStatsConfig(config), noop, "/");
        expect(stats).toEqual([]);
    });

    it("should return target stats", async () => {
        filesystem.writeFileSync("app.jsx", `
            import { Component } from "target";
            export const App = () => {
                return <Component />;
            }
        `);
        const stats = await collectStats(filesystem, resolveStatsConfig(config), noop, "/");
        expect(stats.filter(x => x.source === "target")).toHaveLength(1);
    });
});
