import { Project, SourceFile, ts } from "ts-morph";
import { SUPPORTED_FILE_TYPES } from "../supportedFileTypes";
import { hasProp } from "../guards";

export type ResolveModule = (moduleName: string, containingFile: string) => SourceFile | ModuleResolutionWarning | null;
export type ModuleResolutionWarning = { type: "module-resolution", message: string };

const hasType = hasProp("type");
const moduleResolutionType: ModuleResolutionWarning["type"] = "module-resolution";
export const isModuleResolutionWarning = (val: unknown): val is ModuleResolutionWarning => hasType(val) && val.type === moduleResolutionType;

export const setupModuleResolution = (project: Project, cwd: string): ResolveModule => {
    const realpath = project.getModuleResolutionHost().realpath;
    if (!realpath) { throw new Error("realpath not defined on module resolution host"); }

    const cache = ts.createModuleResolutionCache(cwd, realpath);
    const tsResolve = (moduleName: string, containingFile: string) => ts.resolveModuleName(moduleName, containingFile, project.getCompilerOptions(), project.getModuleResolutionHost(), cache);

    return (moduleName: string, containingFile: string) => {
        const resolved = tsResolve(moduleName, containingFile);
        const resolvedModule = resolved.resolvedModule;
        if (!resolvedModule) {
            if (!SUPPORTED_FILE_TYPES.some(ext => moduleName.endsWith(ext))) {
                return null;
            }

            if (!moduleName.startsWith(".")) { // TODO: this is not ideal, because missing project files resolved relative to baseurl would be considered external
                // Not a relative path
                return null;
            }

            const warning: ModuleResolutionWarning = {
                type: "module-resolution",
                message: `Could not resolve '${ moduleName }' referenced from '${ containingFile }'\nFailed resolutions: ${ JSON.stringify(resolved, null, 4) }`,
            };
            return warning;
        }

        if (resolvedModule.isExternalLibraryImport) { return null; }

        const f = project.getSourceFile(resolvedModule.resolvedFileName);
        if (!f) {
            if (!SUPPORTED_FILE_TYPES.some(ext => moduleName.endsWith(ext))) { // TODO: test when a supported file references an existing not supported file path
                return null;
            }

            throw new Error(`File not found: ${ resolvedModule.resolvedFileName }`);
        }

        return f;
    };
};


