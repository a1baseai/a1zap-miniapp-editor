import fs from "fs";
import { getAppPath, getWorkspace, appExistsLocally } from "../config.js";

/**
 * Print the path to an app's directory
 * Useful for: cd $(a1zap open my-app)
 */
export async function openCommand(handle: string): Promise<void> {
  const cleanHandle = handle.startsWith("@") ? handle.slice(1) : handle;

  if (!appExistsLocally(cleanHandle)) {
    console.error(`App not found locally: @${cleanHandle}`);
    process.exit(1);
  }

  const appPath = getAppPath(cleanHandle);
  
  // Just print the path - no decoration so it can be used in shell commands
  console.log(appPath);
}

/**
 * List all local app paths (for shell completion)
 */
export async function listLocalPathsCommand(): Promise<void> {
  const workspace = getWorkspace();

  if (!fs.existsSync(workspace)) {
    return;
  }

  const entries = fs.readdirSync(workspace, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      console.log(entry.name);
    }
  }
}
