import chalk from "chalk";
import fs from "fs";
import path from "path";
import { ApiError, AppListScope, findAppByHandle, getAppCode, listApps } from "../api.js";
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
  fileCount: number;
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

const ALL_SYSTEM_PULL_REF = "all-system";

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

  // Restore multi-file structure if available, otherwise write single App.tsx
  const hasMultiFile = appCode.files && Object.keys(appCode.files).length > 1;
  if (hasMultiFile) {
    for (const [relPath, source] of Object.entries(appCode.files!)) {
      const filePath = path.join(appPath, relPath);
      const fileDir = path.dirname(filePath);
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }
      fs.writeFileSync(filePath, source);
    }
  } else {
    fs.writeFileSync(path.join(appPath, "App.tsx"), appCode.code);
  }

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
    fileCount: hasMultiFile ? Object.keys(appCode.files!).length : 1,
  };
}

async function syncRemoteAppsToWorkspace(appScope: AppListScope): Promise<SyncAppsResult> {
  const remoteApps = await listApps({ scope: appScope });
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

export async function syncAppsToWorkspace(): Promise<SyncAppsResult> {
  return syncRemoteAppsToWorkspace("owned");
}

async function pullAllSystemAppsCommand(options: PullOptions): Promise<void> {
  if (options.here || options.dir) {
    throw new Error(
      `${formatCommand(`pull ${ALL_SYSTEM_PULL_REF}`)} only syncs into the configured workspace.`
    );
  }

  if (options.force) {
    throw new Error(
      `${formatCommand(`pull ${ALL_SYSTEM_PULL_REF}`)} always skips apps that already exist locally and does not support --force.`
    );
  }

  console.log(chalk.dim(`Syncing all system apps to ${getWorkspace()}...`));

  let result: SyncAppsResult;
  try {
    result = await syncRemoteAppsToWorkspace("system");
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      throw new Error(`${formatCommand(`pull ${ALL_SYSTEM_PULL_REF}`)} requires the admin master key.`);
    }
    throw error;
  }

  if (result.total === 0) {
    console.log(chalk.dim("No system apps were returned."));
    console.log("");
    return;
  }

  console.log("");

  for (const app of result.pulled) {
    console.log(chalk.green("✓") + ` Pulled @${app.handle} to ${chalk.cyan(app.path)}`);
  }

  for (const handle of result.skipped) {
    console.log(chalk.yellow("!") + ` Skipped @${handle} (already exists locally)`);
  }

  for (const failure of result.failed) {
    console.log(chalk.red("✗") + ` Failed to pull @${failure.handle}: ${failure.error}`);
  }

  console.log("");
  console.log(
    chalk.bold("System sync:") +
      ` ${result.pulled.length} pulled, ${result.skipped.length} skipped, ${result.failed.length} failed`
  );
  console.log(chalk.dim(`Workspace: ${getWorkspace()}`));
  console.log("");
}

export async function pullCommand(
  appIdOrHandle: string,
  options: PullOptions
): Promise<void> {
  try {
    const input = appIdOrHandle.trim();
    if (input === ALL_SYSTEM_PULL_REF) {
      await pullAllSystemAppsCommand(options);
      return;
    }

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
    if (pulled.fileCount > 1) {
      console.log(`  Files: ${pulled.fileCount} source files`);
      console.log(`    - a1zap.json`);
    } else {
      console.log("  Files:");
      console.log(`    - App.tsx (${pulled.codeBytes} bytes)`);
      console.log(`    - a1zap.json`);
    }
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
