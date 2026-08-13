import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEXT_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".map",
  ".mjs",
  ".svg",
  ".txt",
  ".xml",
]);

const FORBIDDEN = [
  {
    id: "private-key",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
  {
    id: "credential-assignment",
    pattern:
      /\b(?:api[_-]?key|client[_-]?secret|password|private[_-]?token)\b\s*[:=]\s*["'][^"'\s]{8,}["']/i,
  },
  {
    id: "local-address",
    pattern: /https?:\/\/(?:localhost|127\.0\.0\.1)(?=[:/]|$)/i,
  },
  { id: "non-public-source", pattern: /wiki\.g15e\.com/i },
];

async function listFiles(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(root, entry.name);
      return entry.isDirectory() ? listFiles(target) : [target];
    }),
  );
  return nested.flat();
}

export async function scanPublicArtifact(root) {
  const files = await listFiles(root);
  const findings = [];

  for (const file of files) {
    if (!TEXT_EXTENSIONS.has(path.extname(file).toLowerCase())) continue;
    const text = await fs.readFile(file, "utf8");
    for (const rule of FORBIDDEN) {
      if (rule.pattern.test(text)) {
        findings.push({ file: path.relative(root, file), rule: rule.id });
      }
    }
  }

  return findings;
}

async function main() {
  const root = path.resolve(process.argv[2] ?? "dist");
  const findings = await scanPublicArtifact(root);
  if (findings.length > 0) {
    for (const finding of findings) {
      console.error(`${finding.file}: forbidden ${finding.rule} marker`);
    }
    process.exitCode = 1;
    return;
  }
  console.log(`Public artifact check passed (${root}).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
