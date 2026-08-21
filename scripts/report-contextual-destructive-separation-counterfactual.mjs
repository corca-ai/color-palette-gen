#!/usr/bin/env node

import { buildContextualDestructiveSeparationCounterfactualReport } from "../v2/lib/contextual-destructive-separation-counterfactual.js";

process.stdout.write(
  `${JSON.stringify(buildContextualDestructiveSeparationCounterfactualReport(), null, 2)}\n`,
);
