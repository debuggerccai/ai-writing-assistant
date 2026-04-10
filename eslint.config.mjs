import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // 让 eslint-plugin-import 能基于 tsconfig 解析 @/* 别名与 .tsx
    settings: {
      "import/resolver": {
        typescript: {
          project: "./tsconfig.json",
        },
      },
    },
    rules: {
      // Airbnb-style import hygiene (compatible with Next defaults)
      "import/first": "error",
      "import/newline-after-import": ["error", { count: 1 }],
      "import/no-duplicates": "error",
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling", "index"],
            "type",
          ],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
          pathGroups: [
            {
              pattern: "@/**",
              group: "internal",
              position: "before",
            },
          ],
          pathGroupsExcludedImportTypes: ["builtin"],
        },
      ],
      "sort-imports": [
        "error",
        {
          ignoreDeclarationSort: true,
          ignoreCase: true,
        },
      ],

      // Do not report declared-but-unused variables
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",

      // Allow console usage
      "no-console": "off",
      "no-duplicate-imports": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Third-party / external copied components
    "components/ai-elements/**",
    "components/ui/**",
    "components/dot-grid.tsx",
  ]),
]);

export default eslintConfig;
