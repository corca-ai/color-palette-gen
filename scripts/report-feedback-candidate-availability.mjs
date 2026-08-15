import { buildFeedbackCandidateAvailabilityReport } from "../v2/lib/feedback-candidate-availability.js";

process.stdout.write(
  `${JSON.stringify(buildFeedbackCandidateAvailabilityReport(), null, 2)}\n`,
);
