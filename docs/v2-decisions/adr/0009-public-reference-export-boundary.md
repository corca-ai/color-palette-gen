# ADR-0009: public reference export boundary

- Status: **Accepted**
- Date: 2026-08-21
- Primary migration kind: **schema/version**

## Context

The generated palette needs a stable, machine-readable example that demonstrates
how every Light and Dark role can be serialized without making the applied
specimen or an application-specific token model part of palette generation.

## Before and after law

- Before: the public reference export boundary and its nonclaims were not owned
  by one explicit decision.
- After: `color-lab-reference-tokens-1` is the sole project-owned reference
  token schema, with complete generated-role coverage and policy provenance.

## Decision

`serializeReferenceTokens()` in `reference-export.js` owns the public reference
payload. It serializes every generated role exactly once for both modes and
includes the result schema, policy version, semantic-model version, and normalized
input identity.

The reference export demonstrates serialization only. It does not certify an
application's aliases, derived component roles, typography, DOM structure,
interaction behavior, or browser rendering. Those checks require the actual
application context.

No generated palette role, value, candidate eligibility rule, ranking rule,
result schema, or production policy version changes under this decision.

## Acceptance checks

- Reference-export tests prove complete role coverage and exact Light/Dark
  serialization.
- The public applied specimen consumes generated tokens without becoming
  generation authority.
- Documentation describes the schema positively and makes its nonclaims clear.
- `npm run check`, `npm run build`, and the browser gate pass.
