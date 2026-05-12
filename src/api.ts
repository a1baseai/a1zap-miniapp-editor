import { getApiKey, getApiUrl } from "./config.js";
import { formatCommand, getApiKeyEnvVarNames } from "./cli-meta.js";

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
  files?: Record<string, string>;
}

export interface PushResult {
  success: boolean;
  version: number;
  revision: number;
  message: string;
  draftWarning?: string;
}

export type AppListScope = "owned" | "system";

export type PublicationStatus =
  | "draft"
  | "private"
  | "unlisted"
  | "public"
  | "community_only";

export type CommunitySubmissionStatus = "pending" | "approved";

export interface CreateTemplateAppParams {
  handle: string;
  name?: string;
  description?: string;
  ownerUserId?: string;
  ownerHandle?: string;
  ownerStackAuthId?: string;
  publicationStatus?: PublicationStatus;
  communityId?: string;
  communityHandle?: string;
  communitySubmissionStatus?: CommunitySubmissionStatus;
  communityDescription?: string;
  isFeaturedInCommunity?: boolean;
  templateCode?: string;
}

export interface CreateTemplateAppResult {
  app: {
    id: string;
    name: string;
    handle: string;
    description?: string;
    publicationStatus: PublicationStatus;
    ownerId: string;
    version: number;
  };
  communityLink: {
    submissionId: string;
    communityId: string;
    communityHandle: string;
    status: CommunitySubmissionStatus;
    communityInstanceId: string | null;
    alreadyExisted: boolean;
    wasUpdated: boolean;
  } | null;
}

export interface AttachAppToCommunityParams {
  communityId?: string;
  communityHandle?: string;
  status?: CommunitySubmissionStatus;
  communityDescription?: string;
  isFeatured?: boolean;
  publicationStatus?: PublicationStatus;
}

export interface AttachAppToCommunityResult {
  app: {
    id: string;
    handle: string;
    name: string;
    publicationStatus: PublicationStatus;
  };
  communityLink: {
    submissionId: string;
    communityId: string;
    communityHandle: string;
    status: CommunitySubmissionStatus;
    communityInstanceId: string | null;
    alreadyExisted: boolean;
    wasUpdated: boolean;
  };
}

export interface CopyAppParams {
  handle: string;
  name?: string;
  description?: string;
  ownerUserId?: string;
  ownerHandle?: string;
  ownerStackAuthId?: string;
  publicationStatus?: PublicationStatus;
  communityId?: string;
  communityHandle?: string;
  communitySubmissionStatus?: CommunitySubmissionStatus;
  communityDescription?: string;
  isFeaturedInCommunity?: boolean;
}

export interface CopyAppResult {
  sourceApp: {
    id: string;
    handle: string;
    name: string;
  };
  app: {
    id: string;
    name: string;
    handle: string;
    description?: string;
    publicationStatus: PublicationStatus;
    ownerId: string;
    version: number;
  };
  communityLink: {
    submissionId: string;
    communityId: string;
    communityHandle: string;
    status: CommunitySubmissionStatus;
    communityInstanceId: string | null;
    alreadyExisted: boolean;
    wasUpdated: boolean;
  } | null;
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
 * Get authorization headers for API requests
 */
function getAuthHeaders(): Record<string, string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      `Not configured. Run: ${formatCommand("config <api-key>")} or set ${getApiKeyEnvVarNames().join(" / ")}.`
    );
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

/**
 * Make an authenticated API request to the Next.js backend
 */
async function apiRequest<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  endpoint: string,
  body?: Record<string, unknown>
): Promise<T> {
  const apiUrl = getApiUrl();
  const url = `${apiUrl}${endpoint}`;

  const options: RequestInit = {
    method,
    headers: getAuthHeaders(),
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = (await response.json()) as { error?: string; message?: string };
      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // Use default error message
    }
    throw new ApiError(errorMessage, response.status);
  }

  return response.json() as Promise<T>;
}

/**
 * API response for listing apps
 */
interface ListAppsResponse {
  apps: RemoteApp[];
  count: number;
}

interface ListAppsRequestOptions {
  scope?: AppListScope;
  limit?: number;
  offset?: number;
  page?: number;
}

function buildListAppsEndpoint(options: ListAppsRequestOptions = {}): string {
  const params = new URLSearchParams();
  if (options.scope === "system") {
    params.set("scope", "system");
  }
  if (typeof options.limit === "number") {
    params.set("limit", String(options.limit));
  }
  if (typeof options.offset === "number") {
    params.set("offset", String(options.offset));
  }
  if (typeof options.page === "number") {
    params.set("page", String(options.page));
  }

  const query = params.toString();
  return query ? `/api/developer/apps?${query}` : "/api/developer/apps";
}

async function listAppsPage(options: ListAppsRequestOptions = {}): Promise<ListAppsResponse> {
  return apiRequest<ListAppsResponse>("GET", buildListAppsEndpoint(options));
}

function appendUniqueApps(target: RemoteApp[], apps: RemoteApp[], seenIds: Set<string>): number {
  let appended = 0;
  for (const app of apps) {
    if (seenIds.has(app.id)) {
      continue;
    }
    seenIds.add(app.id);
    target.push(app);
    appended += 1;
  }
  return appended;
}

async function listAppsWithOffsetPagination(
  scope: AppListScope | undefined,
  pageSize: number,
  initialResponse: ListAppsResponse
): Promise<RemoteApp[]> {
  const apps: RemoteApp[] = [];
  const seenIds = new Set<string>();
  appendUniqueApps(apps, initialResponse.apps, seenIds);

  let offset = initialResponse.apps.length;
  while (apps.length < initialResponse.count) {
    const response = await listAppsPage({ scope, limit: pageSize, offset });
    if (response.apps.length === 0) {
      break;
    }

    const appended = appendUniqueApps(apps, response.apps, seenIds);
    if (appended === 0) {
      break;
    }

    offset += response.apps.length;
  }

  return apps;
}

async function listAppsWithPagePagination(
  scope: AppListScope | undefined,
  pageSize: number,
  initialResponse: ListAppsResponse
): Promise<RemoteApp[]> {
  const apps: RemoteApp[] = [];
  const seenIds = new Set<string>();
  appendUniqueApps(apps, initialResponse.apps, seenIds);

  let page = 2;
  while (apps.length < initialResponse.count) {
    const response = await listAppsPage({ scope, limit: pageSize, page });
    if (response.apps.length === 0) {
      break;
    }

    const appended = appendUniqueApps(apps, response.apps, seenIds);
    if (appended === 0) {
      break;
    }

    page += 1;
  }

  return apps;
}

/**
 * List all available apps
 */
export async function listApps(options: { scope?: AppListScope } = {}): Promise<RemoteApp[]> {
  const pageSize = 500;
  const initialResponse = await listAppsPage({ scope: options.scope, limit: pageSize });

  if (initialResponse.apps.length >= initialResponse.count) {
    return initialResponse.apps;
  }

  const offsetApps = await listAppsWithOffsetPagination(options.scope, pageSize, initialResponse);
  if (offsetApps.length >= initialResponse.count) {
    return offsetApps;
  }

  const pagedApps = await listAppsWithPagePagination(options.scope, pageSize, initialResponse);
  return pagedApps.length > offsetApps.length ? pagedApps : offsetApps;
}

/**
 * Get app code by ID
 */
export async function getAppCode(appId: string): Promise<AppCode> {
  const result = await apiRequest<AppCode | null>(
    "GET",
    `/api/developer/apps/${appId}/code`
  );
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
  commitMessage: string,
  files?: Record<string, string>
): Promise<PushResult> {
  const body: Record<string, unknown> = { code, commitMessage };
  if (files) {
    body.files = files;
  }
  return apiRequest<PushResult>("PUT", `/api/developer/apps/${appId}/code`, body);
}

/**
 * API response for getting a single app by handle
 */
interface GetAppByHandleResponse {
  app: RemoteApp | null;
}

/**
 * Find an app by handle from the list of remote apps
 */
export async function findAppByHandle(handle: string): Promise<RemoteApp | null> {
  // Remove @ prefix if present
  const cleanHandle = handle.startsWith("@") ? handle.slice(1) : handle;
  
  // Use the handle query parameter for direct lookup
  try {
    const response = await apiRequest<GetAppByHandleResponse>(
      "GET",
      `/api/developer/apps?handle=${encodeURIComponent(cleanHandle)}`
    );
    return response.app || null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Create a hello-world template app for a target owner.
 */
export async function createTemplateApp(
  params: CreateTemplateAppParams
): Promise<CreateTemplateAppResult> {
  return apiRequest<CreateTemplateAppResult>("POST", "/api/developer/apps", {
    ...params,
  });
}

/**
 * Attach an existing app to a community.
 */
export async function attachAppToCommunity(
  appId: string,
  params: AttachAppToCommunityParams
): Promise<AttachAppToCommunityResult> {
  return apiRequest<AttachAppToCommunityResult>(
    "POST",
    `/api/developer/apps/${appId}/community`,
    { ...params }
  );
}

/**
 * Copy an existing app into a new app record.
 */
export async function copyAppToNewRecord(
  sourceAppId: string,
  params: CopyAppParams
): Promise<CopyAppResult> {
  return apiRequest<CopyAppResult>(
    "POST",
    `/api/developer/apps/${sourceAppId}/copy`,
    { ...params }
  );
}
