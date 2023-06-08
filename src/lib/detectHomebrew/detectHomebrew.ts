import {
    ArrowFunction,
    ClassDeclaration,
    ClassExpression,
    FunctionDeclaration,
    FunctionExpression,
    Identifier,
    Node,
    SourceFile,
} from "ts-morph";
import { isEither, isNotNull, objectKeys, unexpected } from "../guards";

const builtinJsxReason = "builtin-lowercase-jsx";
export interface ComponentDeclaration {
    // Component declaration. Either a functional component, so an arrow or `function`, or a class component
    declaration: ArrowFunction | FunctionDeclaration | FunctionExpression | ClassDeclaration | ClassExpression,
    identifier?: Identifier, // Identifier does not exists for inline declaration, e.g. `higherOrder(() => <div/>)`

    // Reason why the component counts as homebrew:
    // either because it contains a built-in jsx tag,
    // or a name of a css-in-js lib generating dom elements.
    detectionReason: (typeof builtinJsxReason) | string,
}

const isPossibleComponentDeclaration = isEither(
    Node.isFunctionDeclaration,
    Node.isFunctionExpression,
    Node.isArrowFunction,
    Node.isClassDeclaration,
    Node.isClassExpression,
);

const isJSXElement = isEither(
    Node.isJsxOpeningElement,
    Node.isJsxSelfClosingElement,
);
const isBuiltInJsx = (node: Node): node is Node => {
    if (!isJSXElement(node)) { return false; }

    const tag = node.getTagNameNode();
    if (!Node.isIdentifier(tag)) { return false; }

    const firstChar = tag.getText().charAt(0);
    return firstChar.toLowerCase() === firstChar; // Lowercase first character denotes dom tag
};

export function detectHomebrew(file: SourceFile, knownPrimitiveUsages: Record<string, Set<Node>>): ReadonlyArray<ComponentDeclaration> {
    const findSetName = (node: Node) => {
        const matchingSet = objectKeys(knownPrimitiveUsages).find(k => knownPrimitiveUsages[k]?.has(node) ?? false);
        if (!matchingSet) { throw new Error(`Cant find a matching set for a node: ${ node.print() }`); }
        return matchingSet;
    };

    const allKnownPrimitiveUsages = new Set(objectKeys(knownPrimitiveUsages).flatMap(k => [...knownPrimitiveUsages[k]?.values() ?? []]));
    const isKnownPrimitiveUsage = (node: Node): node is Node => allKnownPrimitiveUsages.has(node);
    const isPrimitiveUsage = isEither(isKnownPrimitiveUsage, isBuiltInJsx);
    const detectionReason = (node: Node) => isBuiltInJsx(node) ? builtinJsxReason : findSetName(node);

    const detectedComponents = file
        .forEachDescendantAsArray()
        .filter(isPossibleComponentDeclaration)
        .map(declaration => {
            // If there's no JSX inside the declaration — ignore.
            // It's either something entirely unrelated, or a compositional component.
            const domReference = declaration.forEachDescendantAsArray().find(isPrimitiveUsage);
            if (!domReference) { return null; }

            if (Node.isFunctionDeclaration(declaration)) {
                return {
                    declaration,
                    identifier: declaration.getNameNode(),
                    detectionReason: detectionReason(domReference),
                };
            }

            if (Node.isFunctionExpression(declaration) || Node.isArrowFunction(declaration)) {
                return {
                    declaration,
                    identifier: variableIdentifierIfExists(declaration),
                    detectionReason: detectionReason(domReference),
                };
            }

            if (Node.isClassDeclaration(declaration) || Node.isClassExpression(declaration)) {
                const render = declaration.getInstanceMember("render");

                // No render in the class, or it's not a method — not a component
                if (!render || !Node.isMethodDeclaration(render)) { return null; }

                // No JSX in render — ignore
                const renderSpecificDomReference = render.forEachDescendantAsArray().find(isPrimitiveUsage);
                if (!renderSpecificDomReference) { return null; }

                return {
                    declaration,
                    identifier: declaration.getNameNode() || variableIdentifierIfExists(declaration),
                    detectionReason: detectionReason(renderSpecificDomReference),
                };
            }

            return unexpected(declaration);
        })
        .filter(isNotNull);

    return detectedComponents.filter(({ declaration }) => detectedComponents.every(other => {
        if (other.declaration === declaration) { return true; }
        const match = declaration.getParentWhile(parent => parent !== other.declaration);
        return !match || Node.isSourceFile(match);
    }));
}

function variableIdentifierIfExists(node: Node): Identifier | undefined {
    const parent = node.getParent();
    if (Node.isCallExpression(parent)) { return variableIdentifierIfExists(parent); }

    if (!Node.isVariableDeclaration(parent)) { return undefined; }
    const nameNode = parent.getNameNode();

    if (Node.isArrayBindingPattern(nameNode)) { return undefined; } // TODO: warn
    if (Node.isObjectBindingPattern(nameNode)) { return undefined; } // TODO: warn. Currently triggers because of https://github.com/storybookjs/storybook/blob/215a21288fb09c4ca3ff56ab8fe7b4265ed04b1e/lib/ui/src/components/sidebar/SearchResults.tsx#L103
    return nameNode;
}
