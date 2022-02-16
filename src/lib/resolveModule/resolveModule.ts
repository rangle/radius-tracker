import { Project, SourceFile, ts } from "ts-morph";
import { SUPPORTED_FILE_TYPES } from "../supportedFileTypes";

export type ResolveModule = (moduleName: string, containingFile: string) => SourceFile | null;
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

            throw new Error(`Could not resolve '${ moduleName }' referenced from '${ containingFile }'\nFailed resolutions: ${ JSON.stringify(resolved, null, 4) }`);
        }

        if (resolvedModule.isExternalLibraryImport) { return null; } // Assume unresolved files are external to the project
        return project.getSourceFileOrThrow(resolvedModule.resolvedFileName);
    };
};


