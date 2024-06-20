import { Merge } from "ts-toolbelt/out/Union/Merge";
import { Import } from "../resolveDependencies/identifyImports";
import { Usage } from "../findUsages/findUsages";

type Target = string;
export type MultiTargetModuleOrPath = { [targetName: Target]: RegExp };

type StatsConfigBase = {
    isIgnoredFile?: RegExp,
    isTargetModuleOrPath: RegExp | MultiTargetModuleOrPath,
    isTargetImport?: (imp: Import) => boolean,
    isValidUsage?: (use: Usage & { source: "homebrew" | Target }) => boolean,
    subprojectPath?: string,
    domReferenceFactories?: Record<string, RegExp>,
};

type ExclusiveConfigPaths = { tsconfigPath?: null, jsconfigPath?: null }
    | { tsconfigPath: string }
    | { jsconfigPath: string };

export type StatsConfig = StatsConfigBase & ExclusiveConfigPaths;
export type ResolvedStatsConfig = Required<Merge<StatsConfig>>;


export type UsageStat = {
    source: "homebrew" | Target,
    homebrew_detection_reason?: string, // Only specified when source is 'homebrew'

    component_name: string,

    imported_from: string,
    target_node_file: string,
    usage_file: string,

    // author: string, // TODO: implement
};
