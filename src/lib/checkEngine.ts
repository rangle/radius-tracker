import { satisfies } from "semver";
import { requiredNodeVersion } from "./packageInfo";

if (!satisfies(process.version, requiredNodeVersion)) {
    throw new Error(`Unsupported Node version. Expected ${ requiredNodeVersion }, got ${ process.version }`);
}

const hasCheckYarnFlag = process.argv.includes("--check-yarn");
const npmExectPath = process.env.npm_execpath;

if (hasCheckYarnFlag && npmExectPath && !/\byarn\b/.test(npmExectPath)) {
    throw new Error("Please use yarn instead of npm");
}


