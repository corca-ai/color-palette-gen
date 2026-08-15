import { buildModeRangeCounterfactualReport } from "../v2/lib/mode-range-counterfactual.js";

process.stdout.write(
  `${JSON.stringify(buildModeRangeCounterfactualReport(), null, 2)}\n`,
);
