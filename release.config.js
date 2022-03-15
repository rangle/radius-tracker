module.exports = {
    branches: ["main",  { name: "npm-package-deploy", prerelease: true }],
    plugins: [
        ["@semantic-release/commit-analyzer", {
            "releaseRules": [
                { "release": "patch" },
            ],
        }],
        "@semantic-release/release-notes-generator",
        ["@semantic-release/npm", {
            "pkgRoot": "build",
        }],
        "@semantic-release/github",
    ], 
};
