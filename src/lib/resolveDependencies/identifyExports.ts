import { ExportDeclaration, ExportSpecifier, NamespaceExport, Node, SourceFile, Symbol as TSSymbol } from "ts-morph";
import {
    atLeastOne,
    Guard,
    isEither,
    isNotNull,
    isNotUndefined,
    objectValues,
    unexpected,
} from "../guards";
import { describeNode } from "../findUsages/findUsages";

export type Export = ValueExport | Reexport;

export type ValueExport = ESMDefaultExport | ESMNamedExport | CJSOverwriteExport | CJSPropExport;
export type Reexport = ESMReexportStar | ESMReexportStarAsNamed | ESMNamedReexport;

// module.exports = <exported node>
export type CJSOverwriteExport = { type: "cjs-overwrite", exported: Node };
export const isCJSOverwriteExport = (exp: Export): exp is CJSOverwriteExport => exp.type === "cjs-overwrite";

// module.exports.name = <exported node>
export type CJSPropExport = { type: "cjs-prop", alias: string, exported: Node };
export const isCJSPropExport = (exp: Export): exp is CJSPropExport => exp.type === "cjs-prop";

// export default <exported node>
export type ESMDefaultExport = { type: "esm-default", exported: Node };
export const isESMDefaultExport = (exp: Export): exp is ESMDefaultExport => exp.type === "esm-default";

// export function <identifier>() {...}
// export const <identifier> = ..., <identifier> = ...;
export type ESMNamedExport = { type: "esm-named", alias: string, exported: Node };
export const isESMNamedExport = (exp: Export): exp is ESMNamedExport => exp.type === "esm-named";

// export * from "blah"
export type ESMReexportStar = { type: "esm-reexport-star", moduleSpecifier: string, declaration: ExportDeclaration };
export const isESMReexportStar = (exp: Export): exp is ESMReexportStar => exp.type === "esm-reexport-star";

// export * as alias from "blah"
export type ESMReexportStarAsNamed = { type: "esm-reexport-star-as-named", moduleSpecifier: string, alias: string, declaration: NamespaceExport };
export const isESMReexportStarAsNamed = (exp: Export): exp is ESMReexportStarAsNamed => exp.type === "esm-reexport-star-as-named";

// export { val as alias } from "blah"
export type ESMNamedReexport = { type: "esm-named-reexport", moduleSpecifier: string, alias: string, referencedExport: string, declaration: ExportSpecifier };
export const isESMNamedReexport = (exp: Export): exp is ESMNamedReexport => exp.type === "esm-named-reexport";

const valueExportGuards: { [P in ValueExport["type"]]: Guard<Export, Extract<ValueExport, { type: P }>> } = {
    "esm-default": isESMDefaultExport,
    "esm-named": isESMNamedExport,
    "cjs-overwrite": isCJSOverwriteExport,
    "cjs-prop": isCJSPropExport,
};
export const isValueExport = isEither(...objectValues(valueExportGuards));

const reexportGuards: { [P in Reexport["type"]]: Guard<Export, Extract<Reexport, { type: P }>> } = {
    "esm-reexport-star": isESMReexportStar,
    "esm-reexport-star-as-named": isESMReexportStarAsNamed,
    "esm-named-reexport": isESMNamedReexport,
};
export const isReexport = isEither(...objectValues(reexportGuards));

const isExport = isEither(
    Node.isNamedExports,
    Node.isNamespaceExport,
    Node.isExportAssignment,
    Node.isExportSpecifier,
    Node.isExportDeclaration,
);
const isExportOrExportable = isEither(Node.isExportable, isExport);
function findExportedDeclaration(symbol: TSSymbol, file: SourceFile) {
    const declarations = symbol.getDeclarations()
        .filter(declaration => isExportOrExportable(declaration) || declaration.getAncestors().some(isExportOrExportable))
        .filter(declaration => declaration.getSourceFile() === file)
        .filter(declaration => !Node.isFunctionDeclaration(declaration) || declaration.hasBody());

    if (declarations.length === 0) { return null; }
    if (declarations.length > 1) {
        throw new Error(`Implementation error: Expected no more than one declaration for an export symbol ${ symbol.getName() } in ${ file.getFilePath() }, got ${ declarations.length } instead`);
    }

    const declaration = atLeastOne(declarations)[0];
    const exported = Node.isExpressionable(declaration) || Node.isExpressioned(declaration) ? declaration.getExpression() : declaration;
    if (!exported) {
        throw new Error(`Could not find expression for declaration: ${ describeNode(declaration) }`);
    }

    if (Node.isExportSpecifier(exported)) {
        return exported.getNameNode();
    }

    if (Node.isIdentifier(exported)) {
        exported.getDefinitions();
    }

    return exported;
}

export function identifyExports(file: SourceFile): Export[] {
    const cjsExportParents = file.forEachDescendantAsArray()
        .filter(Node.isPropertyAccessExpression)
        .filter(node => node.getText({ trimLeadingIndentation: true, includeJsDocComments: false }) === "module.exports")
        .map(node => {
            const parent = node.getParent();
            if (!parent) { return null; }
            return { node, parent };
        })
        .filter(isNotNull);

    const cjsOverwrites = cjsExportParents
        .map(({ node, parent }) => {
            if (!Node.isBinaryExpression(parent)) { return null; }
            return { node, binaryExp: parent };
        })
        .filter(isNotNull)
        .filter(({ node, binaryExp }) => binaryExp.getOperatorToken().getKindName() === "EqualsToken" && binaryExp.getLeft() === node)
        .map(({ binaryExp }): CJSOverwriteExport => ({ type: "cjs-overwrite", exported: binaryExp.getRight() }));

    const cjsPropAssignments = cjsExportParents
        .map(({ parent }) => {
            if (!Node.isPropertyAccessExpression(parent)) { return null; }

            const binaryExp = parent.getParent();
            if (!binaryExp || !Node.isBinaryExpression(binaryExp)) { return null; }

            return { propAccess: parent, binaryExp };
        })
        .filter(isNotNull)
        .map(({ propAccess, binaryExp }): CJSPropExport => ({ type: "cjs-prop", alias: propAccess.getName(), exported: binaryExp.getRight() }));

    const cjsElementAccessAssignments = cjsExportParents
        .map(({ node, parent }) => {
            if (!Node.isElementAccessExpression(parent)) { return null; }

            const binaryExp = parent.getParent();
            if (!binaryExp || !Node.isBinaryExpression(binaryExp)) { return null; }

            const argument = parent.getArgumentExpression();
            if (!argument) { throw new Error(`No argument found on element access expression ${ describeNode(node) }`); }

            if (!Node.isStringLiteral(argument) && !Node.isNumericLiteral(argument) && !Node.isNoSubstitutionTemplateLiteral(argument)) {
                return null;
            }

            return { argument, binaryExp };
        })
        .filter(isNotNull)
        .map(({ argument, binaryExp }): CJSPropExport => ({ type: "cjs-prop", alias: argument.getLiteralText(), exported: binaryExp.getRight() }));

    const exportSymbols = file.getExportSymbols()
        .map((symbol): Export | null => {
            const exportDeclarations = symbol.getDeclarations()
                .map(dec => dec.getAncestors().find(Node.isExportDeclaration))
                .filter(isNotUndefined);

            if (exportDeclarations.length && exportDeclarations.some(d => d.getModuleSpecifierValue())) {
                return null; // Reexport, handled below
            }

            const exported = findExportedDeclaration(symbol, file);
            if (!exported) { return null; }

            if (Node.isTypeAliasDeclaration(exported) || Node.isInterfaceDeclaration(exported)) {
                return null; // Ignore the type exports
            }

            if (symbol.getName() === "default") {
                return {
                    type: "esm-default",
                    exported,
                };
            }

            return {
                type: "esm-named",
                alias: symbol.getName(),
                exported,
            };
        })
        .filter(isNotNull);

    const exportDeclarations = file.getExportDeclarations()
        .map((exportDeclaration): Export[] | null => {
            if (exportDeclaration.isTypeOnly()) { return null; } // Only interested in value exports

            const moduleSpecifier = exportDeclaration.getModuleSpecifierValue();
            if (!moduleSpecifier) { return null; } // Not a reexport, should have been handled with the symbols

            const namespaceExport = exportDeclaration.getNamespaceExport();
            if (namespaceExport) {
                return [{
                    type: "esm-reexport-star-as-named",
                    alias: namespaceExport.getName(),
                    declaration: namespaceExport,
                    moduleSpecifier,
                }];
            }

            const namedExports = exportDeclaration.getNamedExports();
            if (namedExports.length === 0) {
                return [{
                    type: "esm-reexport-star",
                    declaration: exportDeclaration,
                    moduleSpecifier,
                }];
            }

            return namedExports.map((namedExportSpecifier): ESMNamedReexport => ({
                type: "esm-named-reexport",
                alias: namedExportSpecifier.getAliasNode()?.getText() ?? namedExportSpecifier.getName(),
                referencedExport: namedExportSpecifier.getName(),
                declaration: namedExportSpecifier,
                moduleSpecifier,
            }));
        })
        .filter(isNotNull)
        .reduce((a, b) => [...a, ...b], []);

    return [...exportSymbols, ...exportDeclarations, ...cjsOverwrites, ...cjsPropAssignments, ...cjsElementAccessAssignments];
}

export const getExportFile = (exp: Export): SourceFile => {
    switch (exp.type) {
        case "esm-named":
        case "esm-default": return exp.exported.getSourceFile();

        case "esm-reexport-star":
        case "esm-named-reexport":
        case "esm-reexport-star-as-named": return exp.declaration.getSourceFile();

        case "cjs-prop":
        case "cjs-overwrite": return exp.exported.getSourceFile();

        default:
            return unexpected(exp);
    }
};
