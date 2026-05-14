import chalk from "chalk";
import fs from "fs";
import path from "path";
import { ApiError, AppListScope, findAppByHandle, getAppCode, listApps } from "../api.js";
import { copyAgentDocsToApp, type CopyAgentDocsResult } from "../agent-docs.js";
import { formatCommand } from "../cli-meta.js";
import {
  getAppPath,
  saveAppConfigToPath,
  appExistsLocally,
  appExistsAtPath,
  AppConfig,
  getAppConfigFromPath,
  getWorkspace,
} from "../config.js";
import {
  buildRemoteRuntimeFiles,
  collectTrackedRuntimeFiles,
  loadBaseSnapshot,
  replaceTrackedRuntimeFiles,
  saveBaseSnapshot,
  type TrackedFileMap,
  writeConflictSnapshot,
  writeIncomingSnapshot,
} from "../sync-state.js";

export interface PullOptions {
  force?: boolean;
  here?: boolean;
  dir?: string;
  agentDocs?: boolean;
  merge?: boolean;
}

interface PullResult {
  appId: string;
  appName: string;
  handle: string;
  appPath: string;
  version: number;
  codeBytes: number;
  cssBytes: number | null;
  fileCount: number;
  agentDocs: CopyAgentDocsResult | null;
  docsOnly: boolean;
  mode: "pulled" | "docs-only" | "merged" | "already-current";
  mergedFiles: number;
  keptLocalFiles: number;
}

interface ResolvedApp {
  appId: string;
  appRef: string;
  usedHandleLookup: boolean;
}

export interface SyncAppsResult {
  total: number;
  pulled: Array<{ handle: string; path: string; agentDocsPath: string | null }>;
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

function sameContent(a: string | undefined, b: string | undefined): boolean {
  return a === b;
}

function mergeRuntimeFiles(
  baseFiles: TrackedFileMap,
  localFiles: TrackedFileMap,
  remoteFiles: TrackedFileMap
): {
  files: TrackedFileMap;
  removePaths: string[];
  conflicts: string[];
  remoteApplied: number;
  localKept: number;
} {
  const files: TrackedFileMap = {};
  const removePaths: string[] = [];
  const conflicts: string[] = [];
  let remoteApplied = 0;
  let localKept = 0;

  const allPaths = new Set([
    ...Object.keys(baseFiles),
    ...Object.keys(localFiles),
    ...Object.keys(remoteFiles),
  ]);

  for (const relPath of [...allPaths].sort()) {
    const base = baseFiles[relPath];
    const local = localFiles[relPath];
    const remote = remoteFiles[relPath];

    if (sameContent(local, remote)) {
      if (local !== undefined) {
        files[relPath] = local;
      }
      continue;
    }

    if (sameContent(local, base)) {
      if (remote !== undefined) {
        files[relPath] = remote;
        remoteApplied += 1;
      } else {
        removePaths.push(relPath);
        remoteApplied += 1;
      }
      continue;
    }

    if (sameContent(remote, base)) {
      if (local !== undefined) {
        files[relPath] = local;
        localKept += 1;
      } else {
        removePaths.push(relPath);
      }
      continue;
    }

    conflicts.push(relPath);
  }

  return { files, removePaths, conflicts, remoteApplied, localKept };
}

function makeAppConfig(appCode: Awaited<ReturnType<typeof getAppCode>>): AppConfig {
  return {
    appId: appCode.id,
    name: appCode.name,
    handle: appCode.handle,
    entryFile: "App.tsx",
    version: appCode.version,
    designSystem: appCode.designSystem,
    appConfig: appCode.appConfig,
  };
}

async function mergePullApp(
  appCode: Awaited<ReturnType<typeof getAppCode>>,
  appPath: string,
  options: PullOptions
): Promise<PullResult> {
  const localConfig = getAppConfigFromPath(appPath);
  if (!localConfig) {
    throw new Error(`No a1zap.json found at ${appPath}. Run without --merge to pull a fresh copy.`);
  }

  if (localConfig.appId !== appCode.id) {
    throw new Error(
      `This folder is for @${localConfig.handle}, not @${appCode.handle}. No files changed.`
    );
  }

  const remoteFiles = buildRemoteRuntimeFiles(appCode);
  const fileCount = Object.keys(remoteFiles).filter((file) => file !== "styles.css").length;

  if (localConfig.version === appCode.version) {
    saveBaseSnapshot(appPath, appCode.version, remoteFiles);
    const agentDocs = copyAgentDocsToApp(appPath);
    return {
      appId: appCode.id,
      appName: appCode.name,
      handle: appCode.handle,
      appPath,
      version: appCode.version,
      codeBytes: appCode.code.length,
      cssBytes: appCode.css ? appCode.css.length : null,
      fileCount,
      agentDocs,
      docsOnly: false,
      mode: "already-current",
      mergedFiles: 0,
      keptLocalFiles: 0,
    };
  }

  if (localConfig.version > appCode.version) {
    throw new Error(
      `Local metadata says @${appCode.handle} is v${localConfig.version}, but remote is v${appCode.version}. No files changed.`
    );
  }

  const baseSnapshot = loadBaseSnapshot(appPath, localConfig.version);
  if (!baseSnapshot) {
    const localFiles = collectTrackedRuntimeFiles(appPath);
    const conflictFiles = [
      ...new Set([...Object.keys(localFiles), ...Object.keys(remoteFiles)]),
    ].sort();
    const incomingPath = writeIncomingSnapshot(appPath, appCode.version, remoteFiles);
    const conflictPath = writeConflictSnapshot(
      appPath,
      appCode.version,
      {},
      localFiles,
      remoteFiles,
      conflictFiles,
      {
        appHandle: appCode.handle,
        localVersion: localConfig.version,
      }
    );
    throw new Error(
      [
        `I cannot safely merge @${appCode.handle} yet because this local copy has no base snapshot for v${localConfig.version}.`,
        "No app files changed.",
        `I saved the latest remote files here: ${incomingPath}`,
        `I also prepared a comparison package here: ${conflictPath}`,
        `To replace local files: ${formatCommand(`pull --force @${appCode.handle}`)}`,
        "To preserve local work, ask Codex to resolve that comparison package.",
      ].join("\n")
    );
  }

  const localFiles = collectTrackedRuntimeFiles(appPath);
  const merge = mergeRuntimeFiles(baseSnapshot.files, localFiles, remoteFiles);

  if (merge.conflicts.length > 0) {
    const conflictPath = writeConflictSnapshot(
      appPath,
      appCode.version,
      baseSnapshot.files,
      localFiles,
      remoteFiles,
      merge.conflicts,
      {
        appHandle: appCode.handle,
        localVersion: localConfig.version,
        baseVersion: baseSnapshot.version,
      }
    );
    throw new Error(
      [
        `Remote v${appCode.version} and your local edits changed the same file(s).`,
        "No app files changed.",
        `Conflict package: ${conflictPath}`,
        `Conflicted files: ${merge.conflicts.join(", ")}`,
        "Ask Codex to resolve that conflict package, then push after the app looks right.",
      ].join("\n")
    );
  }

  replaceTrackedRuntimeFiles(appPath, merge.files, merge.removePaths);
  saveAppConfigToPath(appPath, makeAppConfig(appCode));
  saveBaseSnapshot(appPath, appCode.version, remoteFiles);
  const agentDocs = copyAgentDocsToApp(appPath);

  return {
    appId: appCode.id,
    appName: appCode.name,
    handle: appCode.handle,
    appPath,
    version: appCode.version,
    codeBytes: appCode.code.length,
    cssBytes: appCode.css ? appCode.css.length : null,
    fileCount,
    agentDocs,
    docsOnly: false,
    mode: "merged",
    mergedFiles: merge.remoteApplied,
    keptLocalFiles: merge.localKept,
  };
}

async function pullAppById(appId: string, options: PullOptions): Promise<PullResult> {
  const appCode = await getAppCode(appId);
  const handle = appCode.handle;
  const appPath = getTargetPath(handle, options);
  const remoteFiles = buildRemoteRuntimeFiles(appCode);

  const existsInWorkspace = appExistsLocally(handle);
  const existsAtTarget = appExistsAtPath(appPath);

  if (options.merge && options.force) {
    throw new Error("Use either --merge or --force, not both.");
  }

  if (options.merge && (existsInWorkspace || existsAtTarget)) {
    if (!existsAtTarget) {
      throw new Error(
        `@${handle} already exists in the configured workspace at ${getAppPath(handle)}. Run ${formatCommand(`pull --merge @${handle}`)} from that workspace copy.`
      );
    }
    return mergePullApp(appCode, appPath, options);
  }

  if ((existsInWorkspace || existsAtTarget) && !options.force) {
    if (existsAtTarget) {
      const localConfig = getAppConfigFromPath(appPath);
      if (!localConfig) {
        throw new Error(`App already exists at ${appPath}, but a1zap.json could not be read.`);
      }
      if (localConfig.appId !== appCode.id) {
        throw new Error(
          `App already exists at ${appPath} for @${localConfig.handle}, not @${handle}. No files changed.`
        );
      }

      const agentDocs = copyAgentDocsToApp(appPath);

      return {
        appId: appCode.id,
        appName: appCode.name,
        handle: appCode.handle,
        appPath,
        version: appCode.version,
        codeBytes: appCode.code.length,
        cssBytes: appCode.css ? appCode.css.length : null,
        fileCount:
          appCode.files && Object.keys(appCode.files).length > 1
            ? Object.keys(appCode.files).length
            : 1,
        agentDocs,
        docsOnly: true,
        mode: "docs-only",
        mergedFiles: 0,
        keptLocalFiles: 0,
      };
    }

    if (existsAtTarget) {
      throw new Error(`App already exists at ${appPath}. Use --force to overwrite.`);
    }

    throw new Error(`App already exists in workspace at ${getAppPath(handle)}. Use --force to overwrite.`);
  }

  if (!fs.existsSync(appPath)) {
    fs.mkdirSync(appPath, { recursive: true });
  }

  saveAppConfigToPath(appPath, makeAppConfig(appCode));

  const hasMultiFile = appCode.files && Object.keys(appCode.files).length > 1;
  const removePaths = options.force
    ? Object.keys(collectTrackedRuntimeFiles(appPath)).filter((relPath) => !(relPath in remoteFiles))
    : [];
  replaceTrackedRuntimeFiles(appPath, remoteFiles, removePaths);
  saveBaseSnapshot(appPath, appCode.version, remoteFiles);

  const agentDocs = copyAgentDocsToApp(appPath);

  return {
    appId: appCode.id,
    appName: appCode.name,
    handle: appCode.handle,
    appPath,
    version: appCode.version,
    codeBytes: appCode.code.length,
    cssBytes: appCode.css ? appCode.css.length : null,
    fileCount: hasMultiFile ? Object.keys(appCode.files!).length : 1,
    agentDocs,
    docsOnly: false,
    mode: "pulled",
    mergedFiles: 0,
    keptLocalFiles: 0,
  };
}

async function syncRemoteAppsToWorkspace(
  appScope: AppListScope,
  options: Pick<PullOptions, "agentDocs"> = {}
): Promise<SyncAppsResult> {
  const remoteApps = await listApps({ scope: appScope });
  const result: SyncAppsResult = {
    total: remoteApps.length,
    pulled: [],
    skipped: [],
    failed: [],
  };

  for (const app of remoteApps) {
    if (appExistsLocally(app.handle)) {
      try {
        copyAgentDocsToApp(getAppPath(app.handle));
      } catch (error) {
        result.failed.push({
          handle: app.handle,
          error: error instanceof Error ? error.message : String(error),
        });
        continue;
      }

      result.skipped.push(app.handle);
      continue;
    }

    try {
      const pulled = await pullAppById(app.id, { agentDocs: options.agentDocs });
      result.pulled.push({
        handle: pulled.handle,
        path: pulled.appPath,
        agentDocsPath: pulled.agentDocs?.docsPath ?? null,
      });
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
  if (options.merge) {
    throw new Error(
      `${formatCommand(`pull ${ALL_SYSTEM_PULL_REF}`)} syncs missing system apps only and does not support --merge.`
    );
  }

  console.log(chalk.dim(`Syncing all system apps to ${getWorkspace()}...`));

  let result: SyncAppsResult;
  try {
    result = await syncRemoteAppsToWorkspace("system", { agentDocs: options.agentDocs });
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
    const docsSuffix = app.agentDocsPath ? ` with agent docs at ${chalk.cyan(app.agentDocsPath)}` : "";
    console.log(
      chalk.green("✓") + ` Pulled @${app.handle} to ${chalk.cyan(app.path)}${docsSuffix}`
    );
  }

  for (const handle of result.skipped) {
    console.log(chalk.yellow("!") + ` Skipped @${handle} (already exists locally; refreshed agent docs)`);
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
    if (pulled.docsOnly) {
      console.log(chalk.green("✓") + ` Refreshed agent docs for ${chalk.bold(pulled.appName)} in:`);
    } else if (pulled.mode === "already-current") {
      console.log(chalk.green("✓") + ` ${chalk.bold(pulled.appName)} is already on v${pulled.version}`);
    } else if (pulled.mode === "merged") {
      console.log(chalk.green("✓") + ` Merged remote changes for ${chalk.bold(pulled.appName)} into:`);
    } else {
      console.log(chalk.green("✓") + ` Pulled ${chalk.bold(pulled.appName)} to:`);
    }
    console.log(`  ${chalk.cyan(pulled.appPath)}`);
    console.log("");
    console.log("  Files:");
    if (!pulled.docsOnly) {
      if (pulled.mode === "merged") {
        console.log(`    - ${pulled.mergedFiles} remote change(s) applied`);
        console.log(`    - ${pulled.keptLocalFiles} local change(s) kept`);
      }
      if (pulled.fileCount > 1) {
        console.log(`    - ${pulled.fileCount} source files`);
      } else {
        console.log(`    - App.tsx (${pulled.codeBytes} bytes)`);
      }
      console.log(`    - a1zap.json`);
      if (pulled.cssBytes !== null) {
        console.log(`    - styles.css (${pulled.cssBytes} bytes)`);
      }
    }
    if (pulled.agentDocs) {
      console.log(`    - agent-docs/ (${pulled.agentDocs.docsFileCount} files)`);
      console.log(
        `    - AGENTS.md ${
          pulled.agentDocs.rootAgentFileCreated ? "(created)" : "(kept existing)"
        }`
      );
    }
    console.log("");

    if (pulled.docsOnly) {
      console.log(
        `  App code was left untouched. Use ${chalk.bold(
          formatCommand(`pull --merge @${pulled.handle}`)
        )} to safely merge newer code or ${chalk.bold(
          formatCommand(`pull --force @${pulled.handle}`)
        )} to replace local files.`
      );
      console.log("");
    }

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
