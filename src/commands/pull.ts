import chalk from "chalk";
import fs from "fs";
import path from "path";
import { findAppByHandle, getAppCode } from "../api.js";
import {
  getAppPath,
  saveAppConfig,
  appExistsLocally,
  AppConfig,
} from "../config.js";

interface PullOptions {
  force?: boolean;
}

/**
 * Pull an app from the platform to local storage
 */
export async function pullCommand(
  appIdOrHandle: string,
  options: PullOptions
): Promise<void> {
  try {
    let appId = appIdOrHandle;
    let handle = appIdOrHandle;

    // If it starts with @, it's a handle - find the ID
    if (appIdOrHandle.startsWith("@")) {
      console.log(chalk.dim(`Looking up ${appIdOrHandle}...`));
      const app = await findAppByHandle(appIdOrHandle);
      if (!app) {
        console.error(chalk.red("✗ App not found:"), appIdOrHandle);
        process.exit(1);
      }
      appId = app.id;
      handle = app.handle;
    }

    // Check if already exists locally
    if (appExistsLocally(handle) && !options.force) {
      console.log(
        chalk.yellow("!") +
          ` App already exists locally. Use ${chalk.bold("--force")} to overwrite.`
      );
      process.exit(1);
    }

    console.log(chalk.dim(`Pulling app ${appId}...`));
    const appCode = await getAppCode(appId);

    const appPath = getAppPath(appCode.handle);

    // Create directory if needed
    if (!fs.existsSync(appPath)) {
      fs.mkdirSync(appPath, { recursive: true });
    }

    // Write app config
    const config: AppConfig = {
      appId: appCode.id,
      name: appCode.name,
      handle: appCode.handle,
      entryFile: "App.tsx",
      version: appCode.version,
      designSystem: appCode.designSystem,
      appConfig: appCode.appConfig,
    };
    saveAppConfig(appCode.handle, config);

    // Write code file
    fs.writeFileSync(path.join(appPath, "App.tsx"), appCode.code);

    // Write CSS if present
    if (appCode.css) {
      fs.writeFileSync(path.join(appPath, "styles.css"), appCode.css);
    }

    console.log("");
    console.log(chalk.green("✓") + ` Pulled ${chalk.bold(appCode.name)} to:`);
    console.log(`  ${chalk.cyan(appPath)}`);
    console.log("");
    console.log("  Files:");
    console.log(`    - App.tsx (${appCode.code.length} bytes)`);
    console.log(`    - a1zap.json`);
    if (appCode.css) {
      console.log(`    - styles.css (${appCode.css.length} bytes)`);
    }
    console.log("");
    console.log(`  Next: ${chalk.bold(`a1zap dev @${appCode.handle}`)}`);
    console.log("");
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red("✗ Error:"), error.message);
    }
    process.exit(1);
  }
}
