/**
 * Multi-file mini app bundler (CLI-side).
 *
 * Port of convex/lib/microAppMultiFileBundle.ts for local use in the CLI.
 * Takes a map of { relativePath: sourceCode } and produces a single
 * concatenated string suitable for the single-file runtime.
 *
 * Strategy:
 *  1. Normalize file keys (strip leading ./, detect collisions)
 *  2. Parse local import, side-effect import, and re-export statements
 *  3. Build a dependency graph
 *  4. Topological sort (Kahn's algorithm, errors on cycles)
 *  5. Concatenate in dependency order (leaf deps first, entry file last)
 *  6. Strip local import/re-export lines and convert `export` keywords
 */

function dirname(filePath: string): string {
  const idx = filePath.lastIndexOf("/");
  return idx === -1 ? "." : filePath.substring(0, idx);
}

function joinAndNormalize(base: string, rel: string): string {
  const parts = (base === "." ? rel : `${base}/${rel}`).split("/");
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === "." || part === "") continue;
    if (part === "..") {
      if (resolved.length === 0) {
        throw new Error(
          `[MultiFileBundle] Path "${rel}" escapes the project root (too many ".." segments from "${base}")`
        );
      }
      resolved.pop();
    } else {
      resolved.push(part);
    }
  }
  return resolved.join("/");
}

function normalizeFileMap(
  files: Record<string, string>
): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(files)) {
    const norm = key.replace(/^\.\//, "");
    if (norm in normalized) {
      throw new Error(
        `[MultiFileBundle] Duplicate file key: "${key}" normalizes to "${norm}" which already exists`
      );
    }
    normalized[norm] = value;
  }
  return normalized;
}

const LOCAL_IMPORT_FROM_RE =
  /^\s*import\s+(?:type\s+)?(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s*,?\s*)*\s*from\s+['"](\.\.?\/[^'"]+)['"]\s*;?\s*$/gm;

const LOCAL_IMPORT_SIDEEFFECT_RE =
  /^\s*import\s+['"](\.\.?\/[^'"]+)['"]\s*;?\s*$/gm;

const LOCAL_REEXPORT_RE =
  /^\s*export\s+(?:type\s+)?\{([^}]*)\}\s+from\s+['"](\.\.?\/[^'"]+)['"]\s*;?\s*$/gm;

const LOCAL_EXPORT_ALL_RE =
  /^\s*export\s+(?:type\s+)?\*\s*(as\s+\w+\s+)?from\s+['"](\.\.?\/[^'"]+)['"]\s*;?\s*$/gm;

function getSpecifierGroup(re: RegExp): number {
  if (re === LOCAL_REEXPORT_RE || re === LOCAL_EXPORT_ALL_RE) return 2;
  return 1;
}

function resolveImportPath(
  specifier: string,
  fileMap: Record<string, string>,
  importingFile: string
): string | null {
  const importerDir = dirname(importingFile);
  const rel = joinAndNormalize(importerDir, specifier);
  const candidates = [rel, `${rel}.tsx`, `${rel}.ts`, `${rel}/index.tsx`, `${rel}/index.ts`];
  for (const c of candidates) {
    if (c in fileMap) return c;
  }
  return null;
}

function checkUnsafeReexport(
  matchedLine: string,
  re: RegExp,
  currentFile: string
): string | null {
  if (re === LOCAL_EXPORT_ALL_RE) {
    if (/export\s+\*\s+as\s+\w+/.test(matchedLine)) {
      return (
        `[MultiFileBundle] File "${currentFile}" uses "export * as <name> from '...'" which ` +
        `creates a namespace binding that cannot be preserved after bundling. ` +
        `Use explicit named imports instead.`
      );
    }
  }
  if (re === LOCAL_REEXPORT_RE) {
    const bindingsPart = matchedLine.match(/export\s+\{([^}]*)\}/)?.[1] ?? "";
    if (/\bas\b/.test(bindingsPart)) {
      return (
        `[MultiFileBundle] File "${currentFile}" uses aliased re-export ` +
        `"export { ... as ... } from '...'" which cannot be preserved after bundling. ` +
        `Use explicit imports and local aliases instead.`
      );
    }
  }
  return null;
}

function extractLocalDeps(
  source: string,
  fileMap: Record<string, string>,
  currentFile: string
): string[] {
  const deps: string[] = [];

  for (const re of [LOCAL_IMPORT_FROM_RE, LOCAL_IMPORT_SIDEEFFECT_RE, LOCAL_REEXPORT_RE, LOCAL_EXPORT_ALL_RE]) {
    const pattern = new RegExp(re.source, "gm");
    const specGroup = getSpecifierGroup(re);
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
      const unsafeMsg = checkUnsafeReexport(match[0], re, currentFile);
      if (unsafeMsg) {
        throw new Error(unsafeMsg);
      }

      const specifier = match[specGroup];
      const resolved = resolveImportPath(specifier, fileMap, currentFile);
      if (resolved) {
        if (!deps.includes(resolved)) deps.push(resolved);
      } else {
        throw new Error(
          `[MultiFileBundle] File "${currentFile}" references "${specifier}" but no matching file was found. ` +
            `Available files: ${Object.keys(fileMap).join(", ")}`
        );
      }
    }
  }
  return deps;
}

function stripLocalImports(source: string): string {
  let result = source;
  for (const re of [LOCAL_IMPORT_FROM_RE, LOCAL_IMPORT_SIDEEFFECT_RE, LOCAL_REEXPORT_RE, LOCAL_EXPORT_ALL_RE]) {
    result = result.replace(new RegExp(re.source, "gm"), "");
  }
  return result;
}

function stripExportKeywords(source: string, fileName: string): string {
  let result = source;
  result = result.replace(
    /^\s*export\s+((?:async\s+)?(?:function\*?\s|const\s|let\s|var\s|class\s))/gm,
    "$1"
  );
  result = result.replace(
    /^\s*export\s+((?:interface|type|enum|declare)\s)/gm,
    "$1"
  );
  result = result.replace(
    /^\s*export\s+default\s+((?:async\s+)?function\*?\s+\w)/gm,
    "$1"
  );
  result = result.replace(
    /^\s*export\s+default\s+(class\s+\w)/gm,
    "$1"
  );
  result = result.replace(
    /^\s*export\s+\{[^}]*\}\s*;?\s*$/gm,
    ""
  );
  if (/^\s*export\s+default\s/m.test(result)) {
    throw new Error(
      `[MultiFileBundle] File "${fileName}" has an "export default <expression>" that cannot ` +
      `be safely bundled. Use "export default function Name()" or move the default export ` +
      `to the entry file.`
    );
  }
  return result;
}

function detectNameCollisions(
  processedFiles: Map<string, string>,
  _entryFile: string
): void {
  const bindings = new Map<string, string[]>();
  const DECL_RE = /^(?:async\s+)?(?:function\*?\s|const\s|let\s|var\s|class\s|interface\s|type\s|enum\s)(\w+)/gm;

  for (const [fileName, source] of processedFiles) {
    const pattern = new RegExp(DECL_RE.source, "gm");
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
      const name = match[1];
      const files = bindings.get(name);
      if (files) {
        files.push(fileName);
      } else {
        bindings.set(name, [fileName]);
      }
    }
  }

  const collisions: string[] = [];
  for (const [name, files] of bindings) {
    if (files.length > 1) {
      collisions.push(`"${name}" defined in: ${files.join(", ")}`);
    }
  }

  if (collisions.length > 0) {
    throw new Error(
      `[MultiFileBundle] Top-level name collisions detected across files. ` +
      `Rename these to avoid conflicts after bundling:\n  ${collisions.join("\n  ")}`
    );
  }
}

function topologicalSort(
  graph: Map<string, string[]>,
  allFiles: string[],
  entryFile: string
): string[] {
  const inDegree = new Map<string, number>();
  for (const f of allFiles) inDegree.set(f, 0);

  for (const [, deps] of graph) {
    for (const dep of deps) {
      inDegree.set(dep, (inDegree.get(dep) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [f, deg] of inDegree) {
    if (deg === 0) queue.push(f);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);
    for (const dep of graph.get(node) ?? []) {
      const newDeg = (inDegree.get(dep) ?? 1) - 1;
      inDegree.set(dep, newDeg);
      if (newDeg === 0) queue.push(dep);
    }
  }

  if (sorted.length !== allFiles.length) {
    const remaining = allFiles.filter((f) => !sorted.includes(f));
    throw new Error(
      `[MultiFileBundle] Circular dependency detected involving: ${remaining.join(", ")}`
    );
  }

  sorted.reverse();
  const entryIdx = sorted.indexOf(entryFile);
  if (entryIdx !== -1 && entryIdx !== sorted.length - 1) {
    sorted.splice(entryIdx, 1);
    sorted.push(entryFile);
  }

  return sorted;
}

/**
 * Bundle multiple files into a single concatenated source string.
 */
export function bundleMultiFileApp(
  files: Record<string, string>,
  entryFile: string = "App.tsx"
): string {
  const normalizedFiles = normalizeFileMap(files);
  const fileKeys = Object.keys(normalizedFiles);

  const normalizedEntry = entryFile.replace(/^\.\//, "");
  if (!(normalizedEntry in normalizedFiles)) {
    throw new Error(
      `[MultiFileBundle] Entry file "${normalizedEntry}" not found in files. ` +
        `Available: ${fileKeys.join(", ")}`
    );
  }

  if (fileKeys.length === 1) {
    return normalizedFiles[fileKeys[0]];
  }

  const graph = new Map<string, string[]>();
  for (const key of fileKeys) {
    const deps = extractLocalDeps(normalizedFiles[key], normalizedFiles, key);
    graph.set(key, deps);
  }

  const sorted = topologicalSort(graph, fileKeys, normalizedEntry);

  const processedFiles = new Map<string, string>();
  for (const key of sorted) {
    let processed = stripLocalImports(normalizedFiles[key]);
    if (key !== normalizedEntry) {
      processed = stripExportKeywords(processed, key);
    }
    processed = processed.trim();
    if (processed) {
      processedFiles.set(key, processed);
    }
  }

  detectNameCollisions(processedFiles, normalizedEntry);

  const parts: string[] = [];
  for (const [key, processed] of processedFiles) {
    parts.push(`// --- ${key} ---\n${processed}`);
  }

  return parts.join("\n\n");
}
