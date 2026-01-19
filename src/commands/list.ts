import chalk from "chalk";
import { listApps } from "../api.js";
import { listLocalApps, getWorkspace } from "../config.js";

/**
 * List all available apps with local status
 */
export async function listCommand(): Promise<void> {
  try {
    console.log(chalk.dim("\nFetching apps...\n"));

    const remoteApps = await listApps();
    const localApps = listLocalApps();

    // Create a map of local apps by handle for quick lookup
    const localByHandle = new Map(localApps.map((app) => [app.handle, app]));

    // Header
    console.log(chalk.bold("  Remote Apps") + "                          " + chalk.bold("Local"));
    console.log(chalk.dim("  " + "─".repeat(50)));

    if (remoteApps.length === 0) {
      console.log(chalk.dim("  No apps found"));
    }

    for (const app of remoteApps) {
      const local = localByHandle.get(app.handle);
      const name = `@${app.handle}`.padEnd(25);
      const version = `v${app.version}`.padEnd(10);

      let status: string;
      if (!local) {
        status = chalk.dim("-");
      } else if (local.version < app.version) {
        status = chalk.yellow(`[pulled] (outdated v${local.version})`);
      } else {
        status = chalk.green("[pulled]");
      }

      console.log(`  ${chalk.cyan(name)} ${chalk.dim(version)} ${status}`);
    }

    console.log("");
    console.log(chalk.dim(`  Workspace: ${getWorkspace()}`));
    console.log("");
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red("✗ Error:"), error.message);
    }
    process.exit(1);
  }
}
