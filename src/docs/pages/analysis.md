---
title: Analyzing the output
description: Analyze the adoption of your design system with the built-in Radius Tracker report or external tools.
             Learn to generate a Tracker report from your data.
---

# Analyzing the output

Tracker generates an SQLite database with entries for each detected component usage and,
by default, writes it to `usages.sqlite.gz` in the current directory. You have a few ways to visualize this data.


## Local report

The easiest way to visualize the Tracker data is by generating a report using
```sh
npx radius-tracker report
```

To view, host the report files on an http server,
for example, using `npx serve ./radius-tracker-report` on a local machine.

This report is entirely self-contained without external references. 
See the [CI integration guide](./ci_integration) for archiving.


## ObservableHQ

We are using the [sample ObservableHQ report](https://observablehq.com/@smoogly/design-system-metrics)
as a template for the local reports. To make changes in that report:
1. Fork the [sample report](https://observablehq.com/@smoogly/design-system-metrics)
2. Replace the attached database with the Tracker database you generated


## Custom templates for local reports

You can use a fork of an ObservableHQ report as a template for a local report generator.
See above for forking the default report. Get an export link from `Export → Download code` of a report you want to use.
See [ObservableHQ export documentation](https://observablehq.com/@observablehq/advanced-embeds#cell-291) for details.

Paste the link into the following command to generate a report template:
```sh
npx radius-tracker report-generate-template https://your-export-url
```

You can then generate the report using your template:
```sh
npx radius-tracker report --template=./path/to/template
```

While this is the same mechanism we use to generate the bundled report template, this is an experimental feature.
Report templates are supposed to be self-contained, and the generator is tightly coupled with the default report
to support that. The API of the report generator is unstable, and there's no guarantee that it will work for you.


## Alternative reporting tools

If you want to run an analysis not covered by the default Tracker report, you can connect the usages database
to various data analysis tools.

Both Tableau and Power BI support SQLite as a data source using an [SQLite ODBC Driver.](http://www.ch-werner.de/sqliteodbc/)
Take a look at the [documentation for Tableau](https://help.tableau.com/current/pro/desktop/en-us/odbc_customize.htm)
and for [Power BI.](https://learn.microsoft.com/en-us/power-query/connect-using-generic-interfaces#data-sources-accessible-through-odbc)

Keep track of the [`schemaVersion`](https://github.com/rangle/radius-tracker/blob/17da736e27f325ec3fa7c920b85fd645a0a81a0a/src/lib/cli/processStats.ts#L25)
in the `meta` table — your reports might need to be updated if the schema changes between Tracker version upgrades.
