import chalk from "chalk";
import {
  createTemplateApp,
  type CommunitySubmissionStatus,
  type PublicationStatus,
} from "../api.js";
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

    if (ownerSelectorCount !== 1) {
      throw new Error(
        "Provide exactly one owner selector: --owner, --owner-id, or --owner-stack-auth-id"
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

    if (options.pull) {
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
