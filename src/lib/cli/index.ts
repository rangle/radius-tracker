#!/usr/bin/env node

import "../checkEngine";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import timelineCommand from "./timelines";
import inplaceCommand from "./inplace";

import reportGenerateTemplateCommand from "./report/generate_template";
import reportCommand from "./report";
import { defineYargsModule } from "./util/defineYargsModule";
import { cacheVersion } from "./util/cacheVersion";

yargs(hideBin(process.argv))
    .scriptName("radius-tracker")
    .command(timelineCommand)
    .command(inplaceCommand)
    .command(reportCommand)
    .command(reportGenerateTemplateCommand)
    .command(defineYargsModule("cache_version", "show cache information", {}, () => console.log(cacheVersion)))
    .strictCommands()
    .demandCommand()
    .recommendCommands()
    .parseAsync();
