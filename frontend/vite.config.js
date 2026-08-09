import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

const rootDir =
  path.basename(__dirname) === "frontend"
    ? path.resolve(__dirname, "..") // Local: frontend -> project root
    : __dirname;                    // Docker: /app

export default defineConfig({
  plugins: [react()],

  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,

    https: {
      key: fs.readFileSync(path.join(rootDir, "key.pem")),
      cert: fs.readFileSync(path.join(rootDir, "cert.pem")),
    },

    hmr: {
      host: "localhost",
      protocol: "wss",
      port: 5173,
    },
  },
});