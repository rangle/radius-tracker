import { detectSnowflakes } from "./detectSnowflakes";
import { Project, Node } from "ts-morph";
import { atLeastOne } from "../guards";

describe("detectSnowflakes", () => {
    let project: Project;
    beforeEach(async () => {
       project = new Project({ useInMemoryFileSystem: true });
    });

    it("should detect a snowflake functional component", async () => {
        const snowflakes = detectSnowflakes(project.createSourceFile("tst.js", `
            export function Snowflake() { return <div/> };
        `));
        expect(snowflakes).toHaveLength(1);
        expect(Node.isFunctionDeclaration(atLeastOne(snowflakes)[0].declaration)).toBe(true);
        expect(Node.isIdentifier(atLeastOne(snowflakes)[0].identifier)).toBe(true);
        expect(atLeastOne(snowflakes)[0].identifier?.getText()).toBe("Snowflake");
    });

    it("should detect a const with snowflake functional component", async () => {
        const snowflakes = detectSnowflakes(project.createSourceFile("tst.js", `
            const Snwflk = function Snowflake() { return <div/> };
        `));
        expect(snowflakes).toHaveLength(1);
        expect(Node.isFunctionExpression(atLeastOne(snowflakes)[0].declaration)).toBe(true);
        expect(Node.isIdentifier(atLeastOne(snowflakes)[0].identifier)).toBe(true);
        expect(atLeastOne(snowflakes)[0].identifier?.getText()).toBe("Snwflk");
    });

    it("should detect snowflake arrow function", async () => {
        const snowflakes = detectSnowflakes(project.createSourceFile("tst.js", `
            export const Snowflake = () => <div/>;
        `));
        expect(snowflakes).toHaveLength(1);
        expect(Node.isArrowFunction(atLeastOne(snowflakes)[0].declaration)).toBe(true);
        expect(Node.isIdentifier(atLeastOne(snowflakes)[0].identifier)).toBe(true);
        expect(atLeastOne(snowflakes)[0].identifier?.getText()).toBe("Snowflake");
    });

    it("should detect default export of an anonymous function snowflake", async () => {
        const snowflakes = detectSnowflakes(project.createSourceFile("tst.js", `
            export default function () { return <div/> }
        `));
        expect(snowflakes).toHaveLength(1);
        expect(Node.isFunctionDeclaration(atLeastOne(snowflakes)[0].declaration)).toBe(true);
        expect(atLeastOne(snowflakes)[0].identifier).toBeUndefined();
    });

    it("should detect snowflake class definition", async () => {
        const snowflakes = detectSnowflakes(project.createSourceFile("tst.js", `
            export class Snowflake {
                render() {
                    return <div/>;
                }
            }
        `));
        expect(snowflakes).toHaveLength(1);
        expect(Node.isClassDeclaration(atLeastOne(snowflakes)[0].declaration)).toBe(true);
        expect(Node.isIdentifier(atLeastOne(snowflakes)[0].identifier)).toBe(true);
        expect(atLeastOne(snowflakes)[0].identifier?.getText()).toBe("Snowflake");
    });

    it("should detect snowflake class expression", async () => {
        const snowflakes = detectSnowflakes(project.createSourceFile("tst.js", `
            export const Snowflake = class {
                render() {
                    return <div/>;
                }
            }
        `));
        expect(snowflakes).toHaveLength(1);
        expect(Node.isClassExpression(atLeastOne(snowflakes)[0].declaration)).toBe(true);
        expect(Node.isIdentifier(atLeastOne(snowflakes)[0].identifier)).toBe(true);
        expect(atLeastOne(snowflakes)[0].identifier?.getText()).toBe("Snowflake");
    });

    it("should have no identifier for inline use of a component", async () => {
        const snowflakes = detectSnowflakes(project.createSourceFile("tst.js", `
            higherOrder(() => <div/>);
        `));
        expect(snowflakes).toHaveLength(1);
        expect(Node.isArrowFunction(atLeastOne(snowflakes)[0].declaration)).toBe(true);
        expect(atLeastOne(snowflakes)[0].identifier).toBeUndefined();
    });

    it("should not detect arbitrary code as a component", async () => {
        const snowflakes = detectSnowflakes(project.createSourceFile("tst.js", `
            const x = 1 + 1;
            console.log("This is not the component you're looking for", x);
        `));
        expect(snowflakes).toHaveLength(0);
    });

    it("should not consider helper function defined inside a component as a separate component", async () => {
        const snowflakes = detectSnowflakes(project.createSourceFile("tst.js", `
            export const Component = () => {
                const helper = useMemo(() => <div />);
                return <div>{ helper }</div>;
            };
        `));
        expect(snowflakes).toHaveLength(1);
    });

    it("should not consider a component not using any built-in elements as a snowflake", async () => {
        const snowflakes = detectSnowflakes(project.createSourceFile("tst.js", `
            import OtherComponent from "./otherComponent";
            export const Component = () => {
                return <><OtherComponent/></>;
            };
        `));
        expect(snowflakes).toHaveLength(0);
    });
});
