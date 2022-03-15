module.exports = {
    branches: ["main",  { name: "npm-package-deploy", prerelease: true }],
    plugins: [
        ["@semantic-release/commit-analyzer", {
            "releaseRules": [
                { "release": "patch" },
            ],
        }],
        ["@semantic-release/npm", {
            "pkgRoot": "build",
        }],
    ], 
};
