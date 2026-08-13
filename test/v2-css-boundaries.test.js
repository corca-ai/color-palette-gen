import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

test("every split v2 stylesheet owns complete declaration blocks", async () => {
  const directory = new URL("../v2/styles/", import.meta.url);
  const files = (await readdir(directory)).filter((file) =>
    file.endsWith(".css"),
  );

  for (const file of files) {
    const source = await readFile(new URL(file, directory), "utf8");
    let depth = 0;
    for (const character of source.replaceAll(/\/\*[\s\S]*?\*\//g, "")) {
      if (character === "{") depth += 1;
      if (character === "}") depth -= 1;
      assert.ok(depth >= 0, `${file} closes a block owned by another file`);
    }
    assert.equal(depth, 0, `${file} leaves a declaration block open`);
  }
});
