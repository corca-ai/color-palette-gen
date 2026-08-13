import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { scanPublicArtifact } from "../scripts/check-public-artifact.mjs";

async function withArtifact(files, run) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "public-artifact-"));
  try {
    for (const [name, contents] of Object.entries(files)) {
      const target = path.join(root, name);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, contents);
    }
    await run(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test("public artifact scan accepts ordinary static output", async () => {
  await withArtifact(
    { "index.html": '<a href="https://example.com">Public reference</a>' },
    async (root) => assert.deepEqual(await scanPublicArtifact(root), []),
  );
});

test("public artifact scan reports secrets and local-only references", async () => {
  await withArtifact(
    {
      "app.js": 'const apiKey = "not-a-public-value";',
      "notes.txt": "Preview at http://localhost:4173",
    },
    async (root) =>
      assert.deepEqual(await scanPublicArtifact(root), [
        { file: "app.js", rule: "credential-assignment" },
        { file: "notes.txt", rule: "local-address" },
      ]),
  );
});
