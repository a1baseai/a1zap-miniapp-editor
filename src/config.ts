import fs from "fs";
import path from "path";
import os from "os";

export interface A1ZapConfig {
  apiKey: string | null;
  apiUrl?: string;
}

export interface AppConfig {
  appId: string;
  name: string;
  handle: string;
  entryFile: string;
  version: number;
  designSystem?: unknown;
  appConfig?: unknown;
}

// Base directories
export const CONFIG_DIR = path.join(os.homedir(), ".a1zap");
export const APPS_DIR = path.join(CONFIG_DIR, "apps");
export const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

// Default API URL (Next.js app - using www to avoid redirect)
export const DEFAULT_API_URL = "https://www.a1zap.com";

/**
 * Ensure the config directory structure exists
 */
export function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  if (!fs.existsSync(APPS_DIR)) {
    fs.mkdirSync(APPS_DIR, { recursive: true });
  }
}

/**
 * Get the global config
 */
export function getConfig(): A1ZapConfig {
  ensureConfigDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    return { apiKey: null };
  }
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
  } catch {
    return { apiKey: null };
  }
}

/**
 * Save the global config
 */
export function saveConfig(config: A1ZapConfig): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

/**
 * Get the API URL from config or environment
 */
export function getApiUrl(): string {
  return process.env.A1ZAP_API_URL || getConfig().apiUrl || DEFAULT_API_URL;
}

/**
 * Get the path to an app's directory
 */
export function getAppPath(handle: string): string {
  // Remove @ prefix if present
  const cleanHandle = handle.startsWith("@") ? handle.slice(1) : handle;
  return path.join(APPS_DIR, cleanHandle);
}

/**
 * Get the path to an app's config file
 */
export function getAppConfigPath(handle: string): string {
  return path.join(getAppPath(handle), "a1zap.json");
}

/**
 * Check if an app exists locally
 */
export function appExistsLocally(handle: string): boolean {
  return fs.existsSync(getAppConfigPath(handle));
}

/**
 * Read an app's local config
 */
export function getAppConfig(handle: string): AppConfig | null {
  const configPath = getAppConfigPath(handle);
  if (!fs.existsSync(configPath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Save an app's local config
 */
export function saveAppConfig(handle: string, config: AppConfig): void {
  const appPath = getAppPath(handle);
  if (!fs.existsSync(appPath)) {
    fs.mkdirSync(appPath, { recursive: true });
  }
  fs.writeFileSync(
    path.join(appPath, "a1zap.json"),
    JSON.stringify(config, null, 2)
  );
}

/**
 * List all locally pulled apps
 */
export function listLocalApps(): AppConfig[] {
  ensureConfigDir();
  if (!fs.existsSync(APPS_DIR)) {
    return [];
  }

  const apps: AppConfig[] = [];
  const entries = fs.readdirSync(APPS_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const config = getAppConfig(entry.name);
      if (config) {
        apps.push(config);
      }
    }
  }

  return apps;
}

/**
 * Detect if the current working directory is inside an app folder
 * Returns the app config if found, null otherwise
 */
export function detectAppFromCwd(): AppConfig | null {
  let currentDir = process.cwd();

  // Walk up the directory tree looking for a1zap.json
  while (currentDir !== path.dirname(currentDir)) {
    const configPath = path.join(currentDir, "a1zap.json");
    if (fs.existsSync(configPath)) {
      try {
        return JSON.parse(fs.readFileSync(configPath, "utf-8"));
      } catch {
        return null;
      }
    }
    currentDir = path.dirname(currentDir);
  }

  return null;
}

/**
 * Get the app directory from cwd detection
 */
export function detectAppDirFromCwd(): string | null {
  let currentDir = process.cwd();

  while (currentDir !== path.dirname(currentDir)) {
    const configPath = path.join(currentDir, "a1zap.json");
    if (fs.existsSync(configPath)) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  return null;
}
