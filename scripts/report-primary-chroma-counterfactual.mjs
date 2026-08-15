import { buildPrimaryChromaCounterfactualReport } from "../v2/lib/primary-chroma-counterfactual.js";

process.stdout.write(
  `${JSON.stringify(buildPrimaryChromaCounterfactualReport(), null, 2)}\n`,
);
