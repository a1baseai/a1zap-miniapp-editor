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
 * Make an authenticated request to the A1Zap API
 */
async function apiRequest<T>(
  method: string,
  endpoint: string,
  body?: unknown
): Promise<T> {
  const config = getConfig();
  if (!config.apiKey) {
    throw new Error("Not configured. Run: a1zap config <api-key>");
  }

  const apiUrl = getApiUrl();
  const url = `${apiUrl}${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      "X-API-Key": config.apiKey,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorBody = (await response.json()) as { error?: string; message?: string };
      errorMessage = errorBody.error || errorBody.message || errorMessage;
    } catch {
      // Ignore JSON parse errors
    }
    throw new ApiError(errorMessage, response.status);
  }

  return response.json() as Promise<T>;
}

/**
 * List all available apps
 */
export async function listApps(): Promise<RemoteApp[]> {
  const result = await apiRequest<{ apps: RemoteApp[] }>("GET", "/api/developer/apps");
  return result.apps;
}

/**
 * Get app code by ID
 */
export async function getAppCode(appId: string): Promise<AppCode> {
  return apiRequest<AppCode>("GET", `/api/developer/apps/${appId}/code`);
}

/**
 * Push updated code for an app
 */
export async function pushAppCode(
  appId: string,
  code: string,
  commitMessage: string
): Promise<PushResult> {
  return apiRequest<PushResult>("PUT", `/api/developer/apps/${appId}/code`, {
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
