import chalk from "chalk";
import fs from "fs";
import path from "path";
import { pushAppCode } from "../api.js";
import {
  getAppPath,
  getAppConfig,
  saveAppConfig,
  detectAppFromCwd,
  detectAppDirFromCwd,
} from "../config.js";

interface PushOptions {
  message?: string;
}

/**
 * Push local changes to the platform
 */
export async function pushCommand(
  handleArg: string | undefined,
  options: PushOptions
): Promise<void> {
  try {
    let appConfig;
    let appDir: string;

    if (handleArg) {
      // Handle provided - use central workspace
      const handle = handleArg.startsWith("@") ? handleArg.slice(1) : handleArg;
      appConfig = getAppConfig(handle);
      appDir = getAppPath(handle);

      if (!appConfig) {
        console.error(
          chalk.red("✗") + ` App not found locally: @${handle}`
        );
        console.log(`  Run: ${chalk.bold(`a1zap pull @${handle}`)}`);
        process.exit(1);
      }
    } else {
      // No handle - try to detect from cwd
      appConfig = detectAppFromCwd();
      const detectedDir = detectAppDirFromCwd();

      if (!appConfig || !detectedDir) {
        console.error(
          chalk.red("✗") + " No app found. Provide a handle or run from an app directory."
        );
        console.log(`  Example: ${chalk.bold("a1zap push @my-app")}`);
        process.exit(1);
      }

      appDir = detectedDir;
    }

    // Read the code file
    const entryFile = appConfig.entryFile || "App.tsx";
    const codePath = path.join(appDir, entryFile);

    if (!fs.existsSync(codePath)) {
      console.error(chalk.red("✗") + ` Entry file not found: ${codePath}`);
      process.exit(1);
    }

    const code = fs.readFileSync(codePath, "utf-8");
    const commitMessage = options.message || "Updated via a1zap dev tool";

    console.log(chalk.dim(`Pushing ${appConfig.name}...`));

    const result = await pushAppCode(appConfig.appId, code, commitMessage);

    // Update local version
    appConfig.version = result.version;
    saveAppConfig(appConfig.handle, appConfig);

    console.log("");
    console.log(
      chalk.green("✓") +
        ` Pushed ${chalk.bold(appConfig.name)} → v${result.version}`
    );
    console.log(chalk.dim(`  ${commitMessage}`));
    console.log("");
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red("✗ Error:"), error.message);
    }
    process.exit(1);
  }
}
