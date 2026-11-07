import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    testTimeout: 20_000,
    hookTimeout: 30_000,
    projects: [
      {
        // Unit tests murni: tanpa env file, tanpa mock global.
        test: { name: "unit", include: ["src/**/*.test.ts"] },
      },
      {
        // Test integrasi: butuh env (Supabase/mail.tm) dan mock next/headers.
        test: {
          name: "integration",
          include: ["tests/**/*.test.ts"],
          setupFiles: ["./tests/setup.ts"],
        },
      },
    ],
  },
});
