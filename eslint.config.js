import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

/** Modules that would let frontend-layer code run processes or shell text. */
const PROCESS_MODULES = [
  "child_process",
  "node:child_process",
  "worker_threads",
  "node:worker_threads",
  "cross-spawn",
  "execa",
  "shelljs",
  "@tauri-apps/plugin-shell",
  "@tauri-apps/plugin-process",
];

const processImports = PROCESS_MODULES.map((name) => ({
  name,
  message:
    "Processes and shell text are runtime-owned. Frontend code must go through the typed RuntimeClient.",
}));

/** Runtime-owned policy: the UI displays reported state and never derives permissions itself. */
const POLICY_IMPORTS = [
  {
    name: "@mdx-studio/simulation-model",
    importNames: [
      "transition",
      "canTransition",
      "availableEvents",
      "isTerminal",
      "reachableStates",
      "allowedJobActions",
      "deviceAcceptsJobs",
      "JOB_MACHINE",
    ],
    message:
      "State-machine and gating policy is runtime-owned. Display the state/allowedActions/startPermitted the runtime reports instead of recomputing them.",
  },
];

const rawCommandText = [
  {
    selector: "Literal[value=/\\b(gmx|mdrun|grompp)\\b/i]",
    message:
      "Frontend code must not contain raw GROMACS command text; the runtime builds commands.",
  },
  {
    selector: "TemplateElement[value.raw=/\\b(gmx|mdrun|grompp)\\b/i]",
    message:
      "Frontend code must not contain raw GROMACS command text; the runtime builds commands.",
  },
  {
    selector: "JSXText[value=/\\b(gmx|mdrun|grompp)\\b/i]",
    message:
      "Frontend code must not contain raw GROMACS command text; the runtime builds commands.",
  },
  {
    selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
    message: "Do not inject raw HTML; render runtime data as text.",
  },
];

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/target/**",
      "**/gen/**",
      "**/coverage/**",
      "packages/protocol/schema/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  reactHooks.configs.flat.recommended,

  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.browser },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "no-eval": "error",
      "no-new-func": "error",
      "no-implied-eval": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      // JSX event handlers frequently pass void-returning arrow functions.
      "@typescript-eslint/no-confusing-void-expression": ["error", { ignoreArrowShorthand: true }],
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true, allowBoolean: true },
      ],
      // Index-signature access uses brackets on purpose (tsconfig: noPropertyAccessFromIndexSignature).
      "@typescript-eslint/dot-notation": ["error", { allowIndexSignaturePropertyAccess: true }],
      "@typescript-eslint/array-type": ["error", { default: "array", readonly: "array" }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  // Frontend layers: desktop app + reusable UI. No processes, no raw commands, no policy.
  {
    files: ["apps/desktop/src/**/*.{ts,tsx}", "packages/ui/src/**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}", "apps/desktop/src/test/**", "packages/ui/test/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [...processImports, ...POLICY_IMPORTS],
          patterns: [
            {
              group: ["@tauri-apps/*"],
              message:
                "Only apps/desktop/src/app/bridge.ts may talk to Tauri, and only via read-only commands.",
            },
          ],
        },
      ],
      "no-restricted-syntax": ["error", ...rawCommandText],
    },
  },
  // The single sanctioned Tauri touchpoint.
  {
    files: ["apps/desktop/src/app/bridge.ts"],
    rules: {
      "no-restricted-imports": ["error", { paths: [...processImports, ...POLICY_IMPORTS] }],
    },
  },

  // Environment-agnostic packages must not reach for Node/process APIs.
  {
    files: [
      "packages/protocol/src/**/*.ts",
      "packages/simulation-model/src/**/*.ts",
      "packages/runtime-client/src/**/*.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            ...processImports,
            { name: "react", message: "Domain packages are UI-agnostic." },
          ],
          patterns: [
            {
              group: ["node:*", "fs", "path", "os", "net", "http", "https"],
              message: "Keep domain packages environment-agnostic.",
            },
            {
              group: ["@tauri-apps/*"],
              message: "Domain packages must not depend on the desktop shell.",
            },
          ],
        },
      ],
    },
  },
  // Pure domain packages (not the mock runtime) also carry no raw command text.
  {
    files: ["packages/protocol/src/**/*.ts", "packages/simulation-model/src/**/*.ts"],
    rules: { "no-restricted-syntax": ["error", ...rawCommandText] },
  },

  // Node-side scripts and repo tests.
  {
    files: [
      "packages/protocol/scripts/**/*.ts",
      "tests/**/*.ts",
      "**/vite.config.ts",
      "**/vitest.config.ts",
    ],
    languageOptions: { globals: { ...globals.node } },
  },

  // Plain JS config files are not part of a TS project.
  {
    files: ["**/*.{js,mjs,cjs}"],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: { ...globals.node } },
  },
);
