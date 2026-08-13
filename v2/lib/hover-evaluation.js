import { isHex, normalizeHex } from "../../lib/color-math.js";

export const HOVER_EVALUATION_SCHEMA = "color-lab-hover-evaluation-1";
export const HOVER_SPECIMEN = "applied-primary-action-1";
export const HOVER_JUDGMENTS = ["too-subtle", "meets-intent", "too-strong"];

const MODES = ["light", "dark"];

export function hoverEvaluationKey(primary, policyVersion) {
  return `${normalizeHex(primary)}|${policyVersion}|${HOVER_SPECIMEN}`;
}

export function normalizeHoverEvaluation(record) {
  if (
    !record ||
    record.schema !== HOVER_EVALUATION_SCHEMA ||
    typeof record.input !== "string" ||
    !isHex(record.input) ||
    typeof record.policyVersion !== "string" ||
    record.specimen !== HOVER_SPECIMEN
  ) {
    return null;
  }
  const modes = Object.fromEntries(
    MODES.map((mode) => {
      const value = record.modes?.[mode] ?? {};
      return [
        mode,
        {
          ...(HOVER_JUDGMENTS.includes(value.judgment)
            ? { judgment: value.judgment }
            : {}),
          ...(typeof value.note === "string" && value.note.trim()
            ? { note: value.note.trim().slice(0, 1000) }
            : {}),
        },
      ];
    }),
  );
  return {
    schema: HOVER_EVALUATION_SCHEMA,
    input: normalizeHex(record.input),
    policyVersion: record.policyVersion,
    specimen: HOVER_SPECIMEN,
    modes,
  };
}

export function hoverEvaluationEvidence(record, primary, policyVersion) {
  const normalized = normalizeHoverEvaluation(record);
  const matches =
    normalized?.input === normalizeHex(primary) &&
    normalized?.policyVersion === policyVersion;
  const modes = matches ? normalized.modes : {};
  const complete = MODES.every(
    (mode) => modes[mode]?.judgment && modes[mode]?.note,
  );
  const satisfies =
    complete && MODES.every((mode) => modes[mode].judgment === "meets-intent");
  return {
    complete,
    satisfies,
    record: matches ? normalized : null,
  };
}
