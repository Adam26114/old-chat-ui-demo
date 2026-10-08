import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    envDir: false,
    publicDir: false,
    optimizeDeps: { entries: ["tests/fixtures/index.html", "tests/fixtures/landing.html"], include: ["socket.io-client", "jwt-decode", "uuid"] },
    define: {
        "import.meta.env.VITE_CHAT_SERVER": JSON.stringify("http://127.0.0.1:4181"),
        "import.meta.env.VITE_CHAT_SERVER_KEY": JSON.stringify("local-ui-test-key"),
    },
});
