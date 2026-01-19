import chalk from "chalk";
import { saveConfig, getConfig, CONFIG_FILE } from "../config.js";

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
 * Show current configuration
 */
export async function showConfigCommand(): Promise<void> {
  const config = getConfig();
  console.log("\n" + chalk.bold("Current Configuration:"));
  console.log(`  API Key: ${config.apiKey ? chalk.green("configured") : chalk.yellow("not set")}`);
  console.log(`  Config file: ${CONFIG_FILE}`);
  console.log("");
}
