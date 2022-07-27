import { Merge } from "ts-toolbelt/out/Union/Merge";
import { Import } from "../resolveDependencies/identifyImports";
import { Usage } from "../findUsages/findUsages";

type Target = string;
export type MultiTargetModuleOrPath = { [targetName: Target]: RegExp };

type StatsConfigBase = {
    isIgnoredFile?: RegExp,
    isTargetModuleOrPath: RegExp | MultiTargetModuleOrPath,
    isTargetImport?: (imp: Import) => boolean,
    isValidUsage?: (use: Usage & { type: "homebrew" | Target }) => boolean,
    subprojectPath?: string,
};

type ExclusiveConfigPaths = { tsconfigPath?: null, jsconfigPath?: null }
    | { tsconfigPath: string }
    | { jsconfigPath: string };

export type StatsConfig = StatsConfigBase & ExclusiveConfigPaths;
export type ResolvedStatsConfig = Required<Merge<StatsConfig>>;


export type UsageStat = {
    type: "homebrew" | Target,
    name: string,

    imported_from: string,
    target_node_file: string,
    usage_file: string,

    // author: string, // TODO: implement
};
