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
        { analysisUrl
            ? <>
                <div className={ styles.restart } onClick={ restart } onKeyPress={ restart } role="button" tabIndex={ 0 }>
                    &larr; <span className={ styles.restartText }>Analyze another repo</span>
                </div>
                <Analysis githubUrl={ analysisUrl } />
            </>
            : <>
                <h1>Radius Tracker</h1>
                <p>Try&nbsp;homebrew component detection and&nbsp;usage tracking provided by&nbsp;the&nbsp;<a href="https://github.com/rangle/radius-tracker">Radius&nbsp;Tracker</a></p>

                <form onSubmit={ onSubmit } className={ styles.form }>
                    <input type="text" value={ currentUrl } onChange={ onUrlChange } className={ styles.input }
                        placeholder="Github repo url" />
                    <button className={ styles.button }>Analyze</button>
                </form>
                <div className={ styles.suggestion }>
                    Try&nbsp;<span className={ styles.suggestionLink } onClick={ useSuggestion } onKeyPress={ useSuggestion } role="button" tabIndex={ 0 }>{ suggestedRepo }</span>
                </div>

                <h2 className={ styles.subheader }>What is&nbsp;a&nbsp;homebrew component?</h2>
                <p>
                    In&nbsp;a&nbsp;context of&nbsp;the&nbsp;design system, homebrew is&nbsp;a&nbsp;component implemented directly
                    in&nbsp;the&nbsp;product codebase outside the&nbsp;design system. This project detects <em>low-level components that&nbsp;render html&nbsp;tags.</em>
                </p>
                <p>
                    To&nbsp;measure the&nbsp;design system adoption, compare the&nbsp;design system usage to the&nbsp;competition.
                    Not&nbsp;all&nbsp;components would be&nbsp;competing with&nbsp;the&nbsp;design system in&nbsp;your&nbsp;project.
                    Compositional components&nbsp;— those&nbsp;only using other&nbsp;components&nbsp;— are&nbsp;not&nbsp;likely to&nbsp;compete with&nbsp;the&nbsp;design system.
                    Low-level components dealing with&nbsp;raw&nbsp;markup, on&nbsp;the&nbsp;other hand, are&nbsp;likely to&nbsp;compete with&nbsp;the&nbsp;design system.
                </p>

                <p>Get&nbsp;better results by&nbsp;using <a href="https://github.com/rangle/radius-tracker">radius-tracker</a> with&nbsp;your&nbsp;codebase.</p>
            </> }

    </div>;
}

export default App;
