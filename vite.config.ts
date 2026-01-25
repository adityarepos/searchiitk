import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  base: "/",
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "https://oa.iitk.ac.in",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, "/Oa"),
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    minify: "esbuild",
    target: "esnext",
    cssMinify: true,
    cssCodeSplit: true,
    modulePreload: { polyfill: false },
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-router")) return "router";
            if (id.includes("@tanstack/react-query")) return "query";
            if (id.includes("@radix-ui")) return "ui";
            if (id.includes("lucide-react")) return "icons";
          }
        },
      },
    },
  },
});
