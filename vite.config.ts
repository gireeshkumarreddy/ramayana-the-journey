import { defineConfig } from "vite";

export default defineConfig({
  server: { port: 5178, host: "127.0.0.1" },
  build: { target: "es2020", assetsInlineLimit: 0 },
});
