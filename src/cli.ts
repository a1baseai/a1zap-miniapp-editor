#!/usr/bin/env node
import { program } from "commander";
import { configCommand, showConfigCommand, setWorkspaceCommand } from "./commands/config.js";
import { listCommand } from "./commands/list.js";
import { pullCommand } from "./commands/pull.js";
import { pushCommand } from "./commands/push.js";
import { devCommand } from "./commands/dev.js";
import { openCommand, listLocalPathsCommand } from "./commands/open.js";
import { createCommand } from "./commands/create.js";
import { attachCommand } from "./commands/attach.js";

program
  .name("a1zap")
  .description("A1Zap MicroApp local development tool")
  .version("0.1.0");

// Config command
program
  .command("config [apiKey]")
  .description("Set or show configuration (API key, workspace)")
  .option("-w, --workspace <path>", "Set the workspace directory for apps")
  .action(async (apiKey: string | undefined, options: { workspace?: string }) => {
    if (options.workspace) {
      await setWorkspaceCommand(options.workspace);
    } else if (apiKey) {
      await configCommand(apiKey);
    } else {
      await showConfigCommand();
    }
  });

// List command
program
  .command("list")
  .alias("ls")
  .description("List all available apps with local status")
  .action(async () => {
    await listCommand();
  });

// Pull command
program
  .command("pull <appIdOrHandle>")
  .description("Download app code to local workspace")
  .option("-f, --force", "Overwrite existing local files")
  .option("--here", "Pull to current directory instead of workspace")
  .option("-d, --dir <path>", "Pull to a specific directory")
  .action(async (appIdOrHandle: string, options: { force?: boolean; here?: boolean; dir?: string }) => {
    await pullCommand(appIdOrHandle, options);
  });

// Create command
program
  .command("create <handle>")
  .description("Create a hello-world mini app template as admin")
  .option("-n, --name <name>", "App display name")
  .option("-d, --description <text>", "App description")
  .option("--owner <handle>", "Owner user handle")
  .option("--owner-handle <handle>", "Owner user handle (legacy alias)")
  .option("--owner-id <id>", "Owner user ID")
  .option("--owner-stack-auth-id <id>", "Owner Stack Auth user ID")
  .option(
    "--publication <status>",
    "Publication status: draft|private|unlisted|public|community_only"
  )
  .option("--community-handle <handle>", "Community handle to attach to")
  .option("--community-id <id>", "Community ID to attach to")
  .option("--community-status <status>", "Community status: pending|approved")
  .option("--community-description <text>", "Community-specific app description")
  .option("--featured", "Mark as featured in community")
  .option("--pull", "Pull the new app locally after creation")
  .option("--force", "Overwrite local files if --pull is used")
  .action(
    async (
      handle: string,
      options: {
        name?: string;
        description?: string;
        owner?: string;
        ownerHandle?: string;
        ownerId?: string;
        ownerStackAuthId?: string;
        publication?: string;
        communityHandle?: string;
        communityId?: string;
        communityStatus?: string;
        communityDescription?: string;
        featured?: boolean;
        pull?: boolean;
        force?: boolean;
      }
    ) => {
      await createCommand(handle, options);
    }
  );

// Attach command
program
  .command("attach <appIdOrHandle>")
  .description("Attach an existing mini app to a community")
  .option("--community-handle <handle>", "Community handle")
  .option("--community-id <id>", "Community ID")
  .option("--status <status>", "Community status: pending|approved")
  .option("--community-description <text>", "Community-specific app description")
  .option("--featured", "Mark as featured in community")
  .option(
    "--publication <status>",
    "Update app publication status first: draft|private|unlisted|public|community_only"
  )
  .action(
    async (
      appIdOrHandle: string,
      options: {
        communityHandle?: string;
        communityId?: string;
        status?: string;
        communityDescription?: string;
        featured?: boolean;
        publication?: string;
      }
    ) => {
      await attachCommand(appIdOrHandle, options);
    }
  );

// Push command
program
  .command("push [handle]")
  .description("Push local changes to A1Zap platform")
  .option("-m, --message <msg>", "Commit message")
  .action(async (handle: string | undefined, options: { message?: string }) => {
    await pushCommand(handle, options);
  });

// Dev command
program
  .command("dev [handle]")
  .description("Start local development server with hot reload")
  .option("-p, --port <port>", "Port number", "4321")
  .action(async (handle: string | undefined, options: { port: string }) => {
    await devCommand(handle, options);
  });

// Open command
program
  .command("open <handle>")
  .description("Print path to app folder (use with: cd $(a1zap open my-app))")
  .action(async (handle: string) => {
    await openCommand(handle);
  });

// Hidden command for shell completion
program
  .command("--list-local", { hidden: true })
  .action(async () => {
    await listLocalPathsCommand();
  });

// Parse and execute
program.parse();
