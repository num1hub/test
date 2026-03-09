import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import importPlugin from "eslint-plugin-import";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      import: importPlugin,
    },
    settings: {
      "import/resolver": {
        typescript: true,
      },
    },
    rules: {
      "import/no-cycle": "error",
      "import/no-unresolved": "error",
    },
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/agents/vaultSteward/*"],
              message:
                'Use "@/lib/agents/vaultSteward" public surface instead of private Vault Steward internals.',
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next_old/**",
    "out/**",
    "build/**",
    "node_modules_old/**",
    "playwright-report/**",
    "test-results/**",
    "coverage/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
