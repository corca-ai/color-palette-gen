import { buildPairRankingCounterfactualReport } from "../v2/lib/pair-ranking-counterfactual.js";

process.stdout.write(
  `${JSON.stringify(buildPairRankingCounterfactualReport(), null, 2)}\n`,
);
