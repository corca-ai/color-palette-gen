import {
  cp,
  mkdir,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(scriptDirectory);
const outputDirectory = join(projectRoot, "dist");
const libraryDirectory = join(projectRoot, "lib");
const outputLibraryDirectory = join(outputDirectory, "lib");

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputLibraryDirectory, { recursive: true });

for (const filename of ["index.html", "app.js", "style.css"]) {
  await cp(join(projectRoot, filename), join(outputDirectory, filename));
}

const libraryFiles = (await readdir(libraryDirectory))
  .filter((filename) => filename.endsWith(".js"))
  .sort();

for (const filename of libraryFiles) {
  await cp(
    join(libraryDirectory, filename),
    join(outputLibraryDirectory, filename),
  );
}

await writeFile(join(outputDirectory, ".nojekyll"), "");

console.log(
  `Built static site with ${libraryFiles.length} library modules in dist/.`,
);

