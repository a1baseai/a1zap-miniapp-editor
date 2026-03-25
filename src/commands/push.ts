import chalk from "chalk";
import fs from "fs";
import path from "path";
import { pushAppCode } from "../api.js";
import { formatCommand, getCliCommandName } from "../cli-meta.js";
import { getApiUrl } from "../config.js";
import {
  getAppPath,
  getAppConfig,
  saveAppConfig,
  detectAppFromCwd,
  detectAppDirFromCwd,
  type AppConfig,
} from "../config.js";

interface PushOptions {
  message?: string;
}

function buildAppUrls(appId: string): { publicUrl: string; editUrl: string } {
  const baseUrl = getApiUrl().replace(/\/+$/, "");
  return {
    publicUrl: `${baseUrl}/micro-apps/${appId}`,
    editUrl: `${baseUrl}/micro-apps/${appId}/edit`,
  };
}

/**
 * Push local changes to the platform
 */
export async function pushCommand(
  handleArg: string | undefined,
  options: PushOptions
): Promise<void> {
  try {
    let appConfig: AppConfig | null = null;
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
        console.log(`  Run: ${chalk.bold(formatCommand(`pull @${handle}`))}`);
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
        console.log(`  Example: ${chalk.bold(formatCommand("push @my-app"))}`);
        process.exit(1);
      }

      appDir = detectedDir;
    }

    if (!appConfig) {
      throw new Error("App config could not be loaded");
    }

    // Read the code file
    const entryFile = appConfig.entryFile || "App.tsx";
    const codePath = path.join(appDir, entryFile);

    if (!fs.existsSync(codePath)) {
      console.error(chalk.red("✗") + ` Entry file not found: ${codePath}`);
      process.exit(1);
    }

    const code = fs.readFileSync(codePath, "utf-8");
    const commitMessage = options.message || `Updated via ${getCliCommandName()}`;
    const currentAppConfig = appConfig;

    console.log(chalk.dim(`Pushing ${currentAppConfig.name}...`));

    const result = await pushAppCode(currentAppConfig.appId, code, commitMessage);

    // Update local version
    currentAppConfig.version = result.version;
    saveAppConfig(currentAppConfig.handle, currentAppConfig);
    const { publicUrl, editUrl } = buildAppUrls(currentAppConfig.appId);

    console.log("");
    console.log(
      chalk.green("✓") +
        ` Published ${chalk.bold(currentAppConfig.name)} v${result.version} (revision #${result.revision})`
    );
    console.log(chalk.dim(`  "${commitMessage}"`));
    console.log(`  View: ${chalk.cyan(publicUrl)}`);
    console.log(`  Edit: ${chalk.cyan(editUrl)}`);
    
    if (result.draftWarning) {
      console.log(chalk.yellow("⚠") + ` ${result.draftWarning}`);
    }
    
    console.log("");
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red("✗ Error:"), error.message);
    }
    process.exit(1);
  }
}
