import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generatePaletteV2 } from "../v2/lib/palette.js";
import { EVALUATION_INPUTS } from "../v2/lib/evaluation-inputs.js";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(scriptDirectory);
const outputDirectory = join(projectRoot, "dist");
const outputLibraryDirectory = join(outputDirectory, "lib");
const outputV1Directory = join(outputDirectory, "v1");
const outputV2Directory = join(outputDirectory, "v2");
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
await mkdir(outputV1Directory, { recursive: true });
await mkdir(outputV2Directory, { recursive: true });

for (const filename of ["index.html", "app.js", "style.css"]) {
  await cp(
    join(projectRoot, "v1", filename),
    join(outputV1Directory, filename),
  );
}

for (const filename of libraryFiles) {
  await cp(
    join(projectRoot, "lib", filename),
    join(outputLibraryDirectory, filename),
  );
}

await cp(join(projectRoot, "v2"), outputV2Directory, { recursive: true });

const evaluationResults = EVALUATION_INPUTS.map((primary) => {
  const result = generatePaletteV2({ primary });
  return {
    input: result.input,
    policyVersion: result.policyVersion,
    quality: result.quality,
    verdicts: {
      qualityReview: result.verdicts.qualityReview,
    },
    hoverDiagnostics: result.hoverDiagnostics,
    modes: {
      light: { values: result.modes.light.values },
      dark: { values: result.modes.dark.values },
    },
  };
});
await writeFile(
  join(outputV2Directory, "evaluation-palettes.json"),
  JSON.stringify({
    schema: "color-lab-evaluation-palettes-2",
    policyVersion: evaluationResults[0].policyVersion,
    results: evaluationResults,
  }),
);

const v2Index = await readFile(join(projectRoot, "v2", "index.html"), "utf8");
const rootIndex = v2Index
  .replaceAll('href="./styles/', 'href="./v2/styles/')
  .replace('href="../">Color Lab</a>', 'href="./">Color Lab</a>')
  .replace('href="../v1/">v1</a>', 'href="./v1/">v1</a>')
  .replace('src="./app.js"', 'src="./v2/app.js"');

await writeFile(join(outputDirectory, "index.html"), rootIndex);

await writeFile(join(outputDirectory, ".nojekyll"), "");

console.log(
  `Built v2 at dist/, v1 at dist/v1/, and ${libraryFiles.length} shared library modules.`,
);
