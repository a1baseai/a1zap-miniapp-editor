import os from "os";
import path from "path";

export type CliVariant = "editor" | "admin";

function getCliVariant(): CliVariant {
  return process.env.A1ZAP_CLI_MODE === "admin" ? "admin" : "editor";
}

export function isWindows(): boolean {
  return process.platform === "win32";
}

export function isAdminCli(): boolean {
  return getCliVariant() === "admin";
}

export function getCliCommandName(): string {
  return isAdminCli() ? "a1zap-admin" : "a1zap";
}

export function getCliDescription(): string {
  return isAdminCli()
    ? "A1Zap MiniApp admin tool"
    : "A1Zap MicroApp local development tool";
}

export function getCliConfigDir(): string {
  return path.join(os.homedir(), isAdminCli() ? ".a1zap-admin" : ".a1zap");
}

export function getCliDefaultWorkspace(): string {
  return path.join(os.homedir(), isAdminCli() ? "a1zap-admin-apps" : "a1zap-apps");
}

export function getApiUrlEnvVarNames(): string[] {
  return isAdminCli() ? ["A1ZAP_ADMIN_API_URL", "A1ZAP_API_URL"] : ["A1ZAP_API_URL"];
}

export function getApiKeyEnvVarNames(): string[] {
  return isAdminCli() ? ["A1ZAP_ADMIN_API_KEY", "A1ZAP_API_KEY"] : ["A1ZAP_API_KEY"];
}

export function getWorkspaceEnvVarNames(): string[] {
  return isAdminCli()
    ? ["A1ZAP_ADMIN_WORKSPACE", "A1ZAP_WORKSPACE"]
    : ["A1ZAP_WORKSPACE"];
}

export function getWorkspaceExamplePath(): string {
  return isWindows() ? "~\\my-path" : "~/my-path";
}

export function formatCommand(args: string): string {
  return `${getCliCommandName()} ${args}`.trim();
}
