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
        assetPrefix += `pull/${pullRequestNumber}/`
        basePath += `/pull/${pullRequestNumber}`
    }
}

const withNextra = nextra({
    theme: "nextra-theme-docs",
    themeConfig: "./theme.config.jsx",
});

module.exports = withNextra({
    assetPrefix,
    basePath,
    images: {
        unoptimized: true,
    },
});
