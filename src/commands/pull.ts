import chalk from "chalk";
import fs from "fs";
import path from "path";
import { findAppByHandle, getAppCode } from "../api.js";
import {
  getAppPath,
  saveAppConfigToPath,
  appExistsLocally,
  appExistsAtPath,
  AppConfig,
  getWorkspace,
} from "../config.js";

interface PullOptions {
  force?: boolean;
  here?: boolean;
  dir?: string;
}

/**
 * Determine the target directory for pulling an app
 */
function getTargetPath(handle: string, options: PullOptions): string {
  const cleanHandle = handle.startsWith("@") ? handle.slice(1) : handle;

  if (options.here) {
    // Pull to current directory with app name as subfolder
    return path.join(process.cwd(), cleanHandle);
  }

  if (options.dir) {
    // Pull to specified directory with app name as subfolder
    const resolvedDir = path.resolve(options.dir);
    return path.join(resolvedDir, cleanHandle);
  }

  // Default: pull to workspace
  return getAppPath(handle);
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

    // Determine target path
    const appPath = getTargetPath(handle, options);

    // Check if already exists
    const existsInWorkspace = appExistsLocally(handle);
    const existsAtTarget = appExistsAtPath(appPath);

    if ((existsInWorkspace || existsAtTarget) && !options.force) {
      if (existsAtTarget) {
        console.log(
          chalk.yellow("!") +
            ` App already exists at ${chalk.cyan(appPath)}`
        );
      } else {
        console.log(
          chalk.yellow("!") +
            ` App already exists in workspace at ${chalk.cyan(getAppPath(handle))}`
        );
      }
      console.log(`  Use ${chalk.bold("--force")} to overwrite.`);
      process.exit(1);
    }

    console.log(chalk.dim(`Pulling app ${appId}...`));
    const appCode = await getAppCode(appId);

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
    saveAppConfigToPath(appPath, config);

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

    // Show next steps based on location
    if (options.here || options.dir) {
      console.log(`  Next: ${chalk.bold(`cd ${path.basename(appPath)} && a1zap dev`)}`);
    } else {
      console.log(`  Workspace: ${chalk.dim(getWorkspace())}`);
      console.log(`  Next: ${chalk.bold(`cd $(a1zap open ${appCode.handle}) && cursor .`)}`);
    }
    console.log("");
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red("✗ Error:"), error.message);
    }
    process.exit(1);
  }
}
