import { satisfies } from "semver";

import * as commandExists from "command-exists";

const getPkg = () => {
    try { return require("../package.json"); } // In build
    catch (_ignore) { return require("../../package.json"); } // In dev
};
const requiredVersion = getPkg().engines.node;

if (!satisfies(process.version, requiredVersion)) {
    throw new Error(`Unsupported Node version. Expected ${ requiredVersion }, got ${ process.version }`);
}

if (commandExists.sync("npm")) {
    throw new Error("Please use yarn instead of npm");
}
