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

/**
 * Collect all .tsx/.ts files in a directory tree for multi-file push.
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

interface PushOptions {
  message?: string;
}

const PUBLIC_APP_BASE_URL = "https://www.a1zap.com";
const PUBLIC_FEED_BASE_URL = "https://a1zap.com";

function buildAppUrls(appId: string): { publicUrl: string; feedUrl: string; editUrl: string } {
  const publicBaseUrl = PUBLIC_APP_BASE_URL.replace(/\/+$/, "");
  const feedBaseUrl = PUBLIC_FEED_BASE_URL.replace(/\/+$/, "");
  const editBaseUrl = getApiUrl().replace(/\/+$/, "");
  return {
    publicUrl: `${publicBaseUrl}/micro-apps/${appId}`,
    feedUrl: `${feedBaseUrl}/feed?miniApp=${encodeURIComponent(appId)}&miniAppSeconds=45`,
    editUrl: `${editBaseUrl}/micro-apps/${appId}/edit`,
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

    // Collect all source files for multi-file support
    const files = collectAppFiles(appDir);
    const fileCount = Object.keys(files).length;

    if (fileCount > 1) {
      console.log(chalk.dim(`Pushing ${currentAppConfig.name} (${fileCount} files)...`));
    } else {
      console.log(chalk.dim(`Pushing ${currentAppConfig.name}...`));
    }

    const result = await pushAppCode(
      currentAppConfig.appId,
      code,
      commitMessage,
      fileCount > 1 ? files : undefined
    );

    // Update local version
    currentAppConfig.version = result.version;
    saveAppConfig(currentAppConfig.handle, currentAppConfig);
    const { publicUrl, feedUrl, editUrl } = buildAppUrls(currentAppConfig.appId);

    console.log("");
    console.log(
      chalk.green("✓") +
        ` Published ${chalk.bold(currentAppConfig.name)} v${result.version} (revision #${result.revision})`
    );
    console.log(chalk.dim(`  "${commitMessage}"`));
    console.log(`  App URL: ${chalk.cyan(publicUrl)}`);
    console.log(`  Feed URL: ${chalk.cyan(feedUrl)}`);
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
