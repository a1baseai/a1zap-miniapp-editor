import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const AGENT_DOCS_DIR_NAME = "agent-docs";
const ROOT_AGENT_FILE_NAME = "AGENTS.md";

const ROOT_AGENT_FILE_CONTENT = `# A1Zap Mini App Agent Notes

This app includes A1Zap mini app docs in \`agent-docs/\`.

Before editing:

- Read \`agent-docs/AGENTS.md\` for runtime guardrails.
- For new apps, redesigns, or UI-heavy edits, read \`agent-docs/MINI_APP_MOBILE_NATIVE_DESIGN_GUIDE.md\`.
- Use \`agent-docs/README.md\` to choose any feature-specific guide you need.
- Preserve the existing app layout and visual identity unless the prompt explicitly asks for a redesign.
- \`a1zap pull\` refreshes \`agent-docs/\` from the latest bundled docs.
- Treat docs as reference material; read deeper guides only for capabilities touched by the change.
`;

export interface CopyAgentDocsResult {
  docsPath: string;
  rootAgentFilePath: string;
  rootAgentFileCreated: boolean;
  docsFileCount: number;
}

function isDirectory(dirPath: string): boolean {
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
}

function findBundledAgentDocsDir(): string {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(moduleDir, "..", AGENT_DOCS_DIR_NAME),
    path.resolve(moduleDir, "..", "..", AGENT_DOCS_DIR_NAME),
    path.resolve(process.cwd(), AGENT_DOCS_DIR_NAME),
  ];

  for (const candidate of candidates) {
    if (isDirectory(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Bundled ${AGENT_DOCS_DIR_NAME} directory was not found. Reinstall or update the CLI.`
  );
}

function countFiles(dirPath: string): number {
  let count = 0;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      count += countFiles(entryPath);
    } else if (entry.isFile()) {
      count += 1;
    }
  }

  return count;
}

export function copyAgentDocsToApp(appPath: string): CopyAgentDocsResult {
  const sourceDocsPath = findBundledAgentDocsDir();
  const docsPath = path.join(appPath, AGENT_DOCS_DIR_NAME);

  if (fs.existsSync(docsPath) && !fs.statSync(docsPath).isDirectory()) {
    throw new Error(`${docsPath} already exists and is not a directory.`);
  }

  if (path.resolve(sourceDocsPath) === path.resolve(docsPath)) {
    throw new Error(`Bundled ${AGENT_DOCS_DIR_NAME} directory resolved to the target app docs path.`);
  }

  fs.mkdirSync(appPath, { recursive: true });
  if (fs.existsSync(docsPath)) {
    fs.rmSync(docsPath, { recursive: true, force: true });
  }

  fs.cpSync(sourceDocsPath, docsPath, {
    recursive: true,
    force: true,
    errorOnExist: false,
  });

  const rootAgentFilePath = path.join(appPath, ROOT_AGENT_FILE_NAME);
  let rootAgentFileCreated = false;
  if (!fs.existsSync(rootAgentFilePath)) {
    fs.writeFileSync(rootAgentFilePath, ROOT_AGENT_FILE_CONTENT);
    rootAgentFileCreated = true;
  }

  return {
    docsPath,
    rootAgentFilePath,
    rootAgentFileCreated,
    docsFileCount: countFiles(docsPath),
  };
}
