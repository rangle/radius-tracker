module.exports = {
    root: true,
    env: { node: true },
    parser: "@typescript-eslint/parser",
    plugins: [
        "@typescript-eslint",
    ],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
    ],
    "rules": {
        // Usages of `{}` and `object` look fine in this repo
        "@typescript-eslint/ban-types": ["error", {
            "extendDefaults": true,
            "types": {
                "{}": false,
                "object": false,
            },
        }],

        // Already handled by typescript
        "@typescript-eslint/no-unused-vars": "off",

        // I don't like it
        "@typescript-eslint/explicit-module-boundary-types": "off",

        // Interface/type delimiter styles, prefer comma
        "@typescript-eslint/member-delimiter-style": ["warn", {
            "multiline": {
                "delimiter": "comma",
                "requireLast": true,
            },
            "singleline": {
                "delimiter": "comma",
                "requireLast": false,
            },
            "multilineDetection": "brackets",
        }],

        // Semicolon
        "semi": "off",
        "@typescript-eslint/semi": ["error"],

        // Trailing comma
        "comma-dangle": "off",
        "@typescript-eslint/comma-dangle": ["error", {
            "arrays": "always-multiline",
            "objects": "always-multiline",
            "imports": "always-multiline",
            "exports": "always-multiline",
            "functions": "always-multiline",
            "enums": "always-multiline",
            "generics": "always-multiline",
            "tuples": "always-multiline",
        }],

        // Quotes
        "quotes": "off",
        "@typescript-eslint/quotes": ["error"],

        // Spacing around type annotations
        "@typescript-eslint/type-annotation-spacing": ["error"],

        // Curly spacing
        "object-curly-spacing": "off",
        "@typescript-eslint/object-curly-spacing": ["error", "always"],

        // Shadowing requires paying close attention during debug
        "no-shadow": "off",
        "@typescript-eslint/no-shadow": ["error"],

        // No extra parens
        "arrow-parens": ["error", "as-needed"],
        "no-extra-parens": "off",
        "@typescript-eslint/no-extra-parens": ["error", "all", {
            "conditionalAssign": true,
            "returnAssign": true,
            "nestedBinaryExpressions": false,
            "enforceForArrowConditionals": true,
            "enforceForSequenceExpressions": true,
            "enforceForNewInMemberExpressions": true,
            "enforceForFunctionPrototypeMethods": true,
        }],

        // Spacing in template curlies
        "template-curly-spacing": ["error", "always"],

        // Indent
        "indent": ["error", 4, { "SwitchCase": 1 , "flatTernaryExpressions": false }],
    },
};
