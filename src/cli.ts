#!/usr/bin/env node
import { program } from "commander";
import { configCommand, showConfigCommand } from "./commands/config.js";
import { listCommand } from "./commands/list.js";
import { pullCommand } from "./commands/pull.js";
import { pushCommand } from "./commands/push.js";
import { devCommand } from "./commands/dev.js";
import { openCommand, listLocalPathsCommand } from "./commands/open.js";

program
  .name("a1zap")
  .description("A1Zap MicroApp local development tool")
  .version("0.1.0");

// Config command
program
  .command("config [apiKey]")
  .description("Set or show API key configuration")
  .action(async (apiKey?: string) => {
    if (apiKey) {
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
  .description("Download app code to local workspace (~/.a1zap/apps/)")
  .option("-f, --force", "Overwrite existing local files")
  .action(async (appIdOrHandle: string, options: { force?: boolean }) => {
    await pullCommand(appIdOrHandle, options);
  });

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
