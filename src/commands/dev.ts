import chalk from "chalk";
import {
  getAppPath,
  getAppConfig,
  detectAppFromCwd,
  detectAppDirFromCwd,
} from "../config.js";
import { startDevServer } from "../server/dev-server.js";

interface DevOptions {
  port: string;
}

/**
 * Start the development server
 */
export async function devCommand(
  handleArg: string | undefined,
  options: DevOptions
): Promise<void> {
  let appConfig;
  let appDir: string;

  if (handleArg) {
    // Handle provided - use central workspace
    const handle = handleArg.startsWith("@") ? handleArg.slice(1) : handleArg;
    appConfig = getAppConfig(handle);
    appDir = getAppPath(handle);

    if (!appConfig) {
      console.error(chalk.red("✗") + ` App not found locally: @${handle}`);
      console.log(`  Run: ${chalk.bold(`a1zap pull @${handle}`)}`);
      process.exit(1);
    }
  } else {
    // No handle - try to detect from cwd
    appConfig = detectAppFromCwd();
    const detectedDir = detectAppDirFromCwd();

    if (!appConfig || !detectedDir) {
      console.error(
        chalk.red("✗") +
          " No app found. Provide a handle or run from an app directory."
      );
      console.log(`  Example: ${chalk.bold("a1zap dev @my-app")}`);
      process.exit(1);
    }

    appDir = detectedDir;
  }

  const port = parseInt(options.port, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    console.error(chalk.red("✗") + " Invalid port number");
    process.exit(1);
  }

  startDevServer(appDir, appConfig, { port });
}
