import chalk from "chalk";
import {
  copyAppToNewRecord,
  findAppByHandle,
  type CommunitySubmissionStatus,
  type PublicationStatus,
} from "../api.js";
import { pullCommand } from "./pull.js";

interface CopyOptions {
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

async function resolveAppId(appIdOrHandle: string): Promise<{ appId: string; appRef: string }> {
  const trimmed = appIdOrHandle.trim();
  const clean = normalizeHandle(trimmed);
  const likelyId =
    !trimmed.startsWith("@") &&
    /^[a-z0-9]{20,}$/i.test(trimmed) &&
    !trimmed.includes("-") &&
    !trimmed.includes("_");

  if (!likelyId || trimmed.startsWith("@")) {
    const app = await findAppByHandle(clean);
    if (!app) {
      if (trimmed.startsWith("@")) {
        throw new Error(`App not found: ${trimmed}`);
      }
      return { appId: trimmed, appRef: trimmed };
    }
    return { appId: app.id, appRef: `@${app.handle}` };
  }

  return { appId: trimmed, appRef: trimmed };
}

/**
 * Copy an app into a new app record.
 */
export async function copyCommand(
  sourceAppIdOrHandle: string,
  newHandleArg: string,
  options: CopyOptions
): Promise<void> {
  try {
    const newHandle = normalizeHandle(newHandleArg);
    if (!newHandle) {
      throw new Error("New handle cannot be empty");
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

    const { appId: sourceAppId, appRef: sourceRef } = await resolveAppId(sourceAppIdOrHandle);
    console.log(chalk.dim(`Copying ${sourceRef} to @${newHandle}...`));

    const result = await copyAppToNewRecord(sourceAppId, {
      handle: newHandle,
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
    });

    console.log("");
    console.log(
      chalk.green("✓") +
        ` Copied ${chalk.bold(`@${result.sourceApp.handle}`)} → ${chalk.bold(`@${result.app.handle}`)}`
    );
    console.log(`  New app ID: ${chalk.dim(result.app.id)}`);
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
      console.log(`  Next: ${chalk.bold(`a1zap pull @${result.app.handle}`)}`);
      console.log("");
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red("✗ Error:"), error.message);
    }
    process.exit(1);
  }
}

