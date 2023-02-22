const getPkg = () => {
    try { return require("../package.json"); } // In build
    catch (_ignore) { return require("../../package.json"); } // In dev
};

const packageJson = getPkg();
export const version: string = packageJson.version;
export const requiredNodeVersion: string = packageJson.engines.node;
