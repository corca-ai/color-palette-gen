import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { findBrokenDocumentationLinks } from "../scripts/check-doc-links.mjs";

const repoRoot = new URL("../", import.meta.url);

test("tracked Markdown links resolve with exact case and valid anchors", () => {
  assert.deepEqual(findBrokenDocumentationLinks({ repoRoot }), []);
});

test("documentation link validation catches case and anchor drift", async (t) => {
  const fixtureRoot = path.join(
    tmpdir(),
    `color-palette-doc-links-${process.pid}-${Date.now()}`,
  );
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));

  await mkdir(path.join(fixtureRoot, "docs"), { recursive: true });
  await writeFile(path.join(fixtureRoot, "readme.md"), "# Actual heading\n");
  await writeFile(path.join(fixtureRoot, "guide_(draft).md"), "# Draft\n");
  await writeFile(path.join(fixtureRoot, "guide space.md"), "# Space\n");
  await writeFile(
    path.join(fixtureRoot, "docs", "index.md"),
    [
      "[wrong case](../README.md)",
      "[wrong anchor](../readme.md#missing)",
      "![missing image](../missing.png)",
      "[undefined][missing-definition]",
      "[balanced parentheses](../guide_(draft).md)",
      "[angle path](<../guide space.md>)",
      "[valid reference][actual]",
      "[actual]: ../readme.md#actual-heading",
      "",
    ].join("\n"),
  );

  const findings = findBrokenDocumentationLinks({
    repoRoot: fixtureRoot,
    trackedPaths: new Set([
      "readme.md",
      "guide_(draft).md",
      "guide space.md",
      "docs/index.md",
    ]),
  });

  assert.deepEqual(findings, [
    "docs/index.md: missing anchor #missing in readme.md",
    "docs/index.md: missing tracked target ../README.md",
    "docs/index.md: missing tracked target ../missing.png",
    "docs/index.md: undefined reference link [missing-definition]",
  ]);
});
