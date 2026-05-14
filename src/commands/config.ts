import chalk from "chalk";
import path from "path";
import {
  saveConfig,
  getConfig,
  getWorkspace,
  CONFIG_FILE,
  DEFAULT_WORKSPACE,
  expandHomePath,
} from "../config.js";
import { formatCommand, getWorkspaceExamplePath } from "../cli-meta.js";
import { syncAppsToWorkspace } from "./pull.js";

interface ConfigOptions {
  workspace?: string;
}

/**
 * Set the API key for authentication
 */
export async function configCommand(apiKey: string): Promise<void> {
  const currentConfig = getConfig();
  const isFirstConfiguration = !currentConfig.apiKey;

  saveConfig({
    ...currentConfig,
    apiKey,
  });
  console.log(chalk.green("✓") + ` API key saved to ${CONFIG_FILE}`);

  if (!isFirstConfiguration) {
    return;
  }

  console.log("");
  console.log(chalk.dim(`Syncing your apps to ${getWorkspace()}...`));

  try {
    const result = await syncAppsToWorkspace();

    if (result.total === 0) {
      console.log(chalk.dim("No remote apps found yet."));
      console.log("");
      return;
    }

    for (const app of result.pulled) {
      console.log(chalk.green("✓") + ` Pulled @${app.handle} to ${chalk.cyan(app.path)}`);
    }

    for (const handle of result.skipped) {
      console.log(chalk.yellow("!") + ` Skipped @${handle} (already exists locally; refreshed agent docs)`);
    }

    for (const failure of result.failed) {
      console.log(chalk.red("✗") + ` Failed to pull @${failure.handle}: ${failure.error}`);
    }

    console.log("");
    console.log(
      chalk.bold("Initial sync:") +
        ` ${result.pulled.length} pulled, ${result.skipped.length} skipped, ${result.failed.length} failed`
    );
    console.log(chalk.dim(`Workspace: ${getWorkspace()}`));
    console.log("");
  } catch (error) {
    if (error instanceof Error) {
      console.log(chalk.yellow("! ") + `API key saved, but initial sync failed: ${error.message}`);
      console.log(
        chalk.dim(
          `You can still run ${formatCommand("list")} or ${formatCommand("pull @my-app")} once the key is working.`
        )
      );
      console.log("");
      return;
    }

    throw error;
  }
}

/**
 * Set the workspace directory
 */
export async function setWorkspaceCommand(workspacePath: string): Promise<void> {
  const currentConfig = getConfig();
  const resolvedPath = path.resolve(expandHomePath(workspacePath));
  saveConfig({
    ...currentConfig,
    workspace: resolvedPath,
  });
  console.log(chalk.green("✓") + ` Workspace set to ${chalk.cyan(resolvedPath)}`);
}

/**
 * Show current configuration
 */
export async function showConfigCommand(): Promise<void> {
  const config = getConfig();
  const workspace = getWorkspace();
  const isDefaultWorkspace = workspace === DEFAULT_WORKSPACE;

  console.log("\n" + chalk.bold("Current Configuration:"));
  console.log(`  API Key:   ${config.apiKey ? chalk.green("configured") : chalk.yellow("not set")}`);
  console.log(`  Workspace: ${chalk.cyan(workspace)}${isDefaultWorkspace ? chalk.dim(" (default)") : ""}`);
  console.log(`  Config:    ${CONFIG_FILE}`);
  console.log("");
  console.log(
    chalk.dim(`  To change workspace: ${formatCommand(`config --workspace ${getWorkspaceExamplePath()}`)}`)
  );
  console.log("");
}
