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
import { isEither, isNotNull, unexpected } from "../guards";

export interface ComponentDeclaration {
    // Component declaration. Either a functional component, so an arrow or `function`, or a class component
    declaration: ArrowFunction | FunctionDeclaration | FunctionExpression | ClassDeclaration | ClassExpression,
    identifier?: Identifier, // Identifier does not exists for inline declaration, e.g. `higherOrder(() => <div/>)`
}

const isPossibleSnowflakeDeclaration = isEither(
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
const isBuiltInJsx = (node: Node) => {
    if (!isJSXElement(node)) { return false; }

    const tag = node.getTagNameNode();
    if (!Node.isIdentifier(tag)) { return false; }

    const firstChar = tag.getText().charAt(0);
    return firstChar.toLowerCase() === firstChar; // Lowercase first character denotes dom tag
};

export function detectSnowflakes(file: SourceFile): ReadonlyArray<ComponentDeclaration> {
    const detectedSnowflakes = file
        .forEachDescendantAsArray()
        .filter(isPossibleSnowflakeDeclaration)
        .map(declaration => {
            // If there's no JSX inside the declaration — ignore.
            // It's either something entirely unrelated, or a compositional component.
            if (!declaration.forEachDescendantAsArray().some(isBuiltInJsx)) { return null; }

            if (Node.isFunctionDeclaration(declaration)) {
                return {
                    declaration,
                    identifier: declaration.getNameNode(),
                };
            }

            if (Node.isFunctionExpression(declaration) || Node.isArrowFunction(declaration)) {
                return {
                    declaration,
                    identifier: variableIdentifierIfExists(declaration),
                };
            }

            if (Node.isClassDeclaration(declaration) || Node.isClassExpression(declaration)) {
                const render = declaration.getInstanceMember("render");

                // No render in the class or it's not a method — not a component
                if (!render || !Node.isMethodDeclaration(render)) { return null; }

                // No JSX in render — ignore
                if (!render.forEachDescendantAsArray().some(isBuiltInJsx)) { return null; }

                return {
                    declaration,
                    identifier: declaration.getNameNode() || variableIdentifierIfExists(declaration),
                };
            }

            return unexpected(declaration);
        })
        .filter(isNotNull);

    return detectedSnowflakes.filter(({ declaration }) => detectedSnowflakes.every(other => {
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
