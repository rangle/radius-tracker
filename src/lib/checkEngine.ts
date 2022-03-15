import { satisfies } from "semver";

const getPkg = () => {
    try { return require("../package.json"); } // In build
    catch (_ignore) { return require("../../package.json"); } // In dev
};
const requiredVersion = getPkg().engines.node;

if (!satisfies(process.version, requiredVersion)) {
    throw new Error(`Unsupported Node version. Expected ${ requiredVersion }, got ${ process.version }`);
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const isNpmNotYarn = Boolean(process.env.npm_execpath) && !/\byarn\b/.test(process.env.npm_execpath!);

if (isNpmNotYarn) {
    throw new Error("Please use yarn instead of npm");
}


