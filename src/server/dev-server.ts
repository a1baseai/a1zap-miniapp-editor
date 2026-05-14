import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import chokidar from "chokidar";
import fs from "fs";
import path from "path";
import http from "http";
import type { AddressInfo } from "net";
import chalk from "chalk";
import { transform } from "sucrase";
import type { AppConfig } from "../config.js";
import { getPreviewHTML } from "./preview.js";
import { bundleMultiFileApp } from "../bundler.js";

/**
 * Collect all .tsx/.ts files in a directory tree (excluding node_modules, .git, a1zap.json).
 * Returns a map of relative paths to source code.
 */
function collectAppFiles(projectDir: string): Record<string, string> {
  const files: Record<string, string> = {};

  function walk(dir: string, prefix: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, prefix ? `${prefix}/${entry.name}` : entry.name);
      } else if (/\.(tsx?|jsx?)$/.test(entry.name) && entry.name !== "a1zap.json") {
        const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
        files[relPath] = fs.readFileSync(fullPath, "utf-8");
      }
    }
  }

  walk(projectDir, "");
  return files;
}

interface DevServerOptions {
  port: number;
  strictPort?: boolean;
}

const DEV_SERVER_HOST = "127.0.0.1";

function listenWithPortFallback(
  server: http.Server,
  preferredPort: number,
  host: string,
  strictPort: boolean
): Promise<number> {
  return new Promise((resolve, reject) => {
    const tryListen = (port: number) => {
      const handleListening = () => {
        server.off("error", handleError);
        const address = server.address();
        if (!address || typeof address === "string") {
          reject(new Error("Dev server started, but the port could not be determined"));
          return;
        }
        resolve((address as AddressInfo).port);
      };

      const handleError = (error: NodeJS.ErrnoException) => {
        server.off("listening", handleListening);

        if (error.code === "EADDRINUSE" && strictPort) {
          reject(
            new Error(
              `Port ${port} is already in use on ${host}. Choose another port with -p <port>, or omit --strict-port to try the next available port automatically.`
            )
          );
          return;
        }

        if (error.code === "EADDRINUSE" && port < 65535) {
          const nextPort = port + 1;
          console.log(chalk.yellow("!") + ` Port ${port} is in use, trying ${nextPort}...`);
          tryListen(nextPort);
          return;
        }

        reject(error);
      };

      server.once("listening", handleListening);
      server.once("error", handleError);
      server.listen(port, host);
    };

    tryListen(preferredPort);
  });
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
  let activePort = options.port;

  wss.on("error", () => {
    // The HTTP server error handler owns startup failures, including port fallback.
  });

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

  // Serve app code (pre-transpiled, with multi-file bundling)
  app.get("/app-code", (_req, res) => {
    try {
      const files = collectAppFiles(projectDir);
      const fileCount = Object.keys(files).length;

      let bundled: string;
      if (fileCount > 1) {
        // Multi-file: bundle via dependency graph
        console.log(chalk.dim(`  Bundling ${fileCount} files...`));
        bundled = bundleMultiFileApp(files, entryFile);
      } else {
        // Single file: read entry directly
        bundled = fs.readFileSync(entryPath, "utf-8");
      }

      // Strip external imports and prepare for browser execution
      let processed = bundled
        // Remove import statements (external — local ones already stripped by bundler)
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
    res.type("html").send(getPreviewHTML(config, activePort, DEV_SERVER_HOST));
  });

  // Start server
  listenWithPortFallback(server, options.port, DEV_SERVER_HOST, Boolean(options.strictPort))
    .then((resolvedPort) => {
      activePort = resolvedPort;
      console.log("");
      console.log(chalk.bold.green("  A1Zap Dev Server"));
      console.log("");
      console.log(`  ${chalk.dim("App:")}      ${config.name}`);
      console.log(`  ${chalk.dim("Handle:")}   @${config.handle}`);
      console.log(`  ${chalk.dim("Version:")}  v${config.version}`);
      console.log(`  ${chalk.dim("Entry:")}    ${entryFile}`);
      console.log("");
      console.log(`  ${chalk.dim("Preview:")}  ${chalk.cyan(`http://${DEV_SERVER_HOST}:${resolvedPort}`)}`);
      console.log(`  ${chalk.dim("Dir:")}      ${projectDir}`);
      console.log("");
      console.log(chalk.dim("  Watching for changes... Press Ctrl+C to stop."));
      console.log("");
    })
    .catch((error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red("✗") + ` Failed to start dev server: ${errorMessage}`);
      watcher.close();
      wss.close();
      server.close();
      process.exit(1);
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
