import { satisfies } from "semver";

const getPkg = () => {
    try { return require("../package.json"); } // In build
    catch (_ignore) { return require("../../package.json"); } // In dev
};
const requiredVersion = getPkg().engines.node;

if (!satisfies(process.version, requiredVersion)) {
    throw new Error(`Unsupported Node version. Expected ${ requiredVersion }, got ${ process.version }`);
}

const hasCheckYarnFlag = process.argv.includes("--check-yarn");
const npmExectPath = process.env.npm_execpath;

if (hasCheckYarnFlag && npmExectPath && !/\byarn\b/.test(npmExectPath)) {
    throw new Error("Please use yarn instead of npm");
}


