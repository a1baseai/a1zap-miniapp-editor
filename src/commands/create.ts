import chalk from "chalk";
import fs from "fs";
import path from "path";
import {
  createTemplateApp,
  findAppByHandle,
  getAppCode,
  type CommunitySubmissionStatus,
  type PublicationStatus,
} from "../api.js";
import { formatCommand } from "../cli-meta.js";
import { pullCommand } from "./pull.js";

interface CreateOptions {
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

const PUBLICATION_STATUSES: PublicationStatus[] = [
  "draft",
  "private",
  "unlisted",
  "public",
  "community_only",
];

const COMMUNITY_STATUSES: CommunitySubmissionStatus[] = [
  "pending",
  "approved",
];

function normalizeHandle(value: string): string {
  return value.trim().replace(/^@/, "");
}

function parsePublicationStatus(value?: string): PublicationStatus | undefined {
  if (!value) return undefined;
  if (!PUBLICATION_STATUSES.includes(value as PublicationStatus)) {
    throw new Error(
      `Invalid publication status "${value}". Valid values: ${PUBLICATION_STATUSES.join(", ")}`
    );
  }
  return value as PublicationStatus;
}

function parseCommunityStatus(value?: string): CommunitySubmissionStatus | undefined {
  if (!value) return undefined;
  if (!COMMUNITY_STATUSES.includes(value as CommunitySubmissionStatus)) {
    throw new Error(
      `Invalid community status "${value}". Valid values: ${COMMUNITY_STATUSES.join(", ")}`
    );
  }
  return value as CommunitySubmissionStatus;
}

function looksLikeFilePath(value: string): boolean {
  return (
    value.includes("/") ||
    value.includes("\\") ||
    value.startsWith(".") ||
    value.endsWith(".tsx") ||
    value.endsWith(".jsx") ||
    value.endsWith(".ts") ||
    value.endsWith(".js")
  );
}

function resolveTemplateFilePath(input: string): string | null {
  const resolved = path.resolve(input);
  if (!fs.existsSync(resolved)) {
    return null;
  }

  const stat = fs.statSync(resolved);
  if (stat.isFile()) {
    return resolved;
  }

  if (stat.isDirectory()) {
    const candidates = ["App.tsx", "app.tsx", "App.jsx", "app.jsx"];
    for (const candidate of candidates) {
      const candidatePath = path.join(resolved, candidate);
      if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
        return candidatePath;
      }
    }
    throw new Error(
      `No App.tsx/app.tsx found in directory: ${resolved}`
    );
  }

  throw new Error(`Unsupported --copy source: ${input}`);
}

async function resolveTemplateCodeFromCopy(copySource: string): Promise<{
  templateCode: string;
  sourceLabel: string;
}> {
  const templateFilePath = resolveTemplateFilePath(copySource);
  if (templateFilePath) {
    const templateCode = fs.readFileSync(templateFilePath, "utf-8");
    if (!templateCode.trim()) {
      throw new Error(`Template file is empty: ${templateFilePath}`);
    }
    return {
      templateCode,
      sourceLabel: templateFilePath,
    };
  }

  if (looksLikeFilePath(copySource)) {
    throw new Error(`Template file not found: ${path.resolve(copySource)}`);
  }

  const trimmed = copySource.trim();
  const cleanHandle = normalizeHandle(trimmed);
  const likelyId =
    !trimmed.startsWith("@") &&
    /^[a-z0-9]{20,}$/i.test(trimmed) &&
    !trimmed.includes("-") &&
    !trimmed.includes("_");

  let sourceAppId = trimmed;
  let sourceLabel = trimmed;
  if (!likelyId || trimmed.startsWith("@")) {
    const sourceApp = await findAppByHandle(cleanHandle);
    if (!sourceApp) {
      throw new Error(`Source app not found: ${trimmed}`);
    }
    sourceAppId = sourceApp.id;
    sourceLabel = `@${sourceApp.handle}`;
  }

  const sourceAppCode = await getAppCode(sourceAppId);
  if (!sourceAppCode.code || !sourceAppCode.code.trim()) {
    throw new Error(`Source app has no code: ${sourceLabel}`);
  }

  return {
    templateCode: sourceAppCode.code,
    sourceLabel,
  };
}

/**
 * Create a hello-world template mini app.
 */
export async function createCommand(
  handleArg: string,
  options: CreateOptions
): Promise<void> {
  try {
    const handle = normalizeHandle(handleArg);
    if (!handle) {
      throw new Error("Handle cannot be empty");
    }

    if (
      options.owner &&
      options.ownerHandle &&
      normalizeHandle(options.owner) !== normalizeHandle(options.ownerHandle)
    ) {
      throw new Error("--owner and --owner-handle refer to different handles");
    }

    const ownerHandle = options.owner ?? options.ownerHandle;

    const ownerSelectorCount =
      Number(!!ownerHandle) +
      Number(!!options.ownerId) +
      Number(!!options.ownerStackAuthId);

    if (ownerSelectorCount > 1) {
      throw new Error(
        "Provide at most one owner selector: --owner, --owner-id, or --owner-stack-auth-id"
      );
    }

    if (options.communityHandle && options.communityId) {
      throw new Error("Provide only one community selector: --community-handle or --community-id");
    }

    if (options.featured && !options.communityHandle && !options.communityId) {
      throw new Error("--featured requires --community-handle or --community-id");
    }

    if (options.communityStatus && !options.communityHandle && !options.communityId) {
      throw new Error("--community-status requires --community-handle or --community-id");
    }

    const publicationStatus = parsePublicationStatus(options.publication);
    const communitySubmissionStatus = parseCommunityStatus(options.communityStatus);
    const copySource = options.copy?.trim();
    let templateCode: string | undefined;

    if (copySource) {
      const resolved = await resolveTemplateCodeFromCopy(copySource);
      templateCode = resolved.templateCode;
      console.log(chalk.dim(`Using template code from ${resolved.sourceLabel}`));
    }

    console.log(chalk.dim(`Creating @${handle}...`));

    const result = await createTemplateApp({
      handle,
      name: options.name?.trim() || undefined,
      description: options.description?.trim() || undefined,
      ownerHandle: ownerHandle ? normalizeHandle(ownerHandle) : undefined,
      ownerUserId: options.ownerId?.trim() || undefined,
      ownerStackAuthId: options.ownerStackAuthId?.trim() || undefined,
      publicationStatus,
      communityHandle: options.communityHandle
        ? normalizeHandle(options.communityHandle)
        : undefined,
      communityId: options.communityId?.trim() || undefined,
      communitySubmissionStatus,
      communityDescription: options.communityDescription?.trim() || undefined,
      isFeaturedInCommunity: options.featured,
      templateCode,
    });

    console.log("");
    console.log(chalk.green("✓") + ` Created ${chalk.bold(result.app.name)} (${chalk.cyan(`@${result.app.handle}`)})`);
    console.log(`  ID: ${chalk.dim(result.app.id)}`);
    console.log(`  Publication: ${chalk.yellow(result.app.publicationStatus)}`);

    if (result.communityLink) {
      console.log(
        `  Community: ${chalk.cyan(`@${result.communityLink.communityHandle}`)} (${chalk.yellow(result.communityLink.status)})`
      );
      if (result.communityLink.communityInstanceId) {
        console.log(`  Community instance: ${chalk.dim(result.communityLink.communityInstanceId)}`);
      }
    }
    console.log("");

    const shouldPull = options.pull !== false;
    if (shouldPull) {
      await pullCommand(result.app.id, { force: options.force });
    } else {
      console.log(`  Next: ${chalk.bold(formatCommand(`pull @${result.app.handle}`))}`);
      console.log("");
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red("✗ Error:"), error.message);
    }
    process.exit(1);
  }
}
