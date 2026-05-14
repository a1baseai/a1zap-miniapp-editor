import chalk from "chalk";
import {
  ApiError,
  findAppByHandle,
  listAppVersions,
  revertAppToVersion,
  type AppVersion,
} from "../api.js";
import { formatCommand, getCliCommandName } from "../cli-meta.js";
import {
  detectAppDirFromCwd,
  detectAppFromCwd,
  getAppConfig,
  getAppPath,
  type AppConfig,
} from "../config.js";

interface ResolvedAppRef {
  appId: string;
  label: string;
  localConfig: AppConfig | null;
  localDir: string | null;
}

interface RevertOptions {
  message?: string;
}

function parseVersionInput(value: string | undefined): number | null {
  if (!value) return null;
  const normalized = value.trim().replace(/^v/i, "");
  if (!/^\d+$/.test(normalized)) return null;
  return Number(normalized);
}

async function resolveAppRef(appIdOrHandle: string | undefined): Promise<ResolvedAppRef> {
  if (!appIdOrHandle) {
    const localConfig = detectAppFromCwd();
    const localDir = detectAppDirFromCwd();
    if (!localConfig) {
      throw new Error(
        `No app found. Provide a handle or run from an app directory. Example: ${formatCommand("versions @my-app")}`
      );
    }

    return {
      appId: localConfig.appId,
      label: `@${localConfig.handle}`,
      localConfig,
      localDir,
    };
  }

  const cleanRef = appIdOrHandle.trim();
  const cleanHandle = cleanRef.replace(/^@/, "");
  const remoteByHandle = await findAppByHandle(cleanHandle);
  if (remoteByHandle) {
    return {
      appId: remoteByHandle.id,
      label: `@${remoteByHandle.handle}`,
      localConfig: getAppConfig(remoteByHandle.handle),
      localDir: getAppConfig(remoteByHandle.handle) ? getAppPath(remoteByHandle.handle) : null,
    };
  }

  return {
    appId: cleanRef,
    label: cleanRef,
    localConfig: null,
    localDir: null,
  };
}

function formatPublishedAt(version: AppVersion): string {
  const timestamp = version.publishedAt ?? version.updatedAt ?? version.createdAt;
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleString();
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${Math.round(bytes / 1024)} KB`;
}

function printVersions(appLabel: string, liveVersion: number, versions: AppVersion[]): void {
  console.log("");
  console.log(chalk.bold(`Published versions for ${appLabel}`));
  console.log(chalk.dim(`Live: v${liveVersion}`));
  console.log("");

  if (versions.length === 0) {
    console.log(chalk.dim("  No published versions found."));
    console.log("");
    return;
  }

  console.log(
    `  ${chalk.bold("Version".padEnd(12))}${chalk.bold("Revision".padEnd(12))}${chalk.bold("Size".padEnd(10))}${chalk.bold("Published")}`
  );
  console.log(chalk.dim("  " + "-".repeat(64)));

  for (const version of versions) {
    const versionLabel = `v${version.version}${version.isLive ? " live" : ""}`.padEnd(12);
    const revisionLabel = `#${version.revision}`.padEnd(12);
    const sizeLabel = formatSize(version.sizeBytes).padEnd(10);
    console.log(
      `  ${chalk.cyan(versionLabel)}${chalk.dim(revisionLabel)}${chalk.dim(sizeLabel)}${chalk.dim(formatPublishedAt(version))}`
    );
  }

  console.log("");
}

function printLocalSyncHint(result: {
  handle: string;
  appId: string;
  newVersion: number;
}): void {
  const cwdConfig = detectAppFromCwd();
  const workspaceConfig = getAppConfig(result.handle);
  const matchingLocal =
    cwdConfig?.appId === result.appId
      ? cwdConfig
      : workspaceConfig?.appId === result.appId
        ? workspaceConfig
        : null;

  if (matchingLocal) {
    console.log(
      chalk.yellow("!") +
        ` Local copy @${matchingLocal.handle} is now behind (local v${matchingLocal.version}, remote v${result.newVersion}).`
    );
    console.log(`  Safely bring it in: ${chalk.bold(formatCommand(`pull --merge @${result.handle}`))}`);
    console.log(`  Replace local files: ${chalk.bold(formatCommand(`pull --force @${result.handle}`))}`);
  } else {
    console.log(`  Pull it locally: ${chalk.bold(formatCommand(`pull @${result.handle}`))}`);
  }
}

export async function versionsCommand(appIdOrHandle: string | undefined): Promise<void> {
  try {
    console.log(chalk.dim("Fetching published versions..."));
    const appRef = await resolveAppRef(appIdOrHandle);
    const result = await listAppVersions(appRef.appId);
    printVersions(`@${result.app.handle}`, result.app.version, result.versions);
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red("✗ Error:"), error.message);
    }
    process.exit(1);
  }
}

export async function revertCommand(
  appIdOrHandleOrVersion: string | undefined,
  versionArg: string | undefined,
  options: RevertOptions
): Promise<void> {
  try {
    const targetVersion =
      versionArg !== undefined
        ? parseVersionInput(versionArg)
        : parseVersionInput(appIdOrHandleOrVersion);
    const appRefArg = versionArg !== undefined ? appIdOrHandleOrVersion : undefined;

    if (!targetVersion) {
      throw new Error(
        `Provide a version to revert to. Examples: ${formatCommand("revert @my-app v12")} or ${formatCommand("revert v12")}`
      );
    }

    const appRef = await resolveAppRef(appRefArg);
    const versions = await listAppVersions(appRef.appId);
    const target = versions.versions.find((version) => version.version === targetVersion);
    if (!target) {
      throw new Error(`@${versions.app.handle} does not have a published v${targetVersion}.`);
    }
    if (target.isLive) {
      throw new Error(`@${versions.app.handle} is already on v${targetVersion}.`);
    }

    console.log(
      chalk.dim(
        `Reverting @${versions.app.handle} from v${versions.app.version} to v${targetVersion}...`
      )
    );

    const commitMessage =
      options.message || `Reverted to v${targetVersion} via ${getCliCommandName()}`;
    const result = await revertAppToVersion(appRef.appId, targetVersion, commitMessage);

    console.log("");
    console.log(
      chalk.green("✓") +
        ` Reverted ${chalk.bold(`@${result.handle}`)} to v${result.fromVersion}; published as v${result.newVersion} (revision #${result.revision})`
    );
    console.log(chalk.dim(`  "${commitMessage}"`));
    printLocalSyncHint(result);
    console.log("");
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      console.error(chalk.red("✗ Not found:"), error.message);
      process.exit(1);
    }

    if (error instanceof Error) {
      console.error(chalk.red("✗ Error:"), error.message);
    }
    process.exit(1);
  }
}
