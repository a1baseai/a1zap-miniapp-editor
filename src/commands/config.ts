import chalk from "chalk";
import path from "path";
import { saveConfig, getConfig, getWorkspace, CONFIG_FILE, DEFAULT_WORKSPACE } from "../config.js";

interface ConfigOptions {
  workspace?: string;
}

/**
 * Set the API key for authentication
 */
export async function configCommand(apiKey: string): Promise<void> {
  const currentConfig = getConfig();
  saveConfig({
    ...currentConfig,
    apiKey,
  });
  console.log(chalk.green("✓") + ` API key saved to ${CONFIG_FILE}`);
}

/**
 * Set the workspace directory
 */
export async function setWorkspaceCommand(workspacePath: string): Promise<void> {
  const currentConfig = getConfig();
  const resolvedPath = path.resolve(workspacePath.replace(/^~/, process.env.HOME || ""));
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
  console.log(chalk.dim("  To change workspace: a1zap config --workspace ~/my-path"));
  console.log("");
}
