import { CallExpression, Identifier, SourceFile, Node } from "ts-morph";
import { isNotNull, unexpected } from "../guards";
import { describeNode } from "../findUsages/findUsages";


export type Import = ESMImportEquals | ESMImportDefault | ESMImportNamed | ESMImportDynamic | ESMImportNamespace | CJSImport;

// import <identifier> = require("<moduleSpecifier>");
export type ESMImportEquals = { type: "esm-equals", identifier: Identifier, moduleSpecifier: string };
export const isESMImportEquals = (imp: Import): imp is ESMImportEquals => imp.type === "esm-equals";

// import <identifier> from "<moduleSpecifier>"
export type ESMImportDefault = { type: "esm-default", identifier: Identifier, moduleSpecifier: string };
export const isESMImportDefault = (imp: Import): imp is ESMImportDefault => imp.type === "esm-default";

// import * as <identifier> from "<moduleSpecifier>"
export type ESMImportNamespace = { type: "esm-namespace", identifier: Identifier, moduleSpecifier: string };
export const isESMImportNamespace = (imp: Import): imp is ESMImportNamespace => imp.type === "esm-namespace";

// import { <referencedExport> as <identifier> } from "<moduleSpecifier>"
export type ESMImportNamed = { type: "esm-named", identifier: Identifier, referencedExport: string, moduleSpecifier: string };
export const isESMImportNamed = (imp: Import): imp is ESMImportNamed => imp.type === "esm-named";

// await import("<moduleSpecifier>")
export type ESMImportDynamic = { type: "esm-dynamic", importCall: CallExpression, moduleSpecifier: string };
export const isESMImportDynamic = (imp: Import): imp is ESMImportDynamic => imp.type === "esm-dynamic";

// require("<moduleSpecifier>");
export type CJSImport = { type: "cjs-import", importCall: CallExpression, moduleSpecifier: string };
export const isCJSImport = (imp: Import): imp is CJSImport => imp.type === "cjs-import";

export function identifyImports(file: SourceFile): Import[] {
    const cjsRequires = file.forEachDescendantAsArray()
        .filter(Node.isCallExpression)
        .filter(call => {
            const exp = call.getExpression();
            if (!Node.isIdentifier(exp)) { return false; }
            return exp.getText({ trimLeadingIndentation: true, includeJsDocComments: false }) === "require";
        })
        .filter(call => !call.getAncestors().some(Node.isImportEqualsDeclaration))
        .map((callExpression): CJSImport => {
            const [moduleRef] = callExpression.getArguments();
            if (!moduleRef) { throw new Error(`Implementation error: Expected require call expression to have at least one argument. Reading ${ describeNode(callExpression) } in ${ file.getFilePath() }`); }

            if (!Node.isStringLiteral(moduleRef) && !Node.isNoSubstitutionTemplateLiteral(moduleRef)) { throw new Error(`Dynamic cjs require calls not supported. Reading ${ describeNode(callExpression) } in ${ file.getFilePath() }`); }
            return {
                type: "cjs-import",
                importCall: callExpression,
                moduleSpecifier: moduleRef.getLiteralValue(),
            };
        });

    const importDeclarations = file.getImportDeclarations()
        .map((imp): (Import | null)[] => {
            if (imp.isTypeOnly()) { return [null]; }

            const moduleSpecifier = imp.getModuleSpecifierValue();

            const dflt = imp.getDefaultImport();
            const dfltImport: ESMImportDefault | null = dflt
                ? { type: "esm-default", identifier: dflt, moduleSpecifier }
                : null;

            const namespace = imp.getNamespaceImport();
            const namespaceImport: ESMImportNamespace | null = namespace
                ? { type: "esm-namespace", identifier: namespace, moduleSpecifier }
                : null;

            const namedImports = imp.getNamedImports().map((named): ESMImportNamed => ({
                type: "esm-named",
                identifier: named.getAliasNode() ?? named.getNameNode(),
                referencedExport: named.getName(),
                moduleSpecifier,
            }));

            return [dfltImport, namespaceImport, ...namedImports];
        })
        .reduce((a, b) => [...a, ...b], [])
        .filter(isNotNull);

    const importEquals = file.forEachDescendantAsArray()
        .filter(Node.isImportEqualsDeclaration)
        .map((imp): ESMImportEquals => {
            const moduleReference = imp.getModuleReference();
            if (!Node.isExternalModuleReference(moduleReference)) { throw new Error(`Implementation error: Expected an external module reference. Reading ${ describeNode(imp) } in ${ file.getFilePath() }`); }

            const moduleName = moduleReference.getExpression();
            if (!Node.isStringLiteral(moduleName) && !Node.isNoSubstitutionTemplateLiteral(moduleName)) { throw new Error(`Dynamic imports not supported. Reading ${ describeNode(imp) } in ${ file.getFilePath() }`); }

            return {
                type: "esm-equals",
                identifier: imp.getNameNode(),
                moduleSpecifier: moduleName.getLiteralValue(),
            };
        });

    const dynamicImports = file.forEachDescendantAsArray()
        .filter(Node.isImportExpression)
        .map((importExpr): ESMImportDynamic => {
            const callExpression = importExpr.getParent();
            if (!Node.isCallExpression(callExpression)) { throw new Error(`Implementation error: Expected import expression parent to be a call expression. Reading ${ describeNode(callExpression) } in ${ file.getFilePath() }`); }

            const [moduleRef] = callExpression.getArguments();
            if (!moduleRef) { throw new Error(`Implementation error: Expected import call expression to have at least one argument. Reading ${ describeNode(callExpression) } in ${ file.getFilePath() }`); }

            if (!Node.isStringLiteral(moduleRef) && !Node.isNoSubstitutionTemplateLiteral(moduleRef)) { throw new Error(`Dynamic imports not supported. Reading ${ describeNode(callExpression) } in ${ file.getFilePath() }`); }
            return {
                type: "esm-dynamic",
                importCall: callExpression,
                moduleSpecifier: moduleRef.getLiteralValue(),
            };
        });

    return [...importEquals, ...importDeclarations, ...dynamicImports, ...cjsRequires];
}

export const getImportNode = (imp: Import): Node => {
    switch (imp.type) {
        case "cjs-import":
        case "esm-dynamic":
            return imp.importCall;

        case "esm-named":
        case "esm-equals":
        case "esm-default":
        case "esm-namespace":
            return imp.identifier;

        default:
            return unexpected(imp);
    }
};

export const getImportFile = (imp: Import): SourceFile => {
    return getImportNode(imp).getSourceFile();
};
