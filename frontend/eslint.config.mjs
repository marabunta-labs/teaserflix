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
  ]),
  {
    rules: {
      // React 19's strict rule flags legitimate async setState patterns (fetch → setState)
      // Downgrade to warning — the dangerous pattern (sync setState in layout effects) is rare in this codebase
      "react-hooks/set-state-in-effect": "warn",
      // External images from TMDB CDN are not suitable for next/image optimization
      "@next/next/no-img-element": "off",
      // ReactPlayer and YouTube iFrame API have no type definitions — any is required
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]);

export default eslintConfig;
