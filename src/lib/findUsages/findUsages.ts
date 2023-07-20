import { CallExpression, Node, SpreadElement, VariableDeclaration } from "ts-morph";
import { ValueExport } from "../resolveDependencies/identifyExports";
import { getImportNode, Import } from "../resolveDependencies/identifyImports";
import { ResolveDependencies } from "../resolveDependencies/resolveDependencies";
import { atLeastOne, isEither, isNot, isNotNull, unexpected } from "../guards";

const getStatement = (node: Node) => Node.isStatement(node) ? node : node.getAncestors().find(Node.isStatement);
const printNode = (node: Node): string => {
    try {
        return node.print({ removeComments: true });
    } catch (_ignore) {
        const parent = node.getParent();
        if (!parent) { return node.getKindName(); }
        return `${ node.getKindName() } in ${ printNode(parent) }`;
    }
};
export const describeNode = (node: Node) => {
    const statement = getStatement(node);
    return `${ node.getKindName() } '${ printNode(node) }' in '${ statement ? printNode(statement) : "no statement" }'`;
};

export type Trace = TraceExport | TraceImport | TraceHoc | TraceRef;

export type TraceExport = { type: "export", exp: ValueExport };
export const isTraceExport = (trace: Trace): trace is TraceExport => trace.type === "export";

export type TraceImport = { type: "import", imp: Import };
export const isTraceImport = (trace: Trace): trace is TraceImport => trace.type === "import";

export type TraceHoc = { type: "higher-order", node: CallExpression };
export const isTraceHoc = (trace: Trace): trace is TraceHoc => trace.type === "higher-order";

export type TraceRef = { type: "ref", node: Node };
export const isTraceRef = (trace: Trace): trace is TraceRef => trace.type === "ref";

export const getTraceNode = (trace: Trace): Node => {
    switch (trace.type) {
        case "import": return getImportNode(trace.imp);
        case "export": return trace.exp.exported;
        case "higher-order": return trace.node;
        case "ref": return trace.node;
        default:
            return unexpected(trace);
    }
};

export type Usage = {
    use: Node,
    target: Node,
    trace: Trace[],
    aliasPath: string[],
};

export type FindUsageWarning = AmbiguousArraySpreadAssignmentWarning | UnhandledNodeType;
export type AmbiguousArraySpreadAssignmentWarning = { type: "find-usage-ambiguous-array-spread-assignment", message: string, spread: SpreadElement };
export type UnhandledNodeType = { type: "find-usage-unhandled-node-type", message: string, useCase: string, nodeKind: string, node: Node };

type ResolutionTarget = { node: Node, aliasPath: string[], suspendable: boolean };
type ResolvedTarget = (ResolutionTarget & { trace: Trace[], isPotentialUsage: boolean });


export type FindUsages = (component: Node) => { usages: Usage[], warnings: FindUsageWarning[] };

export function setupFindUsages(dependencies: ResolveDependencies): FindUsages {
    return function findUsages(component: Node): { usages: Usage[], warnings: FindUsageWarning[] } {
        const warnings: FindUsageWarning[] = [];
        const allUsages = follow(
            dependencies, {
                isPotentialUsage: false, // Initial node should not be counted as a usage
                node: component,
                aliasPath: [],
                trace: [],
                suspendable: false,
            },
            component,
            [],
            warning => warnings.push(warning),
        );

        const usages = Array.from(
            allUsages
                // Since nodes can be reached via different paths,
                // for each node pick the usages with the longest trace.
                .reduce((_usages, one) => {
                    const existing = _usages.get(one.use);
                    if (existing && existing.trace.length > one.trace.length) {
                        return _usages;
                    }

                    _usages.set(one.use, one);
                    return _usages;
                }, new Map<Node, Usage>())
                .values(),
        );

        return { usages, warnings };
    };
}


type Warn = (warning: FindUsageWarning) => void;
type FollowStrategy = (target: ResolutionTarget, dependencies: ResolveDependencies, warn: Warn) => ResolvedTarget[];

const followExport: FollowStrategy = (target, dependencies) => {
    const matchingExports = Array.from(dependencies.filterExports(exp => exp.exported === target.node));
    if (matchingExports.length > 1) { throw new Error(`Implementation error: Expected no more than 1 matching export for node: ${ describeNode(target.node) }`); }
    if (matchingExports.length === 0) { return []; } // Avoid following the exports

    const [exp] = atLeastOne(matchingExports);
    const itemImports = dependencies.resolveExportUses(exp);
    return itemImports.map(({ imp, aliasPath }): ResolvedTarget => ({
        node: getImportNode(imp),
        trace: [{ type: "import", imp }, { type: "export", exp }],
        aliasPath: [...aliasPath, ...target.aliasPath],
        isPotentialUsage: false, // Import is not a usage on its own
        suspendable: target.suspendable,
    }));
};

const isForLoopStatement = isEither(
    Node.isForStatement,
    Node.isForInStatement,
    Node.isForOfStatement,
);

// Is node on the left hand side a definition for an identifier?
const isIdentifierDefinitionParent = (node: Node, warn: Warn): boolean => {
    // These happen, but not valid definition parents
    if (Node.isCallExpression(node)) { return false; }
    if (Node.isPropertyAssignment(node)) { return false; }
    if (Node.isShorthandPropertyAssignment(node)) { return false; }
    if (Node.isPropertyAccessExpression(node)) { return false; }
    if (Node.isExportAssignment(node)) { return false; }
    if (Node.isExportSpecifier(node)) { return false; }
    if (Node.isArrayLiteralExpression(node)) { return false; }
    if (Node.isObjectLiteralExpression(node)) { return false; }
    if (Node.isElementAccessExpression(node)) { return false; }
    if (Node.isJsxClosingElement(node)) { return false; }
    if (Node.isJsxOpeningElement(node)) { return false; }
    if (Node.isJsxSelfClosingElement(node)) { return false; }
    if (Node.isJsxExpression(node)) { return false; }
    if (Node.isSpreadElement(node)) { return false; }
    if (Node.isSpreadAssignment(node)) { return false; }
    if (Node.isPrefixUnaryExpression(node)) { return false; }
    if (Node.isPostfixUnaryExpression(node)) { return false; }
    if (Node.isParenthesizedExpression(node)) { return false; }
    if (Node.isConditionalExpression(node)) { return false; }
    if (Node.isIfStatement(node)) { return false; }
    if (Node.isArrowFunction(node)) { return false; }
    if (Node.isReturnStatement(node)) { return false; }
    if (Node.isExpressionWithTypeArguments(node)) { return false; } // `extends <node>` clause in class declaration
    if (Node.isTypeQuery(node)) { return false; }
    if (Node.isQualifiedName(node)) { return false; }
    if (Node.isTypeOfExpression(node)) { return false; }
    if (Node.isJsxSpreadAttribute(node)) { return false; }
    if (Node.isAsExpression(node)) { return false; } // Type casts aren't used in identifier definitions
    if (Node.isTypeReference(node)) { return false; } // Type references aren't used in identifier definitions
    if (Node.isNewExpression(node)) { return false; }
    if (isForLoopStatement(node)) { return false; } // Loops are not definition parents, the variable declarations inside them are
    if (Node.isPropertyDeclaration(node)) { return false; }
    if (Node.isNonNullExpression(node)) { return false; }

    // These are valid definition parents
    if (Node.isBindingElement(node)) { return true; }
    if (Node.isImportSpecifier(node)) { return true; }
    if (Node.isImportClause(node)) { return true; }
    if (Node.isNamespaceImport(node)) { return true; }
    if (Node.isImportEqualsDeclaration(node)) { return true; }
    if (Node.isVariableDeclaration(node)) { return true; }
    if (Node.isClassDeclaration(node)) { return true; }
    if (Node.isParameterDeclaration(node)) { return true; }
    if (Node.isFunctionDeclaration(node)) { return true; }
    if (Node.isBinaryExpression(node)) { return true; }

    warn({
        type: "find-usage-unhandled-node-type",
        message: `Unhandled node ${ describeNode(node) }`,
        useCase: "isIdentifierDefinitionParent",
        nodeKind: node.getKindName(),
        node,
    });
    return false; // Not a definition node by default
};

// Is the node on the right hand side a valid usage position for a ref?
const isReferenceUsage = (node: Node, warn: Warn): boolean => {
    const parent = node.getParent();
    if (!parent) { return false; }

    const binaryExpressionAncestor = node.getAncestors().find(Node.isBinaryExpression);
    const binaryExpressionLeftHandSide = binaryExpressionAncestor?.getLeft();
    if (
        binaryExpressionAncestor
        && (binaryExpressionLeftHandSide === node || binaryExpressionLeftHandSide?.getDescendants().some(d => d === node))
        && binaryExpressionAncestor.getOperatorToken().getKindName().includes("EqualsToken")
    ) {
        // If node is on the left hand side of an assignment expression — it's not a usage
        return false;
    }

    if (Node.isExportAssignment(parent)) { return false; }
    if (Node.isExportSpecifier(parent)) { return false; }
    if (Node.isImportSpecifier(parent)) { return false; }
    if (Node.isImportClause(parent)) { return false; }
    if (Node.isNamespaceImport(parent)) { return false; }
    if (Node.isVariableDeclaration(parent)) { return false; } // Should follow the variable, but declaration itself is not a usage
    if (isForLoopStatement(parent)) { return false; } // Should follow the variable, but declaration in a loop is not a usage
    if (Node.isPropertyAssignment(parent)) { return false; }
    if (Node.isShorthandPropertyAssignment(parent)) { return false; }
    if (Node.isArrayLiteralExpression(parent)) { return false; }
    if (Node.isObjectLiteralExpression(parent)) { return false; }
    if (Node.isJsxClosingElement(parent)) { return false; }
    if (Node.isFunctionDeclaration(parent)) { return false; } // This happens for function overloads in TS
    if (Node.isTypeQuery(parent)) { return false; } // Usage in type queries shouldn't count
    if (Node.isQualifiedName(parent)) { return false; } // Usage in type queries shouldn't count
    if (Node.isPropertySignature(parent)) { return false; } // Usage in type definitions shouldn't count // TODO: test
    if (Node.isTypeOfExpression(parent)) { return false; } // Usage in `typeof <x>` JS expression shouldn't count
    if (Node.isTypeReference(parent)) { return false; } // Usage in `typeof <x>` JS expression shouldn't count
    if (Node.isNamedImports(parent)) { return false; } // `SyntaxList` case from https://github.com/excalidraw/excalidraw/blob/bf6d0eeef7ea73525484fe680fd72f46ab490d51/src/actions/actionMenu.tsx#L1 — can't reproduce in tests
    if (Node.isPropertyDeclaration(parent)) { return false; }
    if (Node.isNonNullExpression(parent)) { return false; } // Should follow the reference, but NonNull expression itself is not a usage

    if (Node.isJsxExpression(parent)) { return true; }
    if (Node.isJsxOpeningElement(parent)) { return true; }
    if (Node.isJsxSelfClosingElement(parent)) { return true; }
    if (Node.isCallExpression(parent)) { return true; }
    if (Node.isPropertyAccessExpression(parent)) { return true; }
    if (Node.isElementAccessExpression(parent)) { return true; }
    if (Node.isSpreadElement(parent)) { return true; }
    if (Node.isSpreadAssignment(parent)) { return true; }
    if (Node.isPrefixUnaryExpression(parent)) { return true; }
    if (Node.isPostfixUnaryExpression(parent)) { return true; }
    if (Node.isBinaryExpression(parent)) { return true; }
    if (Node.isParenthesizedExpression(parent)) { return true; }
    if (Node.isConditionalExpression(parent)) { return true; }
    if (Node.isParameterDeclaration(parent)) { return true; }
    if (Node.isIfStatement(parent)) { return true; }
    if (Node.isArrowFunction(parent)) { return true; }
    if (Node.isReturnStatement(parent)) { return true; }
    if (Node.isExpressionWithTypeArguments(parent)) { return true; } // `extends <node>` clause in class declaration
    if (Node.isJsxSpreadAttribute(parent)) { return true; }
    if (Node.isAsExpression(parent)) { return true; }
    if (Node.isBindingElement(parent)) { return true; }
    if (Node.isNewExpression(parent)) { return true; }

    warn({
        type: "find-usage-unhandled-node-type",
        message: `Unhandled parent node: ${ describeNode(parent as unknown as Node) } as parent of ${ describeNode(node) } in ${ node.getSourceFile().getFilePath() }`,
        useCase: "isReferenceUsage",
        nodeKind: parent.getKindName(),
        node: parent,
    });
    return true; // Consider node a usage by default
};

const isTypeDeclaration = isEither(Node.isTypeAliasDeclaration, Node.isInterfaceDeclaration);
const shouldFollowRef = (node: Node) => {
    if (Node.isCommentNode(node) || node.getAncestors().some(Node.isCommentNode)) { return false; } // Ignore anything in comments
    if (Node.isJSDoc(node) || node.getAncestors().some(Node.isJSDoc)) { return false; } // Ignore anything in JSDocs
    if (isTypeDeclaration(node) || node.getAncestors().some(isTypeDeclaration)) { return false; } // Anything inside type declaration shouldn't be considered

    return true;
};

const followRefs: FollowStrategy = ({ node, aliasPath, suspendable }, _, warn) => {
    if (!Node.isIdentifier(node)) { return []; }

    const parent = node.getParent();
    if (!parent || !isIdentifierDefinitionParent(parent, warn)) { return []; }

    // `findReferences` sometimes finds refs in other files, but not reliably.
    // We're limiting the search to references in same source file, because
    // following exports is a more precise way to navigate between files.
    const localReferences = (Node.isReferenceFindable(node) ? node.findReferencesAsNodes() : [])
        .filter(ref => ref.getSourceFile() === node.getSourceFile())
        .filter(shouldFollowRef)
        .filter(ref => ref !== node);

    return localReferences.map((ref): ResolvedTarget => ({
        node: ref,
        aliasPath,
        trace: [],
        isPotentialUsage: isReferenceUsage(ref, warn),
        suspendable,
    }));
};

const followParent: FollowStrategy = ({ node, aliasPath, suspendable }, _dependencies, warn): ReturnType<FollowStrategy> => {
    if (Node.isStatement(node)) { return []; }

    const parent = node.getParent();
    if (!parent) { return []; }
    if (Node.isTypeReference(parent)) { return []; } // If parent is a type reference — we're moving into type side of things, and shouldn't follow
    if (Node.isJsxOpeningElement(parent) || Node.isJsxClosingElement(parent) || Node.isJsxSelfClosingElement(parent)) {
        // Don't follow up from a JSX tag — nothing is a more concrete usage point than a JSX tag,
        // unless this the JSX tag is wrapped in suspense, in which case it's a transparent wrapper.
        const grandparent = parent.getParent();
        if (suspendable && Node.isJsxElement(grandparent) && grandparent.getOpeningElement().getTagNameNode().getText().includes("Suspense")) {
            return [{
                node: grandparent,
                aliasPath,
                trace: [],
                isPotentialUsage: false,
                suspendable: false, // Wrapped in suspend — usage no longer itself suspendable
            }];
        }

        return [];
    }

    if (Node.isPropertyAssignment(node) || Node.isShorthandPropertyAssignment(node)) {
        return [{
            node: parent,
            aliasPath: [node.getName(), ...aliasPath],
            trace: [{ type: "ref", node }],
            isPotentialUsage: false,
            suspendable,
        }];
    }

    if (Node.isArrayLiteralExpression(parent)) {
        const nodeIdx = parent.getElements().findIndex(el => el === node);

        const firstSpread = parent.getElements().find(Node.isSpreadElement);
        const firstSpreadIdx = firstSpread ? parent.getElements().indexOf(firstSpread) : -1;
        if (firstSpread && firstSpreadIdx !== -1 && firstSpreadIdx < nodeIdx) {
            warn({
                type: "find-usage-ambiguous-array-spread-assignment",
                message: `Can not follow array declaration with rest expression before target: ${ describeNode(firstSpread) }`,
                spread: firstSpread,
            });
            return [];
        }

        if (nodeIdx === -1) { throw new Error(`Could not find ${ describeNode(node) } in ${ describeNode(parent) }`); }
        return [{
            node: parent,
            aliasPath: [String(nodeIdx), ...aliasPath],
            trace: [{ type: "ref", node }],
            isPotentialUsage: false,
            suspendable,
        }];
    }

    if (Node.isBinaryExpression(parent) && parent.getLeft() === node) {
        return []; // Don't follow the left side of a binary expression
    }

    if (Node.isTypeQuery(parent)) {
        return []; // Don't follow into the types
    }

    if (Node.isQualifiedName(parent) && !parent.getFirstAncestor(Node.isImportEqualsDeclaration)) {
        // Don't follow into the types, except inside `import x = ...`
        return [];
    }

    const madeSuspendable = Node.isCallExpression(parent) && parent.getExpression().forEachDescendantAsArray().some(n => n.getText().toLowerCase() === "lazy");
    return [{ node: parent, aliasPath, trace: [], isPotentialUsage: false, suspendable: madeSuspendable || suspendable }];
};

// Given a node of the particular type on the left side — how should it be followed?
const stepIntoNode: FollowStrategy = ({ node, aliasPath, suspendable }, _, warn): ReturnType<FollowStrategy> => {
    if (Node.isClassDeclaration(node)) {
        const classNameNode = node.getNameNode();
        return classNameNode
            ? [{ node: classNameNode, aliasPath: [], trace: [{ type: "ref", node }], isPotentialUsage: false, suspendable }]
            : [];
    }

    if (Node.isImportEqualsDeclaration(node)) {
        if (node.isTypeOnly()) { return []; }
        return [{ node: node.getNameNode(), aliasPath: [], trace: [{ type: "ref", node }], isPotentialUsage: false, suspendable }];
    }

    if (isForLoopStatement(node)) {
        const initializer = node.getInitializer();
        if (!initializer) { return []; }

        const [_index, ...nextAliasPath] = aliasPath;
        return [{ node: initializer, aliasPath: nextAliasPath, trace: [{ type: "ref", node }], isPotentialUsage: false, suspendable }];
    }

    // TODO: annotate each check with the code it's dealing with
    if (Node.isStatement(node)) { return []; } // By default, assume there's no need to step into statements

    if (Node.isAwaitExpression(node)) { return []; }
    if (Node.isIdentifier(node)) { return []; }
    if (Node.isCallExpression(node)) { return []; }
    if (Node.isImportSpecifier(node)) { return []; }
    if (Node.isNamedImports(node)) { return []; }
    if (Node.isImportClause(node)) { return []; }
    if (Node.isNamespaceImport(node)) { return []; }
    if (Node.isExportSpecifier(node)) { return []; }
    if (Node.isNamedExports(node)) { return []; }
    if (Node.isPropertyAssignment(node)) { return []; }
    if (Node.isShorthandPropertyAssignment(node)) { return []; }
    if (Node.isObjectLiteralExpression(node)) { return []; }
    if (Node.isArrayLiteralExpression(node)) { return []; }
    if (Node.isJsxElement(node)) { return []; }
    if (Node.isJsxFragment(node)) { return []; }
    if (Node.isJsxOpeningFragment(node)) { return []; }
    if (Node.isJsxClosingFragment(node)) { return []; }
    if (Node.isJsxExpression(node)) { return []; }
    if (Node.isJsxAttribute(node)) { return []; }
    if (node.getKindName() === "JsxAttributes") { return []; } // TODO: why isn't there a type guard?
    if (Node.isJsxClosingElement(node)) { return []; }
    if (Node.isJsxOpeningElement(node)) { return []; }
    if (Node.isJsxSelfClosingElement(node)) { return []; }
    if (Node.isArrowFunction(node)) { return []; }
    if (Node.isSpreadElement(node)) { return []; }
    if (Node.isSpreadAssignment(node)) { return []; }
    if (Node.isPrefixUnaryExpression(node)) { return []; }
    if (Node.isPostfixUnaryExpression(node)) { return []; }
    if (Node.isConditionalExpression(node)) { return []; }
    if (Node.isExpressionWithTypeArguments(node)) { return []; }
    if (Node.isHeritageClause(node)) { return []; }
    if (Node.isFunctionExpression(node)) { return []; }
    if (Node.isTaggedTemplateExpression(node)) { return []; }
    if (Node.isAsExpression(node)) { return []; }
    if (Node.isTypeOfExpression(node)) { return []; }
    if (Node.isPropertyDeclaration(node)) { return []; }
    if (Node.isJsxSpreadAttribute(node)) { return []; }
    if (Node.isTypeReference(node)) { return []; }
    if (node.getKindName() === "SyntaxList") { return []; } // Case from https://github.com/excalidraw/excalidraw/blob/bf6d0eeef7ea73525484fe680fd72f46ab490d51/src/actions/actionMenu.tsx#L1 — can't reproduce in tests
    if (Node.isNewExpression(node)) { return []; }
    if (Node.isDeleteExpression(node)) { return []; }

    if (Node.isParenthesizedExpression(node)) {
        // TODO: When is stepping into the parentheses useful?
        //       It seems that anything useful in parentheses would already be found via refs,
        //       so the only thing we're doing is stepping back in and cutting off search because of cycling.
        return [{ node: node.getExpression(), aliasPath, trace: [], isPotentialUsage: true, suspendable }];
    }

    const resolveVariableDeclaration = (declaration: VariableDeclaration): ReturnType<FollowStrategy> => {
        const variableNameNode = declaration.getNameNode();
        if (Node.isIdentifier(variableNameNode)) {
            return [{ node: variableNameNode, aliasPath, trace: [{ type: "ref", node: declaration }], isPotentialUsage: false, suspendable }];
        }

        if (Node.isObjectBindingPattern(variableNameNode)) {
            return [{ node: variableNameNode, aliasPath, trace: [], isPotentialUsage: false, suspendable }];
        }

        if (Node.isArrayBindingPattern(variableNameNode)) {
            return [{ node: variableNameNode, aliasPath, trace: [], isPotentialUsage: false, suspendable }];
        }

        warn({
            type: "find-usage-unhandled-node-type",
            message: `Unhandled node ${ describeNode(variableNameNode) }`,
            useCase: "stepIntoNode-variable-declaration-name",
            nodeKind: (variableNameNode as unknown as Node).getKindName(),
            node: variableNameNode,
        });
        return [];
    };

    if (Node.isVariableDeclarationList(node)) {
        return node.getDeclarations().flatMap(resolveVariableDeclaration);
    }

    if (Node.isVariableDeclaration(node)) {
        return resolveVariableDeclaration(node);
    }

    if (Node.isNonNullExpression(node)) {
        return [{ node: node.getExpression(), aliasPath, trace: [], isPotentialUsage: true, suspendable }];
    }

    if (Node.isPropertyAccessExpression(node)) {
        if (aliasPath.length === 0) { return []; } // There's no need to follow if alias path is already empty

        const propName = node.getName();
        if (aliasPath[0] !== propName) { return []; } // Different property name, don't follow

        const [, ...newAliasPath] = aliasPath;
        return [{ node: node.getNameNode(), aliasPath: newAliasPath, trace: [{ type: "ref", node }], isPotentialUsage: true, suspendable }];
    }

    if (Node.isElementAccessExpression(node)) {
        if (aliasPath.length === 0) { return []; } // There's no need to follow if alias path is already empty

        const argument = node.getArgumentExpression();
        if (!argument) { throw new Error(`No argument found on element access expression ${ describeNode(node) }`); }

        if (!Node.isStringLiteral(argument) && !Node.isNumericLiteral(argument) && !Node.isNoSubstitutionTemplateLiteral(argument)) {
            // TODO: how to deal with this situation better?
            //       1. Cases failing here fail silently
            //       2. Theoretically, there's a whole bunch of cases that could still be resolved, e.g. string literal used as a variable
            return [];
        }

        if (aliasPath[0] !== argument.getLiteralText()) { return []; } // Different property name, don't follow

        const [, ...newAliasPath] = aliasPath;
        return [{ node, aliasPath: newAliasPath, trace: [{ type: "ref", node }], isPotentialUsage: true, suspendable }];
    }

    if (Node.isObjectBindingPattern(node)) {
        const matchingElement = node.getElements()
            .map(el => {
                const propNameNode = el.getPropertyNameNode();
                if (!propNameNode) {
                    return { el, propName: el.getName() };
                }

                if (Node.isIdentifier(propNameNode)) {
                    return { el, propName: propNameNode.getText() };
                }

                if (!Node.isStringLiteral(propNameNode) && !Node.isNumericLiteral(propNameNode)) { throw new Error("Following a non-literal element access not implemented"); }
                const propName = propNameNode.getLiteralText();
                return { el, propName };
            })
            .find(({ propName }) => aliasPath[0] === propName);

        if (!matchingElement) {
            const rest = node.getElements().find(el => el.getDotDotDotToken());
            if (!rest) { return []; } // No matching element and no rest element — destructuring ignores the target
            return [{ node: rest.getNameNode(), aliasPath, trace: [{ type: "ref", node }], isPotentialUsage: false, suspendable }];
        }

        const [, ...newAliasPath] = aliasPath;
        const nameNode = matchingElement.el.getNameNode();
        if (Node.isIdentifier(nameNode)) {
            // Shorthand destructuring
            return [{ node: nameNode, aliasPath: newAliasPath, trace: [{ type: "ref", node }], isPotentialUsage: false, suspendable }];
        }

        const initializer = matchingElement.el.getInitializer() ?? matchingElement.el.getChildren()[2];
        if (!initializer) { throw new Error(`No initializer on ${ describeNode(matchingElement.el) }`); }
        return [{ node: initializer, aliasPath: newAliasPath, trace: [{ type: "ref", node }], isPotentialUsage: false, suspendable }];
    }

    if (Node.isArrayBindingPattern(node)) {
        const aliasIdx = Number(aliasPath[0]);
        const matchingElement = node.getElements()
            .map((el, idx) => {
                if (Node.isOmittedExpression(el)) { return null; }
                if (el.getDotDotDotToken()) { return null; }
                return { el, idx };
            })
            .filter(isNotNull)
            .find(({ idx }) => aliasIdx === idx);

        const restElement = node.getElements().filter(isNot(Node.isOmittedExpression)).find(el => el.getDotDotDotToken());
        const restElementIdx = node.getElements().findIndex(el => el === restElement);
        if (restElement && restElementIdx === -1) { throw new Error("Implementation error: rest element index not found within array binding pattern"); }

        if (restElement && !isNaN(aliasIdx) && restElementIdx <= aliasIdx) {
            return [{ node: restElement.getNameNode(), aliasPath, trace: [{ type: "ref", node }], isPotentialUsage: false, suspendable }];
        }

        // Rest element doesn't cover the target, and there's no specific matching element —
        // the target is ignored by this destructuring
        if (!matchingElement) { return []; }

        const [, ...newAliasPath] = aliasPath;
        const initializer = matchingElement.el.getInitializer() ?? matchingElement.el.getChildren()[0];
        if (!initializer) { throw new Error(`No initializer on ${ describeNode(matchingElement.el) }`); }
        return [{ node: initializer, aliasPath: newAliasPath, trace: [{ type: "ref", node }], isPotentialUsage: false, suspendable }];
    }

    if (Node.isBindingElement(node)) {
        return [{ node: node.getNameNode(), aliasPath, trace: [{ type: "ref", node }], isPotentialUsage: false, suspendable }];
    }

    if (Node.isParameterDeclaration(node)) {
        return [{ node: node.getNameNode(), aliasPath, trace: [{ type: "ref", node }], isPotentialUsage: false, suspendable }];
    }

    if (Node.isBinaryExpression(node)) {
        return [{ node: node.getRight(), aliasPath: [], trace: [], isPotentialUsage: false, suspendable }];
    }

    if (Node.isQualifiedName(node)) {
        // Don't step into `namespace.entity` constructs, e.g. in `import = namespace.entity`
        // TODO: This might need to check for `aliasPath` match, if there's a use case for component tracking.
        //       So far seems unlikely that a component would be created inside a namespace export in production code.
        return [];
    }

    warn({
        type: "find-usage-unhandled-node-type",
        message: `Unhandled node ${ describeNode(node) }`,
        useCase: "stepIntoNode",
        nodeKind: node.getKindName(),
        node,
    });
    return []; // Don't step in by default
};

const strategies: FollowStrategy[] = [followParent, stepIntoNode, followExport, followRefs];
function follow(dependencies: ResolveDependencies, target: ResolvedTarget, originalTarget: Node, visited: ResolutionTarget[], warn: Warn): Usage[] {
    const next = strategies
        .map(s => s(target, dependencies, warn))
        .reduce((a, b) => [...a, ...b], [])
        .filter(item => !visited.some(v => v.node === item.node && JSON.stringify(v.aliasPath) === JSON.stringify(item.aliasPath)));

    const nextVisited = [target, ...visited];
    const followupUsages = next
        .map(nextTarget => {
            // TODO: refactor to avoid recursion in favour of cycle
            return follow(dependencies, {
                ...nextTarget,
                trace: [...nextTarget.trace, ...target.trace],
            }, originalTarget, nextVisited, warn);
        })
        .reduce((a, b) => [...a, ...b], []);

    if (followupUsages.length === 0 && target.isPotentialUsage) {
        const usage: Usage = { use: target.node, trace: target.trace, aliasPath: target.aliasPath, target: originalTarget };
        return [usage];
    }

    return followupUsages;
}
