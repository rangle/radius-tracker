export * as tsMorph from "ts-morph"; // Re-export ts-morph, so that the consumers run exactly the same version

export type {
    FilterExports,
    FilterImports,
    ResolveExportUses,
    ResolveDependencies,
    DependencyResolutionWarning,
} from "./resolveDependencies/resolveDependencies";

export type {
    Export,
    ValueExport,
    Reexport,
    CJSOverwriteExport,
    CJSPropExport,
    ESMDefaultExport,
    ESMNamedExport,
    ESMReexportStar,
    ESMReexportStarAsNamed,
    ESMNamedReexport,
} from "./resolveDependencies/identifyExports";

export type {
    Import,
    ESMImportEquals,
    ESMImportDefault,
    ESMImportNamespace,
    ESMImportNamed,
    ESMImportDynamic,
    CJSImport,
    ImportWarning,
} from "./resolveDependencies/identifyImports";

export type { ResolveModule } from "./resolveModule/resolveModule";

export type {
    Trace,
    TraceExport,
    TraceImport,
    TraceHoc,
    TraceRef,
    Usage,
    FindUsages,
    FindUsageWarning,
} from "./findUsages/findUsages";

export {
    getImportNode,
    getImportFile,
    isESMImportEquals,
    isESMImportDefault,
    isESMImportNamespace,
    isESMImportNamed,
    isESMImportDynamic,
    isCJSImport,
} from "./resolveDependencies/identifyImports";

export {
    isCJSOverwriteExport,
    isCJSPropExport,
    isESMDefaultExport,
    isESMNamedExport,
    isESMReexportStar,
    isESMReexportStarAsNamed,
    isESMNamedReexport,
    isValueExport,
    isReexport,
    getExportFile,
} from "./resolveDependencies/identifyExports";

export { detectSnowflakes } from "./detectSnowflakes/detectSnowflakes";
export { resolveDependencies } from "./resolveDependencies/resolveDependencies";
export { setupModuleResolution } from "./resolveModule/resolveModule";
export { setupFindUsages, getTraceNode } from "./findUsages/findUsages";

export { SUPPORTED_FILE_TYPES } from "./supportedFileTypes";

export { defaultIgnoreFileRe, defaultIsTargetImport } from "./cli/resolveStatsConfig";
