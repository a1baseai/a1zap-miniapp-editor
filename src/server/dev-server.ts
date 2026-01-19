import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import chokidar from "chokidar";
import fs from "fs";
import path from "path";
import http from "http";
import chalk from "chalk";
import { transform } from "sucrase";
import type { AppConfig } from "../config.js";
import { getPreviewHTML } from "./preview.js";

interface DevServerOptions {
  port: number;
}

/**
 * Start the development server with hot reload
 */
export function startDevServer(
  projectDir: string,
  config: AppConfig,
  options: DevServerOptions
): void {
  const entryFile = config.entryFile || "App.tsx";
  const entryPath = path.join(projectDir, entryFile);

  if (!fs.existsSync(entryPath)) {
    console.error(chalk.red("✗") + ` Entry file not found: ${entryPath}`);
    process.exit(1);
  }

  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  // Track connected clients
  const clients = new Set<WebSocket>();

  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.on("close", () => clients.delete(ws));
    ws.on("error", () => clients.delete(ws));
  });

  // Watch for file changes
  const watcher = chokidar.watch(projectDir, {
    persistent: true,
    ignoreInitial: true,
    ignored: [
      "**/node_modules/**",
      "**/.git/**",
      "**/a1zap.json",
    ],
  });

  watcher.on("change", (filePath) => {
    const relativePath = path.relative(projectDir, filePath);
    console.log(chalk.cyan("↻") + ` File changed: ${relativePath}`);

    // Notify all connected clients
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: "reload" }));
      }
    }
  });

  // Serve app code (pre-transpiled)
  app.get("/app-code", (_req, res) => {
    try {
      const code = fs.readFileSync(entryPath, "utf-8");
      
      // Strip imports and prepare for browser execution
      let processed = code
        // Remove import statements
        .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?\s*\n?/gm, '')
        // Handle default function export
        .replace(/export\s+default\s+function\s+(\w+)/g, 'function App')
        // Handle default const/expression export
        .replace(/export\s+default\s+/g, 'const App = ');
      
      // Transpile JSX/TypeScript to JavaScript
      const { code: transpiled } = transform(processed, {
        transforms: ["typescript", "jsx"],
        jsxRuntime: "classic",
        production: false,
      });
      
      res.type("text/javascript").send(transpiled);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error(chalk.red("✗ Transpilation error:"), errorMessage);
      res.status(500).json({ error: errorMessage });
    }
  });

  // Serve CSS if it exists
  app.get("/styles.css", (_req, res) => {
    const cssPath = path.join(projectDir, "styles.css");
    if (fs.existsSync(cssPath)) {
      res.type("text/css").sendFile(cssPath);
    } else {
      res.status(404).send("");
    }
  });

  // Serve config
  app.get("/config", (_req, res) => {
    res.json(config);
  });

  // Serve preview HTML
  app.get("/", (_req, res) => {
    res.type("html").send(getPreviewHTML(config, options.port));
  });

  // Start server
  server.listen(options.port, () => {
    console.log("");
    console.log(chalk.bold.green("  A1Zap Dev Server"));
    console.log("");
    console.log(`  ${chalk.dim("App:")}      ${config.name}`);
    console.log(`  ${chalk.dim("Handle:")}   @${config.handle}`);
    console.log(`  ${chalk.dim("Version:")}  v${config.version}`);
    console.log(`  ${chalk.dim("Entry:")}    ${entryFile}`);
    console.log("");
    console.log(`  ${chalk.dim("Preview:")}  ${chalk.cyan(`http://localhost:${options.port}`)}`);
    console.log(`  ${chalk.dim("Dir:")}      ${projectDir}`);
    console.log("");
    console.log(chalk.dim("  Watching for changes... Press Ctrl+C to stop."));
    console.log("");
  });

  // Handle shutdown
  const shutdown = () => {
    console.log(chalk.dim("\n  Shutting down..."));
    watcher.close();
    wss.close();
    server.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
