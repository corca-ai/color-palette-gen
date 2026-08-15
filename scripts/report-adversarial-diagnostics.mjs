import { buildAdversarialDiagnosticReport } from "../v2/lib/adversarial-diagnostics.js";

process.stdout.write(
  `${JSON.stringify(buildAdversarialDiagnosticReport(), null, 2)}\n`,
);
