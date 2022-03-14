module.exports = {
    branches: ["main", "npm-package-deploy"],
    plugins: [
        ["@semantic-release/commit-analyzer", {
            "releaseRules": [
                { "release": "patch" },
            ],
        }],
    ], 
};
