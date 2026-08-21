import { buildFilledActionHybridCounterfactualReport } from "../v2/lib/filled-action-hybrid-counterfactual.js";

process.stdout.write(
  `${JSON.stringify(buildFilledActionHybridCounterfactualReport(), null, 2)}\n`,
);
