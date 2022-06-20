#!/usr/bin/env node

import "../checkEngine";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import timelineCommand from "./timelines";
import inplaceCommand from "./inplace";

yargs(hideBin(process.argv))
    .scriptName("radius-tracker")
    .command(timelineCommand)
    .command(inplaceCommand)
    .strictCommands()
    .demandCommand()
    .recommendCommands()
    .parseAsync();
