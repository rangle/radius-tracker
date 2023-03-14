#!/usr/bin/env node

import "../checkEngine";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import timelineCommand from "./timelines";
import inplaceCommand from "./inplace";

import reportGenerateTemplateCommand from "./report/generate_template";
import reportCommand from "./report";

yargs(hideBin(process.argv))
    .scriptName("radius-tracker")
    .command(timelineCommand)
    .command(inplaceCommand)
    .command(reportCommand)
    .command(reportGenerateTemplateCommand)
    .strictCommands()
    .demandCommand()
    .recommendCommands()
    .parseAsync();
