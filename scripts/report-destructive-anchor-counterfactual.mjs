import { buildDestructiveAnchorCounterfactualReport } from "../v2/lib/destructive-anchor-counterfactual.js";

process.stdout.write(
  `${JSON.stringify(buildDestructiveAnchorCounterfactualReport(), null, 2)}\n`,
);
