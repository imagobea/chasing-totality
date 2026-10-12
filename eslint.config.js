// typescript-eslint can't run on TypeScript 7 (no JS API), so the root package.json
// aliases "typescript" to the TS 6 API and installs TS 7 as @typescript/native for tsc.
// web/ keeps plain TS 7 because ESLint only runs from the root and never loads web's copy
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default defineConfig(
  { ignores: ["**/dist/", "out/"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["src/**", "test/**", "scripts/**", "*.ts"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["web/**/*.{ts,tsx}"],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
  },
);
