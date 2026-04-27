import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages — repo 이름이 cryptodashboard 라서 base path도 동일
const REPO = "cryptodashboard";

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? `/${REPO}/` : "/",
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
