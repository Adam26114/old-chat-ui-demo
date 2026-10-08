import { defineConfig, loadEnv } from "vite";
import { resolve } from "path";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
    process.env = {...process.env, ...loadEnv(mode, process.cwd(), "")};

    const subfolder = (mode || "production").replaceAll(".", "/");

    return {
        base: process.env.VITE_BASE || "/",
        publicDir: false,
        plugins: [ react() ],
        resolve: { alias: { "@": resolve(__dirname, "src") } },
        build: {
            outDir: `./dist/${subfolder}`,
            lib: {
                entry: resolve(__dirname, "src/components/ChatBot.tsx"),
                name: "chatbot",
                formats: ["es"],
                fileName: (format) => `chatbot.${format}.js`
            }
        },
        define: {
            "process.env.NODE_ENV": `"'${process.env.NODE_ENV || "production"}'"`
        },
        esbuild: {
            supported: {
                "top-level-await": true //browsers can handle top-level-await features
            }
        }
    };
});
