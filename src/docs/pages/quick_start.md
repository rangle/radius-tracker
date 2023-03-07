---
title: Quick start
description: Run Radius Tracker for the first time and see the first report. 
---

# Quick start

Run this in a project directory you want to analyze: 
```sh
npx radius-tracker in-place --targetRe "^@corporation/your-designsystem"
```

This way, Tracker will produce a snapshot of component usages from a single target for the files in the current directory.

`--targetRe` is a regexp matched against module specifiers in import statements and require calls:
```js
import { Component } from "module-specifier";
require("module-specifier");
```

Check out `npx radius-tracker in-place --help` for more configuration parameters.


## Next steps

You can [analyze Tracker output](./analysis) as is. However, the in-place run described above
only collects data for the current state of a single project. And running Tracker manually like this
is not sustainable for regularly collecting the data.

Follow the [configuration guide](./configuration_file) to set up a repeatable process of generating Tracker reports.
