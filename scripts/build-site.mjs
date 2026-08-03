import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(scriptDirectory);
const outputDirectory = join(projectRoot, "dist");
const outputLibraryDirectory = join(outputDirectory, "lib");
const libraryFiles = [
  "color-math.js",
  "constraints.js",
  "debug-visual.js",
  "harmony.js",
  "output-format.js",
  "palette-config.js",
  "palette-engine.js",
  "palette-generator.js",
];

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputLibraryDirectory, { recursive: true });

for (const filename of ["index.html", "app.js", "style.css"]) {
  await cp(join(projectRoot, filename), join(outputDirectory, filename));
}

for (const filename of libraryFiles) {
  await cp(
    join(projectRoot, "lib", filename),
    join(outputLibraryDirectory, filename),
  );
}

await writeFile(join(outputDirectory, ".nojekyll"), "");

console.log(
  `Built static site with ${libraryFiles.length} library modules in dist/.`,
);
