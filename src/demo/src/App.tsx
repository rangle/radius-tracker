import React, { ChangeEvent, FormEvent, useCallback, useState } from "react";
import styles from "./App.module.scss";
import Analysis from "./analysis/Analysis";

const suggestedRepo = "https://github.com/desktop/desktop";
function App() {
    const [currentUrl, setCurrentUrl] = useState("");
    const onUrlChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setCurrentUrl(event.target.value), [setCurrentUrl]);

    const [analysisUrl, setAnalysisUrl] = useState<string | null>(null);
    const onSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setAnalysisUrl(currentUrl);
    }, [currentUrl, setAnalysisUrl]);

    const useSuggestion = useCallback(() => setAnalysisUrl(suggestedRepo), [setAnalysisUrl]);
    const restart = useCallback(() => {
        setAnalysisUrl(null);
        setCurrentUrl("");
    }, [setAnalysisUrl, setCurrentUrl]);

    return <div className={ styles.wrapper }>
        <div className={styles.docs}>
            <a href="./docs" target="_blank">Docs</a>
        </div>
        { analysisUrl
            ? <>
                <div className={ styles.restart } onClick={ restart } onKeyPress={ restart } role="button" tabIndex={ 0 }>
                    &larr; <span className={ styles.restartText }>Analyze another repo</span>
                </div>
                <Analysis githubUrl={ analysisUrl } />
            </>
            : <>
                <h1>Radius Tracker</h1>
                <p>Detect snowflake components, and their usages in&nbsp;the codebase.</p>

                <form onSubmit={ onSubmit } className={ styles.form }>
                    <input type="text" value={ currentUrl } onChange={ onUrlChange } className={ styles.input }
                        placeholder="Github repo url" />
                    <button className={ styles.button }>Analyze</button>
                </form>
                <div className={ styles.suggestion }>
                    Try <span className={ styles.suggestionLink } onClick={ useSuggestion } onKeyPress={ useSuggestion } role="button" tabIndex={ 0 }>{ suggestedRepo }</span>
                </div>

                <h2 className={ styles.subheader }>What is&nbsp;a&nbsp;snowflake?</h2>
                <p>In&nbsp;<a href="https://rangle.io">Rangle,</a> we&nbsp;call unique one-off components implemented outside of&nbsp;a&nbsp;component library &ldquo;snowflakes&rdquo;.</p>
                <p>This project detects <em>low-level components that render html tags.</em> Not all such components would be&nbsp;snowflakes in&nbsp;your project, but most snowflakes would render raw markup.</p>
                <p>Get better results by&nbsp;using <a href="https://npmjs.com/package/radius-tracker">radius-tracker package</a> programmatically with your codebase.</p>

                <h2 className={ styles.subheader }>Why track snowflakes?</h2>
                <p>If&nbsp;you&rsquo;re trying to&nbsp;<a href="https://rangle.io/ds-hub/">build a&nbsp;design system,</a> there are two main reasons to&nbsp;track snowflakes:</p>
                <ol>
                    <li>Metrics&nbsp;&mdash; know how well component library adoption is&nbsp;going over time by&nbsp;regularly collecting the usage numbers. An&nbsp;example would be&nbsp;component library usages&nbsp;as% of&nbsp;all component usages.</li>
                    <li>Insights&nbsp;&mdash; developers build snowflakes for a&nbsp;reason. Either design system is&nbsp;missing a&nbsp;suitable component, or&nbsp;an&nbsp;existing component is&nbsp;insufficient.
                        Maybe developers don&rsquo;t know a&nbsp;suitable component exists. Possibly, snowflake is&nbsp;a&nbsp;historical artifact not complying with the current quality standards.</li>
                </ol>
            </> }

    </div>;
}

export default App;
