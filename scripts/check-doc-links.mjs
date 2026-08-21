import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const referenceDefinitionPattern = /^\s*\[([^\]]+)\]:\s*(<[^>]+>|\S+)/gm;
const referenceUsePattern = /!?\[([^\]]+)\]\[([^\]]*)\]/g;
const headingPattern = /^#{1,6}\s+(.+?)\s*#*\s*$/gm;
const htmlAnchorPattern = /\s(?:id|name)=["']([^"']+)["']/g;
const externalPattern = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i;

function gitPaths(repoRoot, arguments_) {
  return execFileSync("git", arguments_, {
    cwd: repoRoot,
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean);
}

function listRepositoryPaths(repoRoot) {
  return new Set([
    ...gitPaths(repoRoot, ["ls-files", "-z"]),
    ...gitPaths(repoRoot, ["ls-files", "-z", "--others", "--exclude-standard"]),
  ]);
}

function githubSlug(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s+/g, "-");
}

function documentAnchors(contents) {
  const anchors = new Set();
  const slugCounts = new Map();

  for (const match of contents.matchAll(headingPattern)) {
    const base = githubSlug(match[1]);
    const count = slugCounts.get(base) ?? 0;
    anchors.add(count === 0 ? base : `${base}-${count}`);
    slugCounts.set(base, count + 1);
  }
  for (const match of contents.matchAll(htmlAnchorPattern)) {
    anchors.add(match[1]);
  }
  return anchors;
}

function stripDestinationSyntax(rawDestination) {
  const destination = rawDestination.trim();
  if (destination.startsWith("<")) {
    const closingBracket = destination.indexOf(">");
    return closingBracket < 0
      ? destination
      : destination.slice(1, closingBracket);
  }
  return destination.split(/\s/, 1)[0];
}

function inlineDestinations(contents) {
  const destinations = [];

  for (let index = 0; index < contents.length - 1; index += 1) {
    if (contents[index] !== "]" || contents[index + 1] !== "(") continue;
    let cursor = index + 2;
    while (/\s/.test(contents[cursor] ?? "")) cursor += 1;

    if (contents[cursor] === "<") {
      const end = contents.indexOf(">", cursor + 1);
      if (end >= 0) destinations.push(contents.slice(cursor, end + 1));
      continue;
    }

    const start = cursor;
    let depth = 0;
    while (cursor < contents.length) {
      const character = contents[cursor];
      if (character === "\\") {
        cursor += 2;
        continue;
      }
      if (character === "(") depth += 1;
      if (character === ")") {
        if (depth === 0) break;
        depth -= 1;
      }
      if (/\s/.test(character) && depth === 0) break;
      cursor += 1;
    }
    if (cursor > start) destinations.push(contents.slice(start, cursor));
  }

  return destinations;
}

function referenceDestinations(contents, sourcePath, findings) {
  const definitions = new Map();
  for (const match of contents.matchAll(referenceDefinitionPattern)) {
    definitions.set(match[1].trim().toLowerCase(), match[2]);
  }

  const destinations = [...definitions.values()];
  for (const match of contents.matchAll(referenceUsePattern)) {
    const label = (match[2] || match[1]).trim().toLowerCase();
    const destination = definitions.get(label);
    if (destination) destinations.push(destination);
    else findings.push(`${sourcePath}: undefined reference link [${label}]`);
  }
  return destinations;
}

function trackedDirectoryExists(trackedPaths, relativePath) {
  const prefix = `${relativePath.replace(/\/$/, "")}/`;
  return [...trackedPaths].some((trackedPath) =>
    trackedPath.startsWith(prefix),
  );
}

export function findBrokenDocumentationLinks({
  repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  trackedPaths,
} = {}) {
  if (repoRoot instanceof URL) repoRoot = fileURLToPath(repoRoot);
  trackedPaths ??= listRepositoryPaths(repoRoot);
  const findings = [];
  const anchorCache = new Map();
  const markdownPaths = [...trackedPaths].filter((trackedPath) =>
    trackedPath.endsWith(".md"),
  );

  for (const sourcePath of markdownPaths) {
    const contents = readFileSync(path.join(repoRoot, sourcePath), "utf8");
    const destinations = [
      ...inlineDestinations(contents),
      ...referenceDestinations(contents, sourcePath, findings),
    ];

    for (const rawDestination of destinations) {
      const destination = stripDestinationSyntax(rawDestination);
      if (!destination || externalPattern.test(destination)) continue;

      const [rawPath, rawFragment] = destination.split("#", 2);
      const decodedPath = decodeURIComponent(rawPath.split("?", 1)[0]);
      const targetPath = decodedPath
        ? path
            .normalize(path.join(path.dirname(sourcePath), decodedPath))
            .replaceAll(path.sep, "/")
        : sourcePath;

      if (
        !trackedPaths.has(targetPath) &&
        !trackedDirectoryExists(trackedPaths, targetPath)
      ) {
        findings.push(`${sourcePath}: missing tracked target ${destination}`);
        continue;
      }

      if (!rawFragment || !targetPath.endsWith(".md")) continue;
      const fragment = decodeURIComponent(rawFragment);
      let anchors = anchorCache.get(targetPath);
      if (!anchors) {
        anchors = documentAnchors(
          readFileSync(path.join(repoRoot, targetPath), "utf8"),
        );
        anchorCache.set(targetPath, anchors);
      }
      if (!anchors.has(fragment)) {
        findings.push(
          `${sourcePath}: missing anchor #${fragment} in ${targetPath}`,
        );
      }
    }
  }

  return findings.sort();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const findings = findBrokenDocumentationLinks();
  if (findings.length > 0) {
    console.error(findings.join("\n"));
    process.exitCode = 1;
  } else {
    console.log("Repository Markdown links and anchors are valid.");
  }
}
