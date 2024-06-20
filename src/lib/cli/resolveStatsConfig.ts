import {
    hasProp,
    isFunction,
    isNull,
    isObjectOf,
    isRegexp,
    isString,
    objectKeys,
    objectValues,
    StringKeys,
} from "../guards";
import { ResolvedStatsConfig, StatsConfig } from "./sharedTypes";

const isIgnoredFileKey: StringKeys<StatsConfig> = "isIgnoredFile";
const hasIsIgnoredFile = hasProp(isIgnoredFileKey);

const isTargetModuleOrPathKey: StringKeys<StatsConfig> = "isTargetModuleOrPath";
const hasIsTargetModuleOrPath = hasProp(isTargetModuleOrPathKey);

const isTargetImportKey: StringKeys<StatsConfig> = "isTargetImport";
const hasIsTargetImport = hasProp(isTargetImportKey);
export const defaultIsTargetImport: ResolvedStatsConfig["isTargetImport"] = imp => {
    if (imp.type !== "esm-named") { return true; }

    const namedIdentifierText = imp.identifier.getText();

    const firstChar = namedIdentifierText[0];
    if (firstChar && firstChar.toLowerCase() === firstChar) { return false; } // Exclude named imports starting with a lowercase — not a component
    if (namedIdentifierText.toUpperCase() === namedIdentifierText) { return false; } // Exclude all-caps named imports, likely a constant

    return true;
};

const isValidUsageKey: StringKeys<StatsConfig> = "isValidUsage";
const hasIsValidUsage = hasProp(isValidUsageKey);

const subprojectPathKey: StringKeys<StatsConfig> = "subprojectPath";
const hasSubprojectPath = hasProp(subprojectPathKey);
export const defaultSubprojectPath = "/";

const tsconfigPathKey: StringKeys<StatsConfig> = "tsconfigPath";
const hasTsconfigPath = hasProp(tsconfigPathKey);

const jsconfigPathKey: StringKeys<StatsConfig> = "jsconfigPath";
const hasJsconfigPath = hasProp(jsconfigPathKey);

const domReferenceFactoriesKey: StringKeys<StatsConfig> = "domReferenceFactories";
const hasDomReferenceFactories = hasProp(domReferenceFactoriesKey);

const isStringRegexRecord = isObjectOf(isString, isRegexp);

export const defaultDomReferenceFactories = {
    "styled-components": /styled-components/,
    "stitches": /^@stitches/,
    "emotion": /^@emotion\/styled/,
};

export const defaultIgnoreFileRe = /((\.(tests?|specs?|stories|story)\.)|(\/(tests?|specs?|stories|story)\/)|(\/node_modules\/)|(\/__mocks__\/)|(\.d\.ts$))/;
export const resolveStatsConfig = (config: StatsConfig | unknown): ResolvedStatsConfig => {
    const subprojectPath = hasSubprojectPath(config) && config.subprojectPath ? config.subprojectPath : defaultSubprojectPath;
    if (!isString(subprojectPath)) { throw new Error(`Expected a string subproject path, got: ${ subprojectPath }`); }

    const tsconfigPath = hasTsconfigPath(config) ? config.tsconfigPath : null;
    if (!isString(tsconfigPath) && !isNull(tsconfigPath)) { throw new Error(`Expected a string | null tsconfigPath, got: ${ tsconfigPath }`); }

    const jsconfigPath = hasJsconfigPath(config) ? config.jsconfigPath : null;
    if (!isString(jsconfigPath) && !isNull(jsconfigPath)) { throw new Error(`Expected a string | null jsconfigPath, got: ${ jsconfigPath }`); }

    const isIgnoredFile = hasIsIgnoredFile(config) && config.isIgnoredFile ? config.isIgnoredFile : defaultIgnoreFileRe;
    if (!isRegexp(isIgnoredFile)) { throw new Error(`Expected a regexp isIgnoredFile, got: ${ isIgnoredFile }`); }

    if (!hasIsTargetModuleOrPath(config)) { throw new Error("Expected the config to specify isTargetModuleOrPath regexp or set"); }
    const isTargetModuleOrPath = config.isTargetModuleOrPath;
    if (!isRegexp(isTargetModuleOrPath) && !isStringRegexRecord(isTargetModuleOrPath)) {
        throw new Error(`Expected a regexp or a set of regexp isTargetModuleOrPath, got: ${ isTargetModuleOrPath }`);
    }
    if (!isRegexp(isTargetModuleOrPath)) {
        if (objectValues(isTargetModuleOrPath).length === 0) {
            throw new Error("Expected a set of regexp in isTargetModuleOrPath to have at least one entry");
        }
        if (objectKeys(isTargetModuleOrPath).some(k => k === "homebrew")) {
            throw new Error("isTargetModuleOrPath set contains a 'homebrew' key. Homebrew is a reserved target.");
        }
    }

    const isTargetImport = hasIsTargetImport(config) && config.isTargetImport ? config.isTargetImport : defaultIsTargetImport;
    if (!isFunction(isTargetImport)) { throw new Error(`Expected isTargetImport to be a filter function if given, got: ${ isTargetImport }`); }

    const isValidUsage = hasIsValidUsage(config) && config.isValidUsage ? config.isValidUsage : () => true;
    if (!isFunction(isValidUsage)) { throw new Error(`Expected isTargetImport to be a filter function if given, got: ${ isTargetImport }`); }

    const domReferenceFactories = hasDomReferenceFactories(config) ? config.domReferenceFactories : defaultDomReferenceFactories;
    if (!isStringRegexRecord(domReferenceFactories)) {
        throw new Error(`Expected a set of regexps in domReferenceFactories, got: ${ domReferenceFactories }`);
    }

    return {
        subprojectPath,
        tsconfigPath,
        jsconfigPath,
        isIgnoredFile,
        isTargetModuleOrPath,
        isTargetImport: isTargetImport as ResolvedStatsConfig["isTargetImport"],
        isValidUsage: isValidUsage as ResolvedStatsConfig["isValidUsage"],
        domReferenceFactories,
    };
};
