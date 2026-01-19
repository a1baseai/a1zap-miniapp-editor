import { getConfig, getApiUrl } from "./config.js";

export interface RemoteApp {
  id: string;
  name: string;
  handle: string;
  description?: string;
  version: number;
  updatedAt?: number;
  ownerId?: string;
}

export interface AppCode {
  id: string;
  name: string;
  handle: string;
  description?: string;
  code: string;
  css?: string;
  entryType: string;
  version: number;
  designSystem?: unknown;
  appConfig?: unknown;
}

export interface PushResult {
  success: boolean;
  version: number;
  message: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Convex HTTP API response format
 * @see https://docs.convex.dev/http-api/
 */
interface ConvexResponse<T> {
  status: "success" | "error";
  value?: T;
  errorMessage?: string;
  errorData?: unknown;
  logLines?: string[];
}

/**
 * Call a Convex query function via HTTP API
 * @see https://docs.convex.dev/http-api/
 */
async function convexQuery<T>(
  functionPath: string,
  args: Record<string, unknown> = {}
): Promise<T> {
  const config = getConfig();
  if (!config.apiKey) {
    throw new Error("Not configured. Run: a1zap config <api-key>");
  }

  const apiUrl = getApiUrl();
  const url = `${apiUrl}/api/query`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Pass API key in args for the function to validate
    },
    body: JSON.stringify({
      path: functionPath,
      args: { ...args, apiKey: config.apiKey },
      format: "json",
    }),
  });

  if (!response.ok) {
    throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status);
  }

  const result = (await response.json()) as ConvexResponse<T>;

  if (result.status === "error") {
    throw new ApiError(result.errorMessage || "Unknown error", 400);
  }

  return result.value as T;
}

/**
 * Call a Convex mutation function via HTTP API
 * @see https://docs.convex.dev/http-api/
 */
async function convexMutation<T>(
  functionPath: string,
  args: Record<string, unknown> = {}
): Promise<T> {
  const config = getConfig();
  if (!config.apiKey) {
    throw new Error("Not configured. Run: a1zap config <api-key>");
  }

  const apiUrl = getApiUrl();
  const url = `${apiUrl}/api/mutation`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: functionPath,
      args: { ...args, apiKey: config.apiKey },
      format: "json",
    }),
  });

  if (!response.ok) {
    throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status);
  }

  const result = (await response.json()) as ConvexResponse<T>;

  if (result.status === "error") {
    throw new ApiError(result.errorMessage || "Unknown error", 400);
  }

  return result.value as T;
}

/**
 * List all available apps
 */
export async function listApps(): Promise<RemoteApp[]> {
  return convexQuery<RemoteApp[]>("developer:listAllApps", {});
}

/**
 * Get app code by ID
 */
export async function getAppCode(appId: string): Promise<AppCode> {
  const result = await convexQuery<AppCode | null>("developer:getAppCode", { appId });
  if (!result) {
    throw new ApiError("App not found", 404);
  }
  return result;
}

/**
 * Push updated code for an app
 */
export async function pushAppCode(
  appId: string,
  code: string,
  commitMessage: string
): Promise<PushResult> {
  return convexMutation<PushResult>("developer:updateAppCode", {
    appId,
    code,
    commitMessage,
  });
}

/**
 * Find an app by handle from the list of remote apps
 */
export async function findAppByHandle(handle: string): Promise<RemoteApp | null> {
  // Remove @ prefix if present
  const cleanHandle = handle.startsWith("@") ? handle.slice(1) : handle;
  const apps = await listApps();
  return apps.find((app) => app.handle === cleanHandle) || null;
}
