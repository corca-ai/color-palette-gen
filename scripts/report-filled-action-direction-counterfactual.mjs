import { buildFilledActionDirectionCounterfactualReport } from "../v2/lib/filled-action-direction-counterfactual.js";

process.stdout.write(
  `${JSON.stringify(buildFilledActionDirectionCounterfactualReport(), null, 2)}\n`,
);
