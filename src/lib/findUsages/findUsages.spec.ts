import { describeNode, FindUsages, setupFindUsages } from "./findUsages";
import { CommentRange, Node, Project } from "ts-morph";
import { resolveDependencies } from "../resolveDependencies/resolveDependencies";
import { ResolveModule } from "../resolveModule/resolveModule";
import { atLeastOne } from "../guards";

const ensure = <T>(val: T | undefined): T => {
    if (val === undefined) { throw new Error("Unexpected undefined"); }
    return val;
};

describe("findUsages", () => { // TODO: test traces
    let project: Project;
    let findUsages: FindUsages;

    const identifyTarget = ({ node, comment }: { node: Node, comment: CommentRange }, symbol: string): Node => {
        const symbolPosition = comment.getText().indexOf(symbol);
        if (symbolPosition === -1) { throw new Error(`Symbol ${ symbol } not found in comment ${ comment.getText() }`); }
        const expectedPosition = node.getStart() + symbolPosition;

        const [_, expectedKind] = comment.getText().slice(symbolPosition).split(" ");
        const identified = expectedKind
            ? node.getDescendants().filter(d => d.getKindName() === expectedKind).reverse().find(d => d.getPos() <= expectedPosition && d.getEnd() >= expectedPosition)
            : node.getDescendantAtPos(expectedPosition);

        const cantFindError = new Error(`Can't find a descendant ${ expectedKind ? `of king ${ expectedKind }` : "" }in ${ node } in position ${ symbolPosition }`);
        if (!identified && node.getDescendants().length === 0) {
            if (expectedKind && node.getKindName() !== expectedKind) { throw cantFindError; }
            return node;
        }

        if (!identified) { throw cantFindError; }
        return identified;
    };

    /**
     * This searches for target and usage nodes based on the comments in source code.
     * `#` denotes a target, `*` denotes an expected usage site.
     */
    const assertUsagesFound = () => {
        const commentRanges = project.getSourceFiles()
            .map(source => source.forEachDescendantAsArray())
            .reduce((a, b) => [...a, ...b], [])
            .map(node => node.getLeadingCommentRanges().map(comment => ({ node, comment })))
            .reduce((a, b) => [...a, ...b], [])
            .reduce((nodes, item) => {
                const matching = nodes.findIndex(n => n.comment.getText() === item.comment.getText() && n.comment.getPos() === item.comment.getPos());
                if (matching === -1) { return [...nodes, item]; }

                const matchingNode = nodes[matching];
                if (!matchingNode) { throw new Error("Implementation error: matching node not found"); }
                if (matchingNode.node.getWidth() > item.node.getWidth()) { return nodes; }
                nodes[matching] = item;
                return nodes;
            }, [] as { node: Node, comment: CommentRange }[]);

        const targetComment = commentRanges.find(({ comment }) => comment.getText().includes("#"));
        if (!targetComment) { throw new Error("Target comment not found. Use `#` symbol in comment to mark where the target is"); }

        const expectedUsages = commentRanges.filter(({ comment }) => comment.getText().includes("*")).map(c => identifyTarget(c, "*"));

        const target = identifyTarget(targetComment, "#");
        const { usages, warnings } = findUsages(target);

        expect(usages).toHaveLength(expectedUsages.length);
        expect(warnings).toHaveLength(0); // Should have no warnings

        expectedUsages.forEach(expectedUsage => {
            const usage = usages.find(({ use }) => expectedUsage === use);
            if (!usage) { throw new Error(`Expected to find usage at ${ describeNode(expectedUsage) }`); }
            expect(usage.target).toBe(target);
        });

        return usages;
    };

    beforeEach(async () => {
        project = new Project({ useInMemoryFileSystem: true, compilerOptions: { baseUrl: ".", allowJs: true } });

        let find: FindUsages | null;
        findUsages = (...args) => {
            if (!find) {
                const resolveModule = jest.fn<ReturnType<ResolveModule>, Parameters<ResolveModule>>().mockImplementation(target => project.getSourceFiles().find(f => f.getFilePath() === target) ?? null);
                find = setupFindUsages(resolveDependencies(project, resolveModule));
            }

            return find(...args);
        };
    });

    it("should find usages of an identifier within the file", async () => {
        project.createSourceFile("tst.js", `
            //    #-----
            const target = 1;
            
            //          *-----
            console.log(target);
        `);
        assertUsagesFound();
    });

    it("should find usages of a class within the file", async () => {
        project.createSourceFile("tst.jsx", `
            //    #-----
            class Target {};
            
            //          *-----
            console.log(Target)
        `);
        assertUsagesFound();
    });

    it("should find usages of a named export identifier across imports", async () => {
        project.createSourceFile("/source.js", `
            //           #-----
            export const target = 1;
        `);
        project.createSourceFile("/intermediary.js", `
            export * as ns from "/source.js";
        `);
        project.createSourceFile("/consumer.js", `
            import { ns } from "/intermediary.js";
            
            //             *-----
            console.log(ns.target);
        `);
        assertUsagesFound();
    });

    it("should find usages of a default export identifier across imports", async () => {
        project.createSourceFile("/source.js", `
            //    #-----
            const target = 1;
            export default target;
        `);
        project.createSourceFile("/intermediary.js", `
            export * as ns from "/source.js";
        `);
        project.createSourceFile("/consumer.js", `
            import { ns } from "/intermediary.js";
            
            //             *------
            console.log(ns.default);
        `);
        assertUsagesFound();
    });

    it("should find usages of manually re-exported identifier across imports", async () => {
        project.createSourceFile("/source.js", `
            //           #-----
            export const target = 1;
        `);
        project.createSourceFile("/intermediary.js", `
            import { target } from "/source.js";
            export { target };
        `);
        project.createSourceFile("/consumer.js", `
            import { target } from "/intermediary.js";
            
            //          *-----
            console.log(target);
        `);
        assertUsagesFound();
    });

    it("should trace usages of dynamic imports", async () => {
        project.createSourceFile("/source.js", `
            //           #-----
            export const target = 1;
        `);
        project.createSourceFile("/consumer.js", `
            (async () => {
                const { target } = await import("/source.js");
                
                //          *-----
                console.log(target);
            })();
        `);
        assertUsagesFound();
    });

    it("should trace usages of cjs overwrite exports", async () => {
        project.createSourceFile("/source.js", `
            //    #-----
            const target = 1;
            module.exports = { target }; 
        `);
        project.createSourceFile("/consumer.js", `
            const { target } = require("/source.js");
            
            //          *-----
            console.log(target);
        `);
        assertUsagesFound();
    });

    it("should trace usages of cjs overwrite exports", async () => {
        project.createSourceFile("/source.js", `
            //    #-----
            const target = 1;
            module.exports.target = target; 
        `);
        project.createSourceFile("/consumer.js", `
            const { target } = require("/source.js");
            
            //          *-----
            console.log(target);
        `);
        assertUsagesFound();
    });

    it("should follow renames of an identifier", async () => {
        project.createSourceFile("tst.js", `
            //    #-----
            const target = 1;
            const t = target;
            
            //          *
            console.log(t);
        `);
        assertUsagesFound();
    });

    it("should follow property assignments of an identifier", async () => {
        project.createSourceFile("tst.js", `
            //    #-----
            const target = 1;
            const obj1 = { t1: target };
            const obj2 = { t2: obj1 };
            
            //                  *-
            console.log(obj2.t2.t1);
        `);
        assertUsagesFound();
    });

    it("should not count standalone property assignment as usage", async () => {
        project.createSourceFile("tst.js", `
            //    #-----
            const target = 1;
            const obj = { target }; // Not counted as usage
        `);
        assertUsagesFound();
    });

    xit("should not follow irrelevant property access", async () => { // TODO: unignore and fix
        project.createSourceFile("tst.js", `
            //    #-----
            const target = 1;
           
            const obj = { target, wrong: 1 };
            console.log(obj.wrong); // Ignored
           
            //              *----- 
            console.log(obj.target);
        `);
        assertUsagesFound();
    });

    it("should track a usage when namespace is used without specifying the relevant property", async () => {
        project.createSourceFile("tst.js", `
            //    #-----
            const target = 1;
            const obj = { t: target };
            
            //          *--
            console.log(obj);
        `);
        assertUsagesFound();
    });

    it("should follow higher order uses of an identifier", async () => {
        project.createSourceFile("tst.js", `
            //    #-----
            const target = 1;
            
            const higherOrder = (x) => x + 1;
            const hoTarget = higherOrder(target);
            
            //          *-------
            console.log(hoTarget);
        `);
        assertUsagesFound();
    });

    it("should find usage of a non-referencable node", async () => {
        project.createSourceFile("tst.js", `
            //    #----------
            const higherOrder = (x) => () => x();
            const hoTarget = higherOrder(function () {});
            
            //          *-------
            console.log(hoTarget);
        `);
        assertUsagesFound();
    });

    it("should follow object destructuring", async () => {
        project.createSourceFile("tst.js", `
            //    #-----
            const target = 1;
            
            const obj1 = { target }; // Shorthand assignment
            const obj2 = { prop1: obj1 };
            const obj3 = { prop2: obj2 };
            
            const { prop2: { prop1 } } = obj3; // Destructuring 1
            const { target: t } = prop1; // Destructuring 2
            
            //          *
            console.log(t); // Usage
        `);
        assertUsagesFound();
    });

    it("should follow rest assignment in object destructuring", async () => {
        project.createSourceFile("tst.js", `
            //    #-----
            const target = 1;
            const { ...obj } = { target };
            
            //              *-----
            console.log(obj.target); // Usage
        `);
        assertUsagesFound();
    });

    it("should follow default import", async () => {
        project.createSourceFile("source.js", `
            //    #-----
            const target = 1;
            export default target;
        `);
        project.createSourceFile("consumer.js", `
            import target from "/source.js";
            
            //          *-----
            console.log(target);
        `);
        assertUsagesFound();
    });

    it("should follow import namespace destructuring", async () => {
        project.createSourceFile("source.js", `
            //           #-----
            export const target = 1;
        `);
        project.createSourceFile("consumer.js", `
            import * as ns from "/source.js";
            const { target } = ns;
            
            //          *-----
            console.log(target); // Usage
        `);
        assertUsagesFound();
    });

    it("should follow destructuring export", async () => {
        project.createSourceFile("source.js", `
            //    #--
            const tgt = 1;
            export const { tgt: target } = { tgt }; 
        `);
        project.createSourceFile("consumer.js", `
            import { target } from "/source.js";
            
            //          *-----
            console.log(target); // Usage
        `);
        assertUsagesFound();
    });

    it("should follow array destructuring", async () => {
        project.createSourceFile("tst.js", `
            //    #-----
            const target = 1;
            
            const arr1 = [null, target];
            const arr2 = [null, arr1]
            
            const [,[,tgt]] = arr2; // Destructuring
            
            //          *--
            console.log(tgt); // Usage
        `);
        assertUsagesFound();
    });

    it("should warn when array literal uses a spread element before the target", async () => {
        // TODO: in this case theoretically we could still track the `arr` usage — we know that it contains the target somewhere
        const source = project.createSourceFile("tst.js", `
            const target = 1;
            const filler = [1, 2, 3];
            
            const arr = [...filler, target];
        `);
        const identifier = ensure(source.forEachDescendantAsArray().find(Node.isIdentifier));
        const { warnings } = findUsages(identifier);

        expect(warnings).toHaveLength(1);

        const [warning] = atLeastOne(warnings);
        if (warning.type !== "find-usage-ambiguous-array-spread-assignment") { throw new Error("Expected an ambiguous spread assignment warning"); }
        expect(warning.spread.getText()).toBe("...filler");
    });

    it("should follow array use with spread literal after the target", async () => {
        project.createSourceFile("tst.js", `
            //    #-----
            const target = 1;
            const filler = [1, 2, 3];
            
            const [tgt] = [target, ...filler];
            
            //          *--
            console.log(tgt);
        `);
        assertUsagesFound();
    });

    it("should follow rest in array destructuring when rest is in target index", async () => {
        project.createSourceFile("tst.js", `
            //    #-----
            const target = 1;
            const [...tgt] = [target];
            
            //          *--
            console.log(tgt);
        `);
        assertUsagesFound();
    });

    it("should follow rest in array destructuring when rest is before target index", async () => {
        project.createSourceFile("tst.js", `
            //    #-----
            const target = 1;
            const [...tgt] = [null, target];
            
            //          *--
            console.log(tgt);
        `);
        assertUsagesFound();
    });

    it("should not follow rest in array destructuring when rest is after target index", async () => {
        project.createSourceFile("tst.js", `
            //    #-----
            const target = 1;
            const [, ...tgt] = [target];
            console.log(tgt);
        `);
        assertUsagesFound();
    });

    it("should follow object element access with string literal expression", async () => {
        project.createSourceFile("tst.js", `
            //    #-----
            const target = 1;
            
            const obj = { target };
            
            //             *--------- ElementAccessExpression
            console.log(obj["target"]);
        `);
        assertUsagesFound();
    });

    it("should follow chained object element access", async () => {
        project.createSourceFile("tst.js", `
            //    #-----
            const target = 1;
            
            const obj1 = { target };
            const obj2 = { obj1 };
            
            //                       *------- ElementAccessExpression
            console.log(obj2["obj1"]["target"]);
        `);
        assertUsagesFound();
    });

    it("should follow object element access with template expression without substitutions", async () => {
        project.createSourceFile("tst.js", `
            //    #-----
            const target = 1;
            
            const obj = { target };
            
            //             *--------- ElementAccessExpression
            console.log(obj[\`target\`]);
        `);
        assertUsagesFound();
    });

    it("should follow array element access expression", async () => {
        project.createSourceFile("tst.js", `
            //    #-----
            const target = 1;
            
            const arr = [target];
            
            //             *-- ElementAccessExpression
            console.log(arr[0]);
        `);
        assertUsagesFound();
    });

    xit("should not follow irrelevant object access expression", async () => { // TODO: unignore and fix
        project.createSourceFile("tst.js", `
            //    #-----
            const target = 1;
            const obj = { target, wrong: 1 };
            console.log(obj["wrong"]); // Ignored
            
            //             *--------- ElementAccessExpression
            console.log(obj["target"]);
        `);
        assertUsagesFound();
    });

    it("should detect usage of an identifier in JSX open tag", async () => {
        project.createSourceFile("tst.jsx", `
            //    #-----
            const Target = ({ children }) => <div>{ children }</div>;
            
            //                      *-----
            const Consumer = () => <Target>Hey</Target>;
        `);
        assertUsagesFound();
    });

    it("should detect usage of an identifier in JSX self-closing tag", async () => {
        project.createSourceFile("tst.jsx", `
            //    #-----
            const Target = () => <div/>;
            
            //                        *-----
            const Consumer = () => <><Target/></>;
        `);
        assertUsagesFound();
    });

    it("should detect property access usage in JSX self-closing tag", async () => {
        project.createSourceFile("tst.jsx", `
            //    #-----
            const Target = () => <div/>;

            const Obj = { Target };
            
            //                          *-----
            const Consumer = () => <Obj.Target/>;
        `);
        assertUsagesFound();
    });

    it("should detect usage in JSX props tag", async () => {
        project.createSourceFile("tst.jsx", `
            //    #-----
            const Target = () => <div/>;
            
            //                                     *-----
            const Consumer = () => <div somethin={ Target }/>;
        `);
        assertUsagesFound();
    });

    it("should ignore assignments to the target", async () => {
        project.createSourceFile("tst.jsx", `
            //    #-----
            const Target = () => <div/>;
            Target.propTypes = {};
            
            //                      *-----
            const Consumer = () => <Target/>;
        `);
        assertUsagesFound();
    });

    it("should follow spread assignment to an object", async () => {
        project.createSourceFile("tst.jsx", `
            //    #-----
            const target = 1;
            const obj1 = { target };
            const obj2 = { ...obj1 };
            
            //               *-----
            console.log(obj2.target);
        `);
        assertUsagesFound();
    });

    it("should follow spread assignment to an array", async () => {
        project.createSourceFile("tst.jsx", `
            //    #-----
            const target = 1;
            const arr1 = [target];
            const arr2 = [...arr1];
            
            //              *-- ElementAccessExpression
            console.log(arr2[0]);
        `);
        assertUsagesFound();
    });

    it("should consider consuming an identifier as part of jsx expression as a usage", async () => {
        project.createSourceFile("tst.jsx", `
            //    #-----
            const Target = () => <div/>;
            const set = { Target };
            
            //                                           *--
            const Consumer = () => <Dynamic components={ set }/>;
        `);
        assertUsagesFound();
    });

    it("should consider consuming an identifier as part of jsx spread attribute as a usage", async () => {
        project.createSourceFile("tst.jsx", `
            //    #-----
            const Target = () => <div/>;
            const set = { Target };
            
            //                                              *--
            const Consumer = () => <Dynamic components={ ...set }/>;
        `);
        assertUsagesFound();
    });

    it("should consider consuming a property access as part of jsx expression as a usage", async () => {
        project.createSourceFile("tst.jsx", `
            //    #-----
            const Target = () => <div/>;
            const subset = { Target };
            const set = { prop: subset }
            
            //                                               *---
            const Consumer = () => <Dynamic components={ set.prop }/>;
        `);
        assertUsagesFound();
    });

    it("should handle unary expressions", async () => {
        project.createSourceFile("tst.jsx", `
            //    #-----
            const target = false
            
            //           *-----
            console.log(!target);
        `);
        assertUsagesFound();
    });

    it("should handle binary expressions", async () => {
        project.createSourceFile("tst.jsx", `
            //    #-----
            const target = {}
            
            // *--
            target ||
                // *-- 
                target &&
                    // *--
                    target
        `);
        assertUsagesFound();
    });

    it("should not follow target used in the left side of a logical expression", async () => {
        project.createSourceFile("tst.jsx", `
            //    #-----
            const target = {}
            
            //               *-----
            const nofollow = target && "nope";
            console.log(nofollow);
        `);
        assertUsagesFound();
    });

    it("should handle parentheses", async () => {
        project.createSourceFile("tst.jsx", `
            //    #-----
            const target = {}
            
            //         *-----
            const x = (target);
        `);
        assertUsagesFound();
    });

    it("should handle if statements", async () => {
        project.createSourceFile("tst.jsx", `
            //    #-----
            const target = 1
            
            //  *-----
            if (target) {
                //          *-----
                console.log(target);
            }
        `);
        assertUsagesFound();
    });

    it("should handle conditional expressions", async () => {
        project.createSourceFile("tst.jsx", `
            //    #-----
            const target = 1

            console.log(
                // *--
                target ? 
                    // *--
                    target :
                        // *-- 
                        target
            );
        `);
        assertUsagesFound();
    });

    it("should handle reassignment to self", async () => {
        project.createSourceFile("tst.jsx", `
            //    #-----
            let target = 1
            target = target
            
            //          *---
            console.log(target);
        `);
        assertUsagesFound();
    });

    it("should handle direct default assignment in function arguments", async () => {
        project.createSourceFile("tst.jsx", `
            //    #-----
            const target = 1
            
            //                  *-----
            function tst1(val = target) {}
            
            function tst2(val = target) {
                //          *--
                console.log(val);
            }
        `);
        assertUsagesFound();
    });

    it("should handle default assignment to a rest param in function arguments", async () => {
        project.createSourceFile("tst.jsx", `
            //    #-----
            const target = 1
            const arr = [target];
            
            function tst2(...val = arr) {
                //             *-- ElementAccessExpression
                console.log(val[0]);
            }
        `);
        assertUsagesFound();
    });

    it("should handle object destructuring default assignment in function arguments", async () => {
        project.createSourceFile("tst.jsx", `
            //    #-----
            const target = 1
            const obj = { t: target };
           
            function tst({ t } = obj) {
                //          *
                console.log(t);
            }
        `);
        assertUsagesFound();
    });

    it("should handle array destructuring default assignment in function arguments", async () => {
        project.createSourceFile("tst.jsx", `
            //    #-----
            const target = 1
            const arr = [target];
           
            function tst([t] = arr) {
                //          *
                console.log(t);
            }
        `);
        assertUsagesFound();
    });

    it("should handle rest param in array destructuring default assignment in function arguments", async () => {
        project.createSourceFile("tst.jsx", `
            //    #-----
            const target = 1
            const arr = [target];
           
            function tst([...t] = arr) {
                //           *-- ElementAccessExpression
                console.log(t[0]);
            }
        `);
        assertUsagesFound();
    });

    it("should handle expressions in default assignment of function argument", async () => {
        project.createSourceFile("tst.jsx", `
            //    #-----
            const target = 1
            function tst(t = [target]) {
                //           *-- ElementAccessExpression
                console.log(t[0]);
            }
        `);
        assertUsagesFound();
    });

    it("should handle arrow functions", async () => {
        // TODO: not sure if this is a correct resolution
        project.createSourceFile("tst.jsx", `
            //    #-----
            const target = 1
            const x = () => target;
            
            //          *
            console.log(x);
        `);
        assertUsagesFound();
    });

    it("should handle return statements", async () => {
        project.createSourceFile("tst.jsx", `
            //    #-----
            const target = 1
            
            //                      *-----
            function tst() { return target; }
        `);
        assertUsagesFound();
    });

    it("should handle class extension", async () => {
        project.createSourceFile("tst.jsx", `
            //    #-----
            class Target {};
            class Extended extends Target {}
            
            //          *-------
            console.log(Extended)
        `);
        assertUsagesFound();
    });

    it("should handle function expressions", async () => {
        project.createSourceFile("tst.jsx", `
            //    #-----
            const target = 1;
            
            //                                      *-----
            const obj = { prop: function() { return target; } };
        `);
        assertUsagesFound();
    });

    it("should handle function class props", async () => {
        project.createSourceFile("tst.jsx", `
            //    #-----
            const target = null;
            console.log(class {
                render() {
                    //     *----- 
                    return target; 
                }, 
            });
        `);
        assertUsagesFound();
    });

    it("should handle function expression prop as a target", async () => {
        project.createSourceFile("tst.js", `
            console.log({ 
                //      #------- FunctionExpression
                render: function () {}
            });
        `);
        assertUsagesFound();
    });

    it("should handle function declaration as a target", async () => {
        project.createSourceFile("tst.js", `
            //       #--
            function tst() {};
            
            //          *--
            console.log(tst);
        `);
        assertUsagesFound();
    });

    it("should handle overloaded function declaration as a target", async () => {
        project.createSourceFile("tst.ts", `
            function tst(val: number): number;
            function tst(val: string): string;
            //       #--
            function tst<T>(val: T): T { return val; }
            
            //          *--
            console.log(tst);
        `);
        assertUsagesFound();
    });

    it("should handle usage within overloaded function", async () => {
        project.createSourceFile("tst.ts", `
            //    #-----
            const target = 1;
            
            
            function tst(val: number): number;
            function tst(val: string): string;
            
            //                                        *-----
            function tst<T>(val: T): T { return val + target; }
        `);
        assertUsagesFound();
    });

    it("should handle duplicate exports", async () => {
        project.createSourceFile("/source.js", `
            //              #--
            export function tst {};
            export default tst;
        `);
        project.createSourceFile("/consumer.js", `
            import t, { tst } from "/source.js";
            
            //          *
            console.log(t);
            
            //          *--
            console.log(tst);
        `);
        assertUsagesFound();
    });

    it("should handle import grouping", async () => {
        project.createSourceFile("/source1.js", `
            //              #---
            export function tst1 {};
            export default tst1;
        `);
        project.createSourceFile("/source2.js", `
            export function tst1 {};
            export default tst1;
        `);
        project.createSourceFile("/intermediary.js", `
            import tst1 from "/source1.js";
            import tst2 from "/source2.js";
            export { tst1, tst2 };
        `);
        project.createSourceFile("/consumer.js", `
            import { tst1, tst2 } from "/intermediary.js";
            
            //          *--
            console.log(tst1);
        `);
        assertUsagesFound();
    });

    it("should resolve binary expression used as conditional", async () => {
        project.createSourceFile("tst.jsx", `
            //    #-----
            const Target = ({ onClick }) => <div onClick={ onClick }/>;
            
            const Consumer = ({ callback }) => {
                return <div>{
                    //           *-----
                    callback && <Target onClick={ callback }/>
                }</div>
            }
        `);
        assertUsagesFound();
    });

    it("should find usages through function calls", async () => {
        project.createSourceFile("tst.jsx", `
            //    #--------
            const Target = () => <div/>
            const getComponent = () => Target;
            
            function Comp() {
              const C = getComponent();
              
              //      *
              return <C/>;
            }
        `);
        assertUsagesFound();
    });
});
