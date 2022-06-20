import { NodeRef, AnalysisResult, AnalysisTrace, AnalysisUsage, AnalysisUsageData } from "../../../shared_types/analysisResult";
import styles from "./Results.module.scss";
import { useCallback, useState } from "react";
import { Collapsible } from "../collapsible/Collapsible";
import { spell } from "../util/spelling";

export const Results = ({ data }: { data: AnalysisResult }) => {
    return <div>
        { data.capped && <div>Results were truncated, because the repo is too big</div> }

        { Boolean(data.warnings.length) && <Warnings warnings={ data.warnings } /> }

        { data.homebrewUsages.length > 0
            ? <dl>{ data.homebrewUsages.map((s, i) => <Component key={ i } { ...s } />) }</dl>
            : <>
                <h2>No homebrew components detected</h2>
                <p>Radius tracker only supports React at the moment — is the project using React?</p>
            </> }
    </div>;
};

const spellWarnings = spell({ one: "warning", many: "warnings" });
function Warnings({ warnings }: Pick<AnalysisResult, "warnings">) {
    const [expanded, setExpanded] = useState(false);
    const toggle = useCallback(() => setExpanded(e => !e), [setExpanded]);

    return <div className={ styles.warnings }>
        <h2 onClick={ toggle } className={ styles.warningsToggle } onKeyPress={ toggle } role="button" tabIndex={ 0 }>{ expanded ? "Hide" : "Show" } { spellWarnings(warnings.length) }</h2>
        <Collapsible open={ expanded }>{
            warnings.map((w, i) => <pre key={ i } className={ styles.warning }>{ w.message }</pre>)
        }</Collapsible>
    </div>;
}

const nodeFilePath = (node: NodeRef) => `${ node.filepath }:${ node.startLine }${ node.endLine !== node.startLine ? `-${ node.endLine }` : "" }`;
const nodeText = (node: NodeRef, maxLines: number) => {
    const entireContext = node.context;
    if (!entireContext) { return node.text; }

    const contextLines = entireContext.split("\n");
    const context = contextLines.slice(0, maxLines).join("\n");

    return contextLines.length > maxLines
        ? `${ context }${ maxLines > 1 ? "\n..." : " ..." }`
        : context;
};

function Component(props: AnalysisUsageData) {
    return <>
        <dd className={ styles.componentDefinition }><a href={ props.target.url }>{ props.target.text }</a> in { nodeFilePath(props.target) }</dd>
        <dt>
            <pre className={ styles.componentCodeSnippet }>{ nodeText(props.target, 5) }</pre>
            <ComponentUsages usages={ props.usages } />
        </dt>
    </>;
}

const spellUsages = spell({ one: "usage", many: "usages" });
function ComponentUsages({ usages }: Pick<AnalysisUsageData, "usages">) {
    const [expanded, setExpanded] = useState(false);
    const toggle = useCallback(() => setExpanded(e => !e), [setExpanded]);

    return <>
        { usages.length > 0
            ? <span onClick={ toggle } className={ styles.usagesToggle } onKeyPress={ toggle } role="button" tabIndex={ 0 }>{ expanded ? "Hide" : "Show" } { spellUsages(usages.length) }</span>
            : spellUsages(usages.length) }
        <Collapsible open={ expanded }>
            <ul className={ styles.usagesList }>{
                usages.map((usage, i) => <li key={ i }><SingleComponentUsage { ...usage } /></li>)
            }</ul>
        </Collapsible>
    </>;
}

function SingleComponentUsage(props: AnalysisUsage) {
    const [expanded, setExpanded] = useState(false);
    const toggle = useCallback(() => setExpanded(e => !e), [setExpanded]);

    return <div className={ styles.usage }>
        <a href={ props.use.url }><pre className={ styles.usageCodeSnippet }>{ nodeText(props.use, 1) }</pre></a>
        in { nodeFilePath(props.use) }

        { props.trace.length > 0
            ? <span onClick={ toggle } className={ styles.traceToggle } onKeyPress={ toggle } role="button" tabIndex={ 0 }>{ expanded ? "Hide" : "Show" } trace</span>
            : null }

        <Collapsible open={ expanded }>
            <ul className={ styles.traceList }>{
                props.trace.map((t, i) => <li key={ i }><Trace trace={ t } /></li>)
            }</ul>
        </Collapsible>
    </div>;
}

function Trace({ trace }: { trace: AnalysisTrace }) {
    return <div className={ styles.trace }>
        { trace.type } <a href={ trace.node.url }><pre className={ styles.usageCodeSnippet }>{ nodeText(trace.node, 1) }</pre></a>
        in { nodeFilePath(trace.node) }
    </div>;
}
