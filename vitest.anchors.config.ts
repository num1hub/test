// @anchor script:test.anchors-config links=script:validate.anchors,test:anchors.core-contract,test:anchors.root-docs-contract note="Dedicated Vitest config for Node-based anchor governance tests."
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["__tests__/anchors/**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
