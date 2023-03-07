---
title: Tracker configuration
description: Configuration file for Radius Tracker describes where to find and how to analyze each project
             in your organization's ecosystem. Learn to improve tracking performance & remove junk from the output. 
---

# Tracker configuration

We designed Tracker to collect historical usage stats from the entire ecosystem of UI projects within the organization.
It requires describing the project ecosystem and setting up Tracker to run on schedule
to update the data and generate a new report.

You can collect the data by running
```sh
npx radius-tracker timelines ./path/to/config.js
```


## Config file structure

Tracker config is a .js file with an array of entries for each repo you want to process
```js
export default [
    {
        // Git clone URL.
        // This URL can use any protocol git supports, including SSH and local files.
        // https://git-scm.com/book/en/v2/Git-on-the-Server-The-Protocols#_the_protocols
        repoUrl: "https://githost.com/company/product",

        // Regexp testing if an import path comes from the design system.
        // See the document below for multi-target configuration,
        // and handling file targets.
        isTargetModuleOrPath: /^@company\/design-system/,

        // How far into history should Tracker look.
        // Positive number. Set to `Infinity` to process the entire project history.
        maxWeeks: 52,

        // [optional] Subproject path denotes where in the monorepo the project code is located
        //            relative to the repository root.
        //            Defaults to "/"
        subprojectPath: "/",

        // [optional] Regexp specifying which file paths to exclude.
        //            See the document below for the default value & details.
        isIgnoredFile: /\/node_modules\//,
        
        // [optional] Function narrowing down if the import matched by `isTargetModuleOrPath`
        //            should be considered for analysis. See the document below for the default value & details.
        isTargetImport: imp => imp.type !== "cjs-import", // This example excludes `require` calls

        // [optional] Function checking if Tracker should include a particular usage found in code
        //            in the analysis. See the document below for details.
        //            Defaults to `() => true`
        isValidUsage: () => true,

        // [optional] String path specifying where tsconfig.json is located relative to `subprojectPath`
        //            TSConfig helps Tracker resolve which files to include and how to navigate
        //            the dependencies. Make sure this points to the correct file if it exists.
        //            Defaults to "tsconfig.json"
        //            Conflicts with `jsconfigPath`
        tsconfigPath: "tsconfig.json",

        // [optional] String path specifying where jsconfig.json is located relative to `subprojectPath`
        //            Some projects use a JSConfig to specify data about the project: https://code.visualstudio.com/docs/languages/jsconfig
        //            Tracker can use it to adjust its behavior, similar to `tsconfigPath` above.
        //            Defaults to "jsconfig.json"
        //            Conflicts with `tsconfigPath`
        jsconfigPath: "jsconfig.json"
    },
    /* ...repeat for other projects */
];
```

For reference, you can find the configuration used to generate [the Tracker sample report](https://observablehq.com/@smoogly/design-system-metrics)
under [`/src/lib/cli/test/grafana_samples.ts`](https://github.com/rangle/radius-tracker/blob/17da736e27f325ec3fa7c920b85fd645a0a81a0a/src/lib/cli/test/grafana_samples.ts#L23)

The full definition is [`WorkerConfig`](https://github.com/rangle/radius-tracker/blob/fe510f3de53f519816fcdf83d93b987f3045e947/src/lib/cli/timelines/workerTypes.ts#L5-L8)
extending [`StatsConfig.`](https://github.com/rangle/radius-tracker/blob/fe510f3de53f519816fcdf83d93b987f3045e947/src/lib/cli/sharedTypes.ts#L5-L17)


## Multi-target configuration

Besides your design system, UI projects in your organization ecosystem might use other component sources.
To specify multiple sources, provide a set of regexps in `isTargetModuleOrPath`:
```js
const targets = {
    ds: /^@company\/design-system/,
    material: /^(@mui|@material-ui)/,
    ant: /^(antd|@ant-design)/,
};

export default [{
    isTargetModuleOrPath: targets,
    // ...rest of the configuration
}]
```

Tracker collects usages separately for each target in the set. That way, each usage
is attributable to the particular source during the analysis. 


## Handling file targets

Some projects store the component library within the repo.

Tracker supports file paths as targets, e.g., `isTargetModuleOrPath: /src\/components/`  
In this case, Tracker will ignore any usage found within `src/components` under the assumption
that it forms a part of the component library implementation.


## Ignored files

`isIgnoredFile` regexp filters out files that Tracker should not be analyze for component usage.
File paths are given relative to the `subprojectPath` within the project.

By default, Tracker ignores
* files in the `node_modules` directory
* `__mocks__` folders
* `.spec.<ext>` and `.test.<ext>` along with `/test/` and `/spec/` directories to filter out common test files
* `.story.<ext>` and `.stories.<ext>` along with `/story/` and `/stories/` directories to filter out common storybook locations
* `.d.ts` files with typescript definitions.

Ignoring the files improves Tracker performance by avoiding unnecessary work.
It also enhances the output quality by removing non-production usages of components in tests and stories.

[See the implementation](https://github.com/rangle/radius-tracker/blob/17da736e27f325ec3fa7c920b85fd645a0a81a0a/src/lib/cli/resolveStatsConfig.ts#L48) for the default regexp.

If you specify `isIgnoredFile` regexp, we advise you to filter out `node_modules` —
parsing the dependencies takes forever if present.


## Ignored imports

Similar to ignored files, `isTargetImport` specifies which particular imports Tracker should ignore.

`isTargetImport` is a function receiving [an import model](https://github.com/rangle/radius-tracker/blob/17da736e27f325ec3fa7c920b85fd645a0a81a0a/src/lib/resolveDependencies/identifyImports.ts#L6)
as input and determining if this import should be included. The import model references the particular AST node
where the import happens and contains pre-processed information about that import.

Filtering imports improves Tracker performance, though insignificantly compared to ignored files.
Most importantly, filtering imports prevents non-components from polluting the output.

Even though the import model contains a `moduleSpecifier`, consider updating the target regexp if you need to filter on module names or paths.

[The default implementation](https://github.com/rangle/radius-tracker/blob/17da736e27f325ec3fa7c920b85fd645a0a81a0a/src/lib/cli/resolveStatsConfig.ts#L22-L32)
filters out lower-case named imports — typically not React Components — and all-caps named imports — usually constant values.

This function gets sent to the worker processes, so its implementation needs to be serializable via `.toString()` and de-serializable via `eval()`.
It can not use scoped variables, as those don't get serialized with `fn.toString()`


## Valid usages filter

As a last resort, you can use `isValidUsage` function to filter out incorrect data from the output.
This function receives [a usage model](https://github.com/rangle/radius-tracker/blob/17da736e27f325ec3fa7c920b85fd645a0a81a0a/src/lib/findUsages/findUsages.ts#L47-L52)
referencing the particular AST node that Tracker considers a component usage.

[The default implementation](https://github.com/rangle/radius-tracker/blob/17da736e27f325ec3fa7c920b85fd645a0a81a0a/src/lib/cli/resolveStatsConfig.ts#L79)
is `() => true` — accepting all found usages as valid.

This function gets sent to the worker processes, so its implementation needs to be serializable via `.toString()` and de-serializable via `eval()`.
It can not use scoped variables, as those don't get serialized with `fn.toString()`

