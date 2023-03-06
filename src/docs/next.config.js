// eslint-disable-next-line @typescript-eslint/no-var-requires
const nextra = require("nextra");

const isGithubActions = process.env.GITHUB_ACTIONS || false;
const pullRequestNumber = process.env.PR_NUM || false;

let assetPrefix = "/";
let basePath = "";

if (isGithubActions) {
    // trim off <owner>/ from repository name
    const repo = process.env.GITHUB_REPOSITORY.replace(/.*?\//, "");

    assetPrefix = `/${ repo }/`;
    basePath = `/${ repo }`;

    if (pullRequestNumber) {
        assetPrefix += `pull/${ pullRequestNumber }/`;
        basePath += `/pull/${ pullRequestNumber }`;
    }
}

const withNextra = nextra({
    theme: "nextra-theme-docs",
    themeConfig: "./theme.config.jsx",
    staticImage: true,
});

const notSupportedForStaticExport = undefined;
module.exports = {
    ...withNextra({
        assetPrefix,
        basePath,
        images: {
            unoptimized: true,
        },
    }),

    env: {
        assetPrefix, // Expose asset prefix to manually refer to content in `public` directory
    },

    // Rewrites, redirects & headers are serverside features,
    // and not supported in static exports.
    // See: https://nextjs.org/docs/messages/export-no-custom-routes
    rewrites: notSupportedForStaticExport,
    redirects: notSupportedForStaticExport,
    headers: notSupportedForStaticExport,
};
