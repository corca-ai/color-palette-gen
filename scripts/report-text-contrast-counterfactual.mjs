#!/usr/bin/env node

import { buildTextContrastCounterfactualReport } from "../v2/lib/text-contrast-counterfactual.js";

process.stdout.write(
  `${JSON.stringify(buildTextContrastCounterfactualReport(), null, 2)}\n`,
);
