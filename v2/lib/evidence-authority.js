export const EVIDENCE_AUTHORITIES = Object.freeze({
  NORMATIVE: "normative",
  PRODUCT_POLICY: "product-policy",
  PROVISIONAL: "provisional",
  TECHNICAL: "technical",
  HEURISTIC: "heuristic",
  RESEARCH_POLICY: "research-policy",
});

const AUTHORITY_VALUES = new Set(Object.values(EVIDENCE_AUTHORITIES));

export function assertEvidenceAuthority(authority, context = "Evidence") {
  if (!AUTHORITY_VALUES.has(authority)) {
    throw new TypeError(`${context} has an unknown evidence authority.`);
  }
  return authority;
}
