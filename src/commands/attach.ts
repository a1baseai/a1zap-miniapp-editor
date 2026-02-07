import chalk from "chalk";
import {
  attachAppToCommunity,
  findAppByHandle,
  type CommunitySubmissionStatus,
  type PublicationStatus,
} from "../api.js";

interface AttachOptions {
  communityHandle?: string;
  communityId?: string;
  status?: string;
  communityDescription?: string;
  featured?: boolean;
  publication?: string;
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
 * Attach an existing app to a community.
 */
export async function attachCommand(
  appIdOrHandle: string,
  options: AttachOptions
): Promise<void> {
  try {
    if (!options.communityHandle && !options.communityId) {
      throw new Error("Provide --community-handle or --community-id");
    }

    if (options.communityHandle && options.communityId) {
      throw new Error("Provide only one community selector: --community-handle or --community-id");
    }

    const status = parseCommunityStatus(options.status);
    const publicationStatus = parsePublicationStatus(options.publication);

    const { appId, appRef } = await resolveAppId(appIdOrHandle);
    const communityRef = options.communityHandle
      ? `@${normalizeHandle(options.communityHandle)}`
      : options.communityId!;

    console.log(chalk.dim(`Attaching ${appRef} to ${communityRef}...`));

    const result = await attachAppToCommunity(appId, {
      communityHandle: options.communityHandle
        ? normalizeHandle(options.communityHandle)
        : undefined,
      communityId: options.communityId?.trim() || undefined,
      status,
      communityDescription: options.communityDescription?.trim() || undefined,
      isFeatured: options.featured,
      publicationStatus,
    });

    console.log("");
    console.log(
      chalk.green("✓") +
        ` Attached ${chalk.bold(`@${result.app.handle}`)} to ${chalk.cyan(`@${result.communityLink.communityHandle}`)}`
    );
    console.log(`  Status: ${chalk.yellow(result.communityLink.status)}`);
    console.log(`  Publication: ${chalk.yellow(result.app.publicationStatus)}`);
    if (result.communityLink.communityInstanceId) {
      console.log(`  Community instance: ${chalk.dim(result.communityLink.communityInstanceId)}`);
    }
    console.log("");
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red("✗ Error:"), error.message);
    }
    process.exit(1);
  }
}

