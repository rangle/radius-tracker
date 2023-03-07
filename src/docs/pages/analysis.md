---
title: Analyzing the output
description: Analyze the adoption of your design system with the built-in Radius Tracker report or external tools.
             Learn to generate a Tracker report from your data.
---

# Analyzing the output

[//]: # (TODO: update for locally generated reports)
Tracker generates an SQLite database with entries for each detected component usage and,
by default, writes it to `usages.sqlite` in the current directory.

The easiest way to visualize this data is to plug the database [into the ObservableHQ report](https://observablehq.com/@smoogly/design-system-metrics)
to analyze the design system consumption:
1. Fork the [sample report](https://observablehq.com/@smoogly/design-system-metrics)
2. Replace the attached database with the Tracker output you generated


## Alternative reporting tools

If you want to run an analysis not covered by the default Tracker report, you can connect the usages database
to various data analysis tools.

Both Tableau and Power BI support SQLite as a data source using an [SQLite ODBC Driver.](http://www.ch-werner.de/sqliteodbc/)
Take a look at the [documentation for Tableau](https://help.tableau.com/current/pro/desktop/en-us/odbc_customize.htm)
and for [Power BI.](https://learn.microsoft.com/en-us/power-query/connect-using-generic-interfaces#data-sources-accessible-through-odbc)

Keep track of the [`schemaVersion`](https://github.com/rangle/radius-tracker/blob/17da736e27f325ec3fa7c920b85fd645a0a81a0a/src/lib/cli/processStats.ts#L25)
in the `meta` table — your reports might need to be updated if the schema changes between Tracker version upgrades.
