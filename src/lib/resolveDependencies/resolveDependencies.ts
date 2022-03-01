import { Project, SourceFile } from "ts-morph";
import { isModuleResolutionWarning, ModuleResolutionWarning, ResolveModule } from "../resolveModule/resolveModule";
import {
    Export,
    getExportFile,
    identifyExports,
    isValueExport, ValueExport,
} from "./identifyExports";
import {
    ESMImportDefault,
    getImportFile,
    identifyImports,
    Import,
    ImportWarning,
    isESMImportDefault,
} from "./identifyImports";
import { unexpected } from "../guards";
import { describeNode } from "../findUsages/findUsages";

export type FilterImports = (predicate: (imp: Import) => boolean) => Import[];
export type FilterExports = (predicate: (exp: ValueExport) => boolean) => ValueExport[];
export type ResolveExportUses = (exp: ValueExport) => { imp: Import, aliasPath: string[] }[];

export type DependencyResolutionWarning = AmbiguousImportWarning | ImportWarning | ModuleResolutionWarning;
export type AmbiguousImportWarning = { type: "dependency-resolution-ambiguous-import", message: string, imp: ESMImportDefault, exp: Export };

export type ResolveDependencies = {
    filterImports: FilterImports,
    filterExports: FilterExports,
    resolveExportUses: ResolveExportUses,
    warnings: DependencyResolutionWarning[],
};

type Star = "*" & { __type: "star" };
const star: Star = "*" as never;
const isStar = (val: string): val is Star => val === "*";

// TODO: resolving dependencies needs optimization. Doing `.forEachDescendantAsArray()` over and over is expensive.
export const resolveDependencies = (project: Project, resolveModule: ResolveModule): ResolveDependencies => {
    const files = project.getSourceFiles();

    const allImports: Import[] = [];
    const allExports: Export[] = [];
    const exportsPerFile = new Map<string, Export[]>();

    const warnings: DependencyResolutionWarning[] = [];

    files.forEach(file => {
        const { imports, warnings: importWarnings } = identifyImports(file);
        warnings.push(...importWarnings);
        allImports.push(...imports);

        const exports = identifyExports(file);
        allExports.push(...exports);
        exportsPerFile.set(file.getFilePath(), exports);
    });

    const resolveExport = (exportName: string | Star, moduleSpecifier: string, originalImport: Import, file: SourceFile) => {
        const target = resolveModule(moduleSpecifier, file.getFilePath());
        if (!target) { return []; } // Targeting an external file, ignore

        if (isModuleResolutionWarning(target)) {
            warnings.push(target);
            return [];
        }

        const starRequested = isStar(exportName);
        const fileExports = exportsPerFile.get(target.getFilePath()) ?? [];
        return fileExports
            .map((exp): ({ exp: Export, key: string | Star, aliasPath: string[] })[] => {
                switch (exp.type) {
                    case "esm-default":
                        return starRequested || "default" === exportName
                            ? [{ exp, key: "default", aliasPath: starRequested ? ["default"] : [] }]
                            : [];

                    case "esm-named":
                        return starRequested || exp.alias === exportName
                            ? [{ exp, key: exp.alias, aliasPath: starRequested ? [exp.alias] : [] }]
                            : [];

                    case "esm-named-reexport":
                        return starRequested || exp.alias === exportName
                            ? resolveExport(exp.referencedExport, exp.moduleSpecifier, originalImport, target)
                                .map(e => ({ ...e, aliasPath: starRequested ? [exp.alias, ...e.aliasPath] : e.aliasPath }))
                            : [];

                    case "esm-reexport-star-as-named":
                        return starRequested || exp.alias === exportName
                            ? resolveExport(star, exp.moduleSpecifier, originalImport, target)
                                .map(e => ({ ...e, aliasPath: starRequested ? [exp.alias, ...e.aliasPath] : e.aliasPath }))
                            : [];

                    case "esm-reexport-star":
                        return resolveExport(exportName, exp.moduleSpecifier, originalImport, target);

                    case "cjs-overwrite":
                        if (isESMImportDefault(originalImport)) {
                            warnings.push({
                                type: "dependency-resolution-ambiguous-import",
                                message: `Ambiguous default ESM import of a CJS export.\nImport: ${ describeNode(originalImport.identifier) }\nExport file: ${ exp.exported.getSourceFile().getFilePath() }`,
                                imp: originalImport,
                                exp,
                            });

                            return [];
                        }

                        return [{ exp, key: star, aliasPath: [] }];

                    case "cjs-prop":
                        if (isESMImportDefault(originalImport)) {
                            warnings.push({
                                type: "dependency-resolution-ambiguous-import",
                                message: `Ambiguous default ESM import of a CJS export.\nImport: ${ describeNode(originalImport.identifier) }\nExport file: ${ exp.exported.getSourceFile().getFilePath() }`,
                                imp: originalImport,
                                exp,
                            });

                            return [];
                        }

                        return starRequested || exp.alias === exportName
                            ? [{ exp, key: exp.alias, aliasPath: starRequested ? [exp.alias] : [] }]
                            : [];

                    default:
                        return unexpected(exp);
               }
            })
            .reduce((a, b) => [...a, ...b], []);
    };

    // Per file — per export key — list of associated imports and their alias paths
    const index = new Map<string, Map<string, { imp: Import, aliasPath: string[] }[]>>();
    const set = (target: SourceFile, exportKey: string | Star, imp: Import, aliasPath: string[]) => {
        const fData = index.get(target.getFilePath()) ?? new Map<string, { imp: Import, aliasPath: string[] }[]>();
        index.set(target.getFilePath(), fData);

        const imports = fData.get(exportKey) ?? [];
        fData.set(exportKey, imports);

        imports.push({ imp, aliasPath });
    };

    allImports.forEach(imp => {
        switch (imp.type) {
            case "esm-default":
                return resolveExport("default", imp.moduleSpecifier, imp, getImportFile(imp)).forEach(e => set(getExportFile(e.exp), e.key, imp, e.aliasPath));

            case "esm-named":
                return resolveExport(imp.referencedExport, imp.moduleSpecifier, imp, getImportFile(imp)).forEach(e => set(getExportFile(e.exp), e.key, imp, e.aliasPath));

            case "cjs-import":
            case "esm-equals":
            case "esm-dynamic":
            case "esm-namespace":
                return resolveExport(star, imp.moduleSpecifier, imp, getImportFile(imp)).forEach(e => set(getExportFile(e.exp), e.key, imp, e.aliasPath));

            default:
                return unexpected(imp);
        }
    });

    return {
        filterImports: predicate => allImports.filter(predicate),
        filterExports: predicate => allExports.filter(isValueExport).filter(predicate),
        resolveExportUses: exp => {
            const fileExports = index.get(getExportFile(exp).getFilePath());
            switch (exp.type) {
                case "cjs-prop":
                case "esm-named":
                    return fileExports?.get(exp.alias) ?? [];

                case "esm-default":
                    return fileExports?.get("default") ?? [];

                case "cjs-overwrite":
                    return fileExports?.get(star) ?? [];

                default:
                    return unexpected(exp);
            }
        },

        get warnings() { return [...warnings]; },
    };
};
