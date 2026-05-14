import fs from "fs";
import path from "path";
import type { AppCode } from "./api.js";

export type TrackedFileMap = Record<string, string>;

interface BaseSnapshotMetadata {
  version: number;
  savedAt: number;
  files: string[];
}

export interface BaseSnapshot {
  version: number;
  files: TrackedFileMap;
}

export interface ConflictSnapshotOptions {
  appHandle: string;
  localVersion: number;
  baseVersion?: number;
}

const STATE_DIR = ".a1zap";
const BASE_DIR = "base";
const BASE_METADATA_FILE = "base.json";
const INCOMING_DIR = "incoming";
const CONFLICTS_DIR = "conflicts";
const FLAGGED_FILES_DIR = "flagged-files";
const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  STATE_DIR,
  "dist",
  "build",
  "agent-docs",
]);

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

function assertSafeRelativePath(relPath: string): void {
  if (
    !relPath ||
    path.isAbsolute(relPath) ||
    relPath.split(/[\\/]+/).includes("..") ||
    /^[A-Za-z]:/.test(relPath)
  ) {
    throw new Error(`Unsafe app file path: ${relPath}`);
  }
}

function shouldTrackSourceFile(fileName: string): boolean {
  return /\.(tsx?|jsx?)$/.test(fileName);
}

function shouldTrackRuntimeFile(fileName: string): boolean {
  return shouldTrackSourceFile(fileName) || fileName === "styles.css";
}

function safeSnapshotName(relPath: string): string {
  const normalized = relPath.replace(/[\\/]+/g, "__");
  return normalized.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function snapshotFileName(label: string, version: number | undefined, relPath: string): string {
  const versionPart = typeof version === "number" ? `_v${version}` : "";
  return `${label}${versionPart}_${safeSnapshotName(relPath)}`;
}

function writeFileMap(rootDir: string, files: TrackedFileMap): void {
  for (const [relPath, source] of Object.entries(files)) {
    assertSafeRelativePath(relPath);
    const filePath = path.join(rootDir, relPath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, source);
  }
}

function readFileMap(rootDir: string): TrackedFileMap {
  const files: TrackedFileMap = {};
  if (!fs.existsSync(rootDir)) {
    return files;
  }

  function walk(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const relPath = toPosixPath(path.relative(rootDir, fullPath));
        assertSafeRelativePath(relPath);
        files[relPath] = fs.readFileSync(fullPath, "utf-8");
      }
    }
  }

  walk(rootDir);
  return files;
}

export function collectAppSourceFiles(projectDir: string): TrackedFileMap {
  const files: TrackedFileMap = {};

  function walk(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) {
          walk(path.join(dir, entry.name));
        }
        continue;
      }

      if (!entry.isFile() || !shouldTrackSourceFile(entry.name)) {
        continue;
      }

      const fullPath = path.join(dir, entry.name);
      const relPath = toPosixPath(path.relative(projectDir, fullPath));
      assertSafeRelativePath(relPath);
      files[relPath] = fs.readFileSync(fullPath, "utf-8");
    }
  }

  walk(projectDir);
  return files;
}

export function collectTrackedRuntimeFiles(projectDir: string): TrackedFileMap {
  const files: TrackedFileMap = {};

  function walk(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) {
          walk(path.join(dir, entry.name));
        }
        continue;
      }

      if (!entry.isFile() || !shouldTrackRuntimeFile(entry.name)) {
        continue;
      }

      const fullPath = path.join(dir, entry.name);
      const relPath = toPosixPath(path.relative(projectDir, fullPath));
      assertSafeRelativePath(relPath);
      files[relPath] = fs.readFileSync(fullPath, "utf-8");
    }
  }

  walk(projectDir);
  return files;
}

export function buildRemoteRuntimeFiles(appCode: AppCode): TrackedFileMap {
  const files: TrackedFileMap = {};
  const hasMultiFile = appCode.files && Object.keys(appCode.files).length > 1;

  if (hasMultiFile) {
    for (const [relPath, source] of Object.entries(appCode.files!)) {
      assertSafeRelativePath(relPath);
      files[relPath] = source;
    }
  } else {
    files["App.tsx"] = appCode.code;
  }

  if (appCode.css !== undefined) {
    files["styles.css"] = appCode.css;
  }

  return files;
}

export function saveBaseSnapshot(appPath: string, version: number, files: TrackedFileMap): void {
  const statePath = path.join(appPath, STATE_DIR);
  const basePath = path.join(statePath, BASE_DIR);
  fs.mkdirSync(statePath, { recursive: true });
  fs.rmSync(basePath, { recursive: true, force: true });
  fs.mkdirSync(basePath, { recursive: true });
  writeFileMap(basePath, files);

  const metadata: BaseSnapshotMetadata = {
    version,
    savedAt: Date.now(),
    files: Object.keys(files).sort(),
  };
  fs.writeFileSync(
    path.join(statePath, BASE_METADATA_FILE),
    JSON.stringify(metadata, null, 2)
  );
}

export function loadBaseSnapshot(
  appPath: string,
  expectedVersion: number
): BaseSnapshot | null {
  const statePath = path.join(appPath, STATE_DIR);
  const metadataPath = path.join(statePath, BASE_METADATA_FILE);
  if (!fs.existsSync(metadataPath)) {
    return null;
  }

  let metadata: BaseSnapshotMetadata;
  try {
    metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8")) as BaseSnapshotMetadata;
  } catch {
    return null;
  }

  if (metadata.version !== expectedVersion) {
    return null;
  }

  return {
    version: metadata.version,
    files: readFileMap(path.join(statePath, BASE_DIR)),
  };
}

export function replaceTrackedRuntimeFiles(
  appPath: string,
  nextFiles: TrackedFileMap,
  removePaths: string[]
): void {
  for (const relPath of removePaths) {
    assertSafeRelativePath(relPath);
    const filePath = path.join(appPath, relPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      fs.rmSync(filePath);
    }
  }

  writeFileMap(appPath, nextFiles);
}

export function writeIncomingSnapshot(
  appPath: string,
  version: number,
  files: TrackedFileMap
): string {
  const incomingPath = path.join(appPath, STATE_DIR, INCOMING_DIR, `remote-v${version}`);
  fs.rmSync(incomingPath, { recursive: true, force: true });
  fs.mkdirSync(incomingPath, { recursive: true });
  writeFileMap(incomingPath, files);
  return incomingPath;
}

export function writeConflictSnapshot(
  appPath: string,
  version: number,
  baseFiles: TrackedFileMap,
  localFiles: TrackedFileMap,
  remoteFiles: TrackedFileMap,
  conflicts: string[],
  options: ConflictSnapshotOptions
): string {
  const conflictPath = path.join(
    appPath,
    STATE_DIR,
    CONFLICTS_DIR,
    `${options.appHandle}-local-v${options.localVersion}-remote-v${version}-${Date.now()}`
  );
  fs.mkdirSync(conflictPath, { recursive: true });
  writeFileMap(path.join(conflictPath, "base"), baseFiles);
  writeFileMap(path.join(conflictPath, "local"), localFiles);
  writeFileMap(path.join(conflictPath, "remote"), remoteFiles);

  const flaggedFilesPath = path.join(conflictPath, FLAGGED_FILES_DIR);
  fs.mkdirSync(flaggedFilesPath, { recursive: true });
  for (const relPath of conflicts) {
    assertSafeRelativePath(relPath);
    const base = baseFiles[relPath];
    const local = localFiles[relPath];
    const remote = remoteFiles[relPath];

    if (base !== undefined) {
      fs.writeFileSync(
        path.join(flaggedFilesPath, snapshotFileName("BASE", options.baseVersion, relPath)),
        base
      );
    }
    if (local !== undefined) {
      fs.writeFileSync(
        path.join(flaggedFilesPath, snapshotFileName("LOCAL", options.localVersion, relPath)),
        local
      );
    }
    if (remote !== undefined) {
      fs.writeFileSync(
        path.join(flaggedFilesPath, snapshotFileName("REMOTE", version, relPath)),
        remote
      );
    }
  }

  fs.writeFileSync(
    path.join(conflictPath, "conflicts.json"),
    JSON.stringify(
      {
        appHandle: options.appHandle,
        localVersion: options.localVersion,
        remoteVersion: version,
        baseVersion: options.baseVersion ?? null,
        conflicts,
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(conflictPath, "README.txt"),
    [
      `A1Zap could not automatically merge @${options.appHandle}.`,
      "",
      "No live app files were changed.",
      `Local version: v${options.localVersion}`,
      `Remote version: v${version}`,
      options.baseVersion ? `Base version: v${options.baseVersion}` : "Base version: unavailable",
      "",
      "Folders:",
      "- base: the last version this local copy was pulled from",
      "- local: your current local files",
      "- remote: the newest remote files",
      "- flagged-files: easy-to-open versioned snapshots for each conflicted file",
      "",
      "Conflicted files:",
      ...conflicts.map((file) => `- ${file}`),
      "",
      "Ask Codex or another editor to compare these folders and apply the final version to the app folder.",
      "",
    ].join("\n")
  );
  fs.writeFileSync(
    path.join(conflictPath, "AGENT_INSTRUCTIONS.md"),
    [
      `# Resolve A1Zap Conflict for @${options.appHandle}`,
      "",
      "No live app files were changed. Resolve the conflict by comparing this package, then write the final app files back into the app folder that contains this `.a1zap` directory.",
      "",
      `- Local version: v${options.localVersion}`,
      `- Remote version: v${version}`,
      `- Base version: ${options.baseVersion ? `v${options.baseVersion}` : "unavailable"}`,
      "",
      "Use these folders:",
      "",
      "- `local/`: the user's current local work",
      "- `remote/`: the newest A1Zap version",
      "- `base/`: the last pulled base, when available",
      "- `flagged-files/`: flat single-file snapshots like `LOCAL_v3_App.tsx` and `REMOTE_v5_App.tsx`",
      "",
      "Resolution goal:",
      "",
      "1. Preserve the user's local intent.",
      "2. Bring in remote fixes or newer changes where compatible.",
      "3. Write the final resolved files into the app folder, not into this conflict package.",
      "4. Run the local dev server or tests if available.",
      "5. Push only after the app looks correct.",
      "",
    ].join("\n")
  );
  return conflictPath;
}
