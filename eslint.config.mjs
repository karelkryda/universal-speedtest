import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        ignores: [ "**/node_modules", "**/dist" ],
        languageOptions: {
            parser: tseslint.parser,
            ecmaVersion: "latest",
            sourceType: "module"
        },
        rules: {
            quotes: [ "error", "double" ],
            "keyword-spacing": "error",
            "space-before-blocks": "error",
            "object-curly-spacing": [ "error", "always" ],
            "no-var": "warn",
            semi: "error",
            "semi-style": "error",
            "no-extra-semi": "error",
        }
    }
);
