import { defineConfig } from "vite";
import { resolve } from "path";
import react from "@vitejs/plugin-react";

/** Deployable guest page; the existing Vite config remains the widget library. */
export default defineConfig({
    base: "./",
    publicDir: false,
    plugins: [react()],
    resolve: { alias: { "@": resolve(__dirname, "src") } },
    build: { outDir: "dist/landing" },
    esbuild: { supported: { "top-level-await": true } },
});
