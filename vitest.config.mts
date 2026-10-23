import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    environment: "jsdom",
    setupFiles: ["./checks/setup.ts"],
    exclude: ["tests/e2e/**", "checks/e2e/**", "node_modules/**"],
    coverage: { include: ["lib/server/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"] },
  },
});
