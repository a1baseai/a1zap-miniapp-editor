import chalk from "chalk";
import fs from "fs";
import path from "path";
import { findAppByHandle, getAppCode, listApps } from "../api.js";
import { formatCommand } from "../cli-meta.js";
import {
  getAppPath,
  saveAppConfigToPath,
  appExistsLocally,
  appExistsAtPath,
  AppConfig,
  getWorkspace,
} from "../config.js";

export interface PullOptions {
  force?: boolean;
  here?: boolean;
  dir?: string;
}

interface PullResult {
  appId: string;
  appName: string;
  handle: string;
  appPath: string;
  codeBytes: number;
  cssBytes: number | null;
}

interface ResolvedApp {
  appId: string;
  appRef: string;
  usedHandleLookup: boolean;
}

export interface SyncAppsResult {
  total: number;
  pulled: Array<{ handle: string; path: string }>;
  skipped: string[];
  failed: Array<{ handle: string; error: string }>;
}

function normalizeHandle(value: string): string {
  return value.trim().replace(/^@+/, "");
}

function looksLikeAppId(value: string): boolean {
  return /^[a-z0-9]{20,}$/i.test(value) && !value.includes("-") && !value.includes("_");
}

async function resolveAppId(appIdOrHandle: string): Promise<ResolvedApp> {
  const input = appIdOrHandle.trim();
  if (!input) {
    throw new Error("App ID or handle is required");
  }

  const cleanHandle = normalizeHandle(input);
  const likelyId = !input.startsWith("@") && looksLikeAppId(input);

  if (!likelyId) {
    const app = await findAppByHandle(cleanHandle);
    if (!app) {
      throw new Error(`App not found: ${input}`);
    }
    return {
      appId: app.id,
      appRef: `@${app.handle}`,
      usedHandleLookup: true,
    };
  }

  const handleCandidate = await findAppByHandle(cleanHandle);
  if (handleCandidate) {
    return {
      appId: handleCandidate.id,
      appRef: `@${handleCandidate.handle}`,
      usedHandleLookup: true,
    };
  }

  return {
    appId: input,
    appRef: input,
    usedHandleLookup: false,
  };
}

function getTargetPath(handle: string, options: PullOptions): string {
  const cleanHandle = handle.startsWith("@") ? handle.slice(1) : handle;

  if (options.here) {
    return path.join(process.cwd(), cleanHandle);
  }

  if (options.dir) {
    const resolvedDir = path.resolve(options.dir);
    return path.join(resolvedDir, cleanHandle);
  }

  return getAppPath(handle);
}

async function pullAppById(appId: string, options: PullOptions): Promise<PullResult> {
  const appCode = await getAppCode(appId);
  const handle = appCode.handle;
  const appPath = getTargetPath(handle, options);

  const existsInWorkspace = appExistsLocally(handle);
  const existsAtTarget = appExistsAtPath(appPath);

  if ((existsInWorkspace || existsAtTarget) && !options.force) {
    if (existsAtTarget) {
      throw new Error(`App already exists at ${appPath}. Use --force to overwrite.`);
    }

    throw new Error(`App already exists in workspace at ${getAppPath(handle)}. Use --force to overwrite.`);
  }

  if (!fs.existsSync(appPath)) {
    fs.mkdirSync(appPath, { recursive: true });
  }

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

  fs.writeFileSync(path.join(appPath, "App.tsx"), appCode.code);

  if (appCode.css) {
    fs.writeFileSync(path.join(appPath, "styles.css"), appCode.css);
  }

  return {
    appId: appCode.id,
    appName: appCode.name,
    handle: appCode.handle,
    appPath,
    codeBytes: appCode.code.length,
    cssBytes: appCode.css ? appCode.css.length : null,
  };
}

export async function syncAppsToWorkspace(): Promise<SyncAppsResult> {
  const remoteApps = await listApps();
  const result: SyncAppsResult = {
    total: remoteApps.length,
    pulled: [],
    skipped: [],
    failed: [],
  };

  for (const app of remoteApps) {
    if (appExistsLocally(app.handle)) {
      result.skipped.push(app.handle);
      continue;
    }

    try {
      const pulled = await pullAppById(app.id, {});
      result.pulled.push({ handle: pulled.handle, path: pulled.appPath });
    } catch (error) {
      result.failed.push({
        handle: app.handle,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}

export async function pullCommand(
  appIdOrHandle: string,
  options: PullOptions
): Promise<void> {
  try {
    const input = appIdOrHandle.trim();
    const resolved = await resolveAppId(input);
    if (resolved.usedHandleLookup) {
      console.log(chalk.dim(`Looking up ${resolved.appRef}...`));
    }

    const appId = resolved.appId;
    console.log(chalk.dim(`Pulling app ${appId}...`));
    const pulled = await pullAppById(appId, options);

    console.log("");
    console.log(chalk.green("✓") + ` Pulled ${chalk.bold(pulled.appName)} to:`);
    console.log(`  ${chalk.cyan(pulled.appPath)}`);
    console.log("");
    console.log("  Files:");
    console.log(`    - App.tsx (${pulled.codeBytes} bytes)`);
    console.log(`    - a1zap.json`);
    if (pulled.cssBytes !== null) {
      console.log(`    - styles.css (${pulled.cssBytes} bytes)`);
    }
    console.log("");

    if (options.here || options.dir) {
      console.log(`  Folder: ${chalk.cyan(pulled.appPath)}`);
      console.log(`  Run from that folder: ${chalk.bold(formatCommand("dev"))}`);
    } else {
      console.log(`  Workspace: ${chalk.dim(getWorkspace())}`);
      console.log(`  Start dev: ${chalk.bold(formatCommand(`dev @${pulled.handle}`))}`);
      console.log(`  Folder: ${chalk.cyan(pulled.appPath)}`);
    }
    console.log("");
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red("✗ Error:"), error.message);
    }
    process.exit(1);
  }
}
