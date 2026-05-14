import { Command } from "commander";
import { configCommand, showConfigCommand, setWorkspaceCommand } from "./commands/config.js";
import { listCommand } from "./commands/list.js";
import { pullCommand } from "./commands/pull.js";
import { pushCommand } from "./commands/push.js";
import { devCommand } from "./commands/dev.js";
import { openCommand, listLocalPathsCommand } from "./commands/open.js";
import { createCommand } from "./commands/create.js";
import { attachCommand } from "./commands/attach.js";
import { copyCommand } from "./commands/copy.js";
import { revertCommand, versionsCommand } from "./commands/versions.js";
import { getCliCommandName, getCliDescription } from "./cli-meta.js";

interface BuildCliOptions {
  includeUpdateAlias?: boolean;
}

export function buildCli(options: BuildCliOptions = {}): Command {
  const program = new Command();
  const commandName = getCliCommandName();

  program.name(commandName).description(getCliDescription()).version("0.1.0");

  program
    .command("config [apiKey]")
    .description("Set or show configuration (API key, workspace)")
    .option("-w, --workspace <path>", "Set the workspace directory for apps")
    .action(async (apiKey: string | undefined, cliOptions: { workspace?: string }) => {
      if (cliOptions.workspace) {
        await setWorkspaceCommand(cliOptions.workspace);
      } else if (apiKey) {
        await configCommand(apiKey);
      } else {
        await showConfigCommand();
      }
    });

  program
    .command("list")
    .alias("ls")
    .description("List all available apps with local status")
    .action(async () => {
      await listCommand();
    });

  program
    .command("pull <appIdOrHandle>")
    .description("Download app code to local workspace by handle (@handle or handle) or app ID")
    .option("-f, --force", "Overwrite existing local files")
    .option("--here", "Pull to current directory instead of workspace")
    .option("-d, --dir <path>", "Pull to a specific directory")
    .option("--agent-docs", "Refresh local agent docs (now done on every pull)")
    .option("--merge", "Safely merge newer remote code into an existing local app")
    .action(
      async (
        appIdOrHandle: string,
        cliOptions: { force?: boolean; here?: boolean; dir?: string; agentDocs?: boolean; merge?: boolean }
      ) => {
        await pullCommand(appIdOrHandle, cliOptions);
      }
    );

  program
    .command("create <handle>")
    .description("Create a hello-world mini app template")
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
    .option(
      "--copy <source>",
      "Template source: path to App.tsx (or dir containing it), or source mini app handle/ID"
    )
    .option("--no-pull", "Skip pulling the new app locally after creation")
    .option("--force", "Overwrite local files when pull is enabled")
    .action(
      async (
        handle: string,
        cliOptions: {
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
          copy?: string;
          pull?: boolean;
          force?: boolean;
        }
      ) => {
        await createCommand(handle, cliOptions);
      }
    );

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
        cliOptions: {
          communityHandle?: string;
          communityId?: string;
          status?: string;
          communityDescription?: string;
          featured?: boolean;
          publication?: string;
        }
      ) => {
        await attachCommand(appIdOrHandle, cliOptions);
      }
    );

  program
    .command("copy <sourceAppIdOrHandle> <newHandle>")
    .description("Copy an existing mini app into a new app record")
    .option("-n, --name <name>", "New app display name")
    .option("-d, --description <text>", "New app description")
    .option("--owner <handle>", "Owner user handle (defaults to source app owner)")
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
    .option("--no-pull", "Skip pulling the copied app locally")
    .option("--force", "Overwrite local files when pull is enabled")
    .action(
      async (
        sourceAppIdOrHandle: string,
        newHandle: string,
        cliOptions: {
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
        await copyCommand(sourceAppIdOrHandle, newHandle, cliOptions);
      }
    );

  program
    .command("push [handle]")
    .description("Push local changes to A1Zap platform")
    .option("-m, --message <msg>", "Commit message")
    .action(async (handle: string | undefined, cliOptions: { message?: string }) => {
      await pushCommand(handle, cliOptions);
    });

  program
    .command("versions [appIdOrHandle]")
    .description("List published versions for an app")
    .action(async (appIdOrHandle: string | undefined) => {
      await versionsCommand(appIdOrHandle);
    });

  program
    .command("revert [appIdOrHandle] [version]")
    .alias("rollback")
    .description("Revert an app to an earlier published version")
    .option("-m, --message <msg>", "Commit message")
    .action(
      async (
        appIdOrHandle: string | undefined,
        version: string | undefined,
        cliOptions: { message?: string }
      ) => {
        await revertCommand(appIdOrHandle, version, cliOptions);
      }
    );

  if (options.includeUpdateAlias) {
    program
      .command("update [handle]")
      .description("Alias for push")
      .option("-m, --message <msg>", "Commit message")
      .action(async (handle: string | undefined, cliOptions: { message?: string }) => {
        await pushCommand(handle, cliOptions);
      });
  }

  program
    .command("dev [handle]")
    .description("Start local development server with hot reload")
    .option("-p, --port <port>", "Starting port number; falls back to the next available port", "4321")
    .option("--strict-port", "Fail if the requested port is already in use")
    .action(async (handle: string | undefined, cliOptions: { port: string; strictPort?: boolean }) => {
      await devCommand(handle, cliOptions);
    });

  program
    .command("open <handle>")
    .description("Print the path to an app folder")
    .action(async (handle: string) => {
      await openCommand(handle);
    });

  program.command("--list-local", { hidden: true }).action(async () => {
    await listLocalPathsCommand();
  });

  return program;
}
