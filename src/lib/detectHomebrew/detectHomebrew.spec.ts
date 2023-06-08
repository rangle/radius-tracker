import { detectHomebrew } from "./detectHomebrew";
import { Project, Node } from "ts-morph";
import { atLeastOne } from "../guards";

describe("detectHomebrew", () => {
    let project: Project;
    beforeEach(async () => {
        project = new Project({ useInMemoryFileSystem: true });
    });

    it("should detect a homebrew functional component", async () => {
        const homebrew = detectHomebrew(project.createSourceFile("tst.js", `
            export function Homebrew() { return <div/> };
        `), {});
        expect(homebrew).toHaveLength(1);
        expect(Node.isFunctionDeclaration(atLeastOne(homebrew)[0].declaration)).toBe(true);
        expect(Node.isIdentifier(atLeastOne(homebrew)[0].identifier)).toBe(true);
        expect(atLeastOne(homebrew)[0].identifier?.getText()).toBe("Homebrew");
    });

    it("should detect a const with homebrew functional component", async () => {
        const homebrew = detectHomebrew(project.createSourceFile("tst.js", `
            const Hmbrw = function Homebrew() { return <div/> };
        `), {});
        expect(homebrew).toHaveLength(1);
        expect(Node.isFunctionExpression(atLeastOne(homebrew)[0].declaration)).toBe(true);
        expect(Node.isIdentifier(atLeastOne(homebrew)[0].identifier)).toBe(true);
        expect(atLeastOne(homebrew)[0].identifier?.getText()).toBe("Hmbrw");
    });

    it("should detect homebrew arrow function", async () => {
        const homebrew = detectHomebrew(project.createSourceFile("tst.js", `
            export const Homebrew = () => <div/>;
        `), {});
        expect(homebrew).toHaveLength(1);
        expect(Node.isArrowFunction(atLeastOne(homebrew)[0].declaration)).toBe(true);
        expect(Node.isIdentifier(atLeastOne(homebrew)[0].identifier)).toBe(true);
        expect(atLeastOne(homebrew)[0].identifier?.getText()).toBe("Homebrew");
    });

    it("should detect default export of an anonymous function homebrew", async () => {
        const homebrew = detectHomebrew(project.createSourceFile("tst.js", `
            export default function () { return <div/> }
        `), {});
        expect(homebrew).toHaveLength(1);
        expect(Node.isFunctionDeclaration(atLeastOne(homebrew)[0].declaration)).toBe(true);
        expect(atLeastOne(homebrew)[0].identifier).toBeUndefined();
    });

    it("should detect homebrew class definition", async () => {
        const homebrew = detectHomebrew(project.createSourceFile("tst.js", `
            export class Homebrew {
                render() {
                    return <div/>;
                }
            }
        `), {});
        expect(homebrew).toHaveLength(1);
        expect(Node.isClassDeclaration(atLeastOne(homebrew)[0].declaration)).toBe(true);
        expect(Node.isIdentifier(atLeastOne(homebrew)[0].identifier)).toBe(true);
        expect(atLeastOne(homebrew)[0].identifier?.getText()).toBe("Homebrew");
    });

    it("should detect homebrew class expression", async () => {
        const homebrew = detectHomebrew(project.createSourceFile("tst.js", `
            export const Homebrew = class {
                render() {
                    return <div/>;
                }
            }
        `), {});
        expect(homebrew).toHaveLength(1);
        expect(Node.isClassExpression(atLeastOne(homebrew)[0].declaration)).toBe(true);
        expect(Node.isIdentifier(atLeastOne(homebrew)[0].identifier)).toBe(true);
        expect(atLeastOne(homebrew)[0].identifier?.getText()).toBe("Homebrew");
    });

    it("should have no identifier for inline use of a component", async () => {
        const homebrew = detectHomebrew(project.createSourceFile("tst.js", `
            higherOrder(() => <div/>);
        `), {});
        expect(homebrew).toHaveLength(1);
        expect(Node.isArrowFunction(atLeastOne(homebrew)[0].declaration)).toBe(true);
        expect(atLeastOne(homebrew)[0].identifier).toBeUndefined();
    });

    it("should not detect arbitrary code as a component", async () => {
        const homebrew = detectHomebrew(project.createSourceFile("tst.js", `
            const x = 1 + 1;
            console.log("This is not the component you're looking for", x);
        `), {});
        expect(homebrew).toHaveLength(0);
    });

    it("should not consider helper function defined inside a component as a separate component", async () => {
        const homebrew = detectHomebrew(project.createSourceFile("tst.js", `
            export const Component = () => {
                const helper = useMemo(() => <div />);
                return <div>{ helper }</div>;
            };
        `), {});
        expect(homebrew).toHaveLength(1);
    });

    it("should not consider a component not using any built-in elements as a homebrew", async () => {
        const homebrew = detectHomebrew(project.createSourceFile("tst.js", `
            import OtherComponent from "./otherComponent";
            export const Component = () => {
                return <><OtherComponent/></>;
            };
        `), {});
        expect(homebrew).toHaveLength(0);
    });

    it("should detect an identifier after the homebrew is wrapped with forwardRef", async () => {
        const homebrew = detectHomebrew(project.createSourceFile("tst.js", `
            const Hmbrw = React.forwardRef((props, forwardedRef) => <div/>);
        `), {});
        expect(homebrew).toHaveLength(1);
        expect(Node.isArrowFunction(atLeastOne(homebrew)[0].declaration)).toBe(true);
        expect(Node.isIdentifier(atLeastOne(homebrew)[0].identifier)).toBe(true);
        expect(atLeastOne(homebrew)[0].identifier?.getText()).toBe("Hmbrw");
    });

    it("should detect homebrew component using a known component representing a dom node", async () => {
        const file = project.createSourceFile("tst.js", `
            import styled from 'styled-components';
            const Div = styled.div\`background: red\`;
            export function Homebrew() { return <Div/> };
        `);

        const factoryDomReference = file.forEachDescendantAsArray()
            .filter(Node.isIdentifier)
            .find(id => id.getText() === "Div" && Node.isJsxSelfClosingElement(id.getParent()));
        if (!factoryDomReference) { throw new Error("Div component not found"); }

        const factoryName = "factory";
        const homebrew = detectHomebrew(file, { [factoryName]: new Set([factoryDomReference]) });
        expect(homebrew).toHaveLength(1);
        const detectedComponent = atLeastOne(homebrew)[0];

        expect(Node.isFunctionDeclaration(detectedComponent.declaration)).toBe(true);
        expect(Node.isIdentifier(detectedComponent.identifier)).toBe(true);
        expect(detectedComponent.identifier?.getText()).toBe("Homebrew");
        expect(detectedComponent.detectionReason).toBe(factoryName);
    });
});
