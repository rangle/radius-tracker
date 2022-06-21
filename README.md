# Measure your design system adoption

_Radius tracker_ is a fully automated tool for collecting design system stats from the codebase.

Track and analyze usages of components imported from the design system throughout multiple repositories and their git histories.
Automatically detect low-level homebrew components created directly in the project repo outside the design system.

Try homebrew component detection for public github repos: https://rangle.github.io/radius-tracker/

Ask [Rangle](https://rangle.io/ds-hub/) for advice on design systems.


## Design system as % of all components usages

Features will be built no matter what, and each use case is an opportunity to use either a design system component, or its competition.
Measuring the performance of the design system requires tracking not only the DS components, but also any competing ones.

[This example](https://observablehq.com/@smoogly/design-system-metrics) tracks a proportion `@grafana/ui` takes across all component usages in Grafana & its plugin ecosystem:
[<img width="704" alt="Screenshot 2022-06-21 at 15 19 53" src="https://user-images.githubusercontent.com/6410842/174809230-f2be37c6-2ff2-4912-ba4b-a436dc961471.png">](https://observablehq.com/@smoogly/design-system-metrics)


## Quickstart

Get latest stats from a project on your filesystem:
```sh
npx radius-tracker in-place <path to your project> --targetRe "<design system module or path regexp>"
```

Or get a timeline of stats across multiple projects:
```sh
npx radius-tracker timelines <path to config>
```

Config is a .js file with an array of entries for each repo you want to process. Full definition is [`WorkerConfig`](https://github.com/rangle/radius-tracker/blob/fe510f3de53f519816fcdf83d93b987f3045e947/src/lib/cli/timelines/workerTypes.ts#L5-L8) extending [`StatsConfig.`](https://github.com/rangle/radius-tracker/blob/fe510f3de53f519816fcdf83d93b987f3045e947/src/lib/cli/sharedTypes.ts#L5-L17)

```ts
{
  repoUrl: "https://github.com/company/product",    // Git clone url
  isTargetModuleOrPath: /^@company\/design-system/, // Regexp testing if an import path comes from the design system
  maxWeeks: 52,                                     // How long into history should the tracker look
}
```


## Report

CLI output is an SQLite database with stats.  
Use that database to generate an analysis, for example by forking this report on Grafana: https://observablehq.com/@smoogly/design-system-metrics

SQLite DB contains a `usages` table referring to `projects`, `files`, `components` and `commits`. Each entry is a single usage of a particular component in a file in a commit. Usages are annotated with a `type` — either `homebrew` or `target`, where `target` represents imports from the design system.

This is close to the lowest level of the data available in the tool. Get access to full set of data about usages, including the AST nodes by using [`detectHomebrew`](https://github.com/rangle/radius-tracker/blob/fe510f3de53f519816fcdf83d93b987f3045e947/src/lib/detectHomebrew/detectHomebrew.ts#L41) and [`findUsages`](https://github.com/rangle/radius-tracker/blob/fe510f3de53f519816fcdf83d93b987f3045e947/src/lib/findUsages/findUsages.ts#L64) programmatically in your project. See [CLI implementation](https://github.com/rangle/radius-tracker/blob/fe510f3de53f519816fcdf83d93b987f3045e947/src/lib/cli/collectStats.ts#L23) for reference.


## Calculating the Design System Share

1. [Find design system imports](https://github.com/rangle/radius-tracker/blob/fe510f3de53f519816fcdf83d93b987f3045e947/src/lib/cli/collectStats.ts#L74)
2. [Detect homebrew components](https://github.com/rangle/radius-tracker/blob/fe510f3de53f519816fcdf83d93b987f3045e947/src/lib/cli/collectStats.ts#L99)
3. Find usages of both [components imported from the design system](https://github.com/rangle/radius-tracker/blob/fe510f3de53f519816fcdf83d93b987f3045e947/src/lib/cli/collectStats.ts#L84) and [homebrew components](https://github.com/rangle/radius-tracker/blob/fe510f3de53f519816fcdf83d93b987f3045e947/src/lib/cli/collectStats.ts#L108)
4. Calculate the proportion of one to another.
5. [Repeat for historical commits](https://github.com/rangle/radius-tracker/blob/fe510f3de53f519816fcdf83d93b987f3045e947/src/lib/cli/timelines/getTimelineForOneRepo.ts#L16)
