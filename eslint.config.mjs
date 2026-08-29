import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Legacy static-site and CommonJS backend sources are deployed separately
    // and are not part of the Next.js TypeScript application.
    "*.js",
    "backend/**/*.js",
    "ecosystem.config.cjs",
  ]),
]);

export default eslintConfig;
