import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { EVIDENCE, V2_POLICY } from "../v2/lib/policy.js";
import { EVIDENCE_AUTHORITIES } from "../v2/lib/evidence-authority.js";
import { V2_SEMANTIC_MODEL } from "../v2/lib/semantic-model.js";

const root = new URL("../", import.meta.url);

test("the managed ontology and flow stay bound to current production policy", async () => {
  const [ontology, rules] = await Promise.all([
    readFile(new URL("docs/v2-decisions/ontology.md", root), "utf8"),
    readFile(new URL("docs/v2-decisions/rules.md", root), "utf8"),
  ]);

  for (const [name, document] of [
    ["ontology", ontology],
    ["rules", rules],
  ]) {
    assert.ok(
      [...document.matchAll(/```mermaid\nflowchart TD/g)].length > 0,
      `${name} should contain a top-to-bottom Mermaid diagram`,
    );
    assert.doesNotMatch(document, /```mermaid\nflowchart (?:LR|RL|BT)/);
  }
  assert.match(ontology, /## 먼저 보는 전체 그림/);
  assert.match(ontology, /## 프로젝트를 이루는 개념/);
  assert.match(ontology, /## 한 mode가 만들어지는 순서/);
  assert.match(rules, /## 30초 요약/);
  assert.match(rules, /## 3\. generated Primary family를 고른다/);
  assert.match(
    rules,
    /## 4\. 공통 filled-action text를 정한 뒤 Destructive family를 고른다/,
  );
  assert.match(rules, /primary --> actionText/);
  assert.match(rules, /actionText --> destructive/);
  assert.match(ontology, /actionText --> destructive/);
  assert.match(rules, /## 5\. Warning family를 고른다/);
  assert.match(rules, /## 10\. Light와 Dark를 한 쌍으로 고른다/);
  assert.match(rules, /## 11\. 선택된 결과를 세 범위로 나누어 검증한다/);
  for (const classificationBoundary of [
    "C < 0.015",
    "0.015 <= C < 0.06",
    "C >= 0.06",
  ]) {
    assert.ok(rules.includes(`\`${classificationBoundary}\``));
  }
  for (const foundationExplanation of [
    "Light는 `L >= 0.96`, Dark는 `L <= 0.185`",
    "최소 `ΔL 0.01`",
    "모든 조합에서 최소 `4.5:1`",
    "최소 `3:1`",
    "`C <= 0.012`",
  ]) {
    assert.ok(
      rules.includes(foundationExplanation),
      `missing foundation explanation: ${foundationExplanation}`,
    );
  }
  assert.ok(
    rules.includes("(policy/roles.md#why-primary-chroma-is-capped-at-c-015)"),
  );
  for (const detailLink of [
    "policy/roles.md",
    "policy/evidence.md",
    "policy/semantic-model.md",
    "implementation/candidate-search.md",
    "../v2-spec.md#validation-policy",
  ]) {
    assert.ok(
      rules.includes(`(${detailLink})`),
      `missing rule guide: ${detailLink}`,
    );
  }
  for (const classification of ["achromatic", "subdued", "chromatic"]) {
    assert.ok(ontology.includes(`\`${classification}\``));
  }
  assert.match(rules, new RegExp(V2_POLICY.version));
  assert.match(rules, new RegExp(V2_POLICY.crossMode.pairRankingStrategy));
  for (const checkId of V2_POLICY.crossMode.eligibilityCheckIds) {
    assert.ok(rules.includes(`\`${checkId}\``), `missing check ID: ${checkId}`);
  }

  for (const dependency of [
    "primary --> actionText",
    "actionText --> destructive",
    "primary --> warning",
    "destructive --> warning",
    "primary --> focus",
    "destructive --> focus",
    "foundations --> contracts",
    "contracts --> bundle",
  ]) {
    assert.ok(
      ontology.includes(dependency),
      `missing managed edge: ${dependency}`,
    );
  }
  assert.match(rules, /complete inventory를 그대로 유지/);
  assert.match(rules, /verdicts\.contracts\.passed/);
  assert.match(rules, /NO_CANDIDATE/);
  assert.doesNotMatch(rules, /Restrict ranking pool/);
});

test("Destructive separation links semantic intent to its bounded mechanism", async () => {
  const [ontology, rules, semanticModel, about, reference] = await Promise.all([
    readFile(new URL("docs/v2-decisions/ontology.md", root), "utf8"),
    readFile(new URL("docs/v2-decisions/rules.md", root), "utf8"),
    readFile(
      new URL("docs/v2-decisions/policy/semantic-model.md", root),
      "utf8",
    ),
    readFile(new URL("v2/about.html", root), "utf8"),
    readFile(new URL("v2/reference.html", root), "utf8"),
  ]);

  for (const document of [rules, semanticModel]) {
    assert.match(document, /Primary.*일반|Primary represents the ordinary/s);
    assert.match(
      document,
      /Destructive.*삭제|Destructive represents.*irreversible/s,
    );
    assert.match(document, /지각|not establish that a viewer notices/s);
  }
  assert.match(about, /같은 화면에서 두 역할이 거의 같은 색/);
  assert.match(
    about,
    /사용자가 실제로 “위험” 의미를 알아본다는 것을\s*증명하지/s,
  );
  assert.match(reference, /숫자보다 먼저: 왜 다른 색이어야 하는가\?/);
  assert.match(reference, /이 검사가 말할 수 없는 것/);
  assert.match(ontology, /obligation scope/);
  assert.match(ontology, /semantic role identity/);
  assert.match(ontology, /동시에 표시된 fill 사이의 시각적 분리/);
  assert.match(ontology, /selected-result review/);
  assert.match(ontology, /ADR-0004/);
  assert.match(rules, /Active state 후보 occurrence 84,160개/);
  assert.match(rules, /교집합이 빈\s+결과/);
  assert.match(rules, /sRGB gamut mapping과 rendered-hex dedupe/);
  assert.match(rules, /모든 가능한 시스템의\s+교집합이 비었다는 뜻은 아니다/);
});

test("Selection text documentation preserves all four decision stages", async () => {
  const [rules, semanticModel, about, reference] = await Promise.all([
    readFile(new URL("docs/v2-decisions/rules.md", root), "utf8"),
    readFile(
      new URL("docs/v2-decisions/policy/semantic-model.md", root),
      "utf8",
    ),
    readFile(new URL("v2/about.html", root), "utf8"),
    readFile(new URL("v2/reference.html", root), "utf8"),
  ]);

  for (const stage of [
    "후보 평가",
    "Text 확정",
    "mode contract",
    "semantic evaluation",
  ]) {
    assert.ok(rules.includes(stage), `missing Selection stage: ${stage}`);
  }
  for (const contractId of [
    "selection.text-contrast",
    "Selected content",
    "selection-text-target-passes",
  ]) {
    assert.ok(reference.includes(contractId));
    assert.ok(semanticModel.includes(contractId));
  }
  assert.match(about, /후보를\s*만들자마자.*4\.5:1/s);
  assert.match(about, /semantic model은.*기록할 뿐 색을\s*다시 고르지 않는다/s);
  assert.match(reference, /class="selection-check-stages"/);
});

test("canonical navigation surfaces link to the managed color system", async () => {
  const [architecture, readme, docsMap, decisions] = await Promise.all([
    readFile(new URL("docs/architecture.md", root), "utf8"),
    readFile(new URL("readme.md", root), "utf8"),
    readFile(new URL("docs/README.md", root), "utf8"),
    readFile(new URL("docs/v2-decisions/README.md", root), "utf8"),
  ]);

  assert.match(architecture, /v2-decisions\/ontology\.md/);
  assert.match(architecture, /v2-decisions\/rules\.md/);
  assert.match(readme, /docs\/README\.md/);
  assert.match(docsMap, /v2-decisions\/README\.md/);
  assert.match(decisions, /\(ontology\.md\)/);
  assert.match(decisions, /\(rules\.md\)/);
  for (const groupedPath of [
    "policy/roles.md",
    "implementation/status.md",
    "research/adversarial-audit.md",
    "research/filled-action-state-direction.md",
    "research/text-contrast-policy.md",
    "research/warning-appearance.md",
    "reference/public-specimen.md",
  ]) {
    assert.ok(
      decisions.includes(`(${groupedPath})`),
      `missing grouped decision path: ${groupedPath}`,
    );
  }
});

test("text contrast research remains linked without becoming production policy", async () => {
  const [research, rules, development] = await Promise.all([
    readFile(
      new URL("docs/v2-decisions/research/text-contrast-policy.md", root),
      "utf8",
    ),
    readFile(new URL("docs/v2-decisions/rules.md", root), "utf8"),
    readFile(new URL("docs/development.md", root), "utf8"),
  ]);

  assert.match(research, /strict intersection requires both/);
  assert.match(research, /Intersection\s+\|\s+0\/14/);
  assert.match(research, /`dark\.primary` for 13 inputs/);
  assert.match(development, /does not add a UI\s+toggle/);
  assert.match(rules, /text-contrast-policy\.md/);
  assert.match(development, /diagnose:text-contrast/);
});

test("the rejected direction experiment and adopted successor stay discoverable", async () => {
  const [research, roles, status, product] = await Promise.all([
    readFile(
      new URL(
        "docs/v2-decisions/research/filled-action-state-direction.md",
        root,
      ),
      "utf8",
    ),
    readFile(new URL("docs/v2-decisions/policy/roles.md", root), "utf8"),
    readFile(
      new URL("docs/v2-decisions/implementation/status.md", root),
      "utf8",
    ),
    readFile(new URL("docs/product.md", root), "utf8"),
  ]);

  assert.match(research, /do not retain this as the final design direction/);
  assert.match(research, /default state is the dominant visual state/);
  assert.match(research, /Light output feels broadly too muted or muddy/);
  assert.match(research, /Dark output feels broadly too bright/);
  assert.match(
    research,
    /41 of 216 hover families and all 216 active families/,
  );
  assert.match(research, /Historical research/);
  assert.match(research, /ADR-0004/);
  assert.match(roles, /not a universal standard/);
  assert.match(status, /Accepted interaction disposition/);
  assert.match(
    product,
    /Policy v16 adopts a hue-independent mode-relative filled-action grammar/,
  );
});

test("action hierarchy supersedes red-band value reuse without changing palette truth", async () => {
  const [
    directionAdr,
    collisionAdr,
    hierarchyAdr,
    secondaryAdr,
    ontology,
    decisions,
  ] = await Promise.all([
    readFile(
      new URL(
        "docs/v2-decisions/adr/0001-source-red-collision-aware-filled-action-direction.md",
        root,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "docs/v2-decisions/adr/0002-red-band-role-collision-presentation.md",
        root,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "docs/v2-decisions/adr/0003-single-filled-action-hierarchy.md",
        root,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "docs/v2-decisions/adr/0006-context-derived-secondary-action-states.md",
        root,
      ),
      "utf8",
    ),
    readFile(new URL("docs/v2-decisions/ontology.md", root), "utf8"),
    readFile(new URL("docs/v2-decisions/README.md", root), "utf8"),
  ]);

  assert.match(directionAdr, /Status: \*\*Superseded before adoption\*\*/);
  assert.match(directionAdr, /source-red collision branch: `41\/216`/);
  assert.match(
    collisionAdr,
    /Status: \*\*Superseded after operator review\*\*/,
  );
  assert.match(
    hierarchyAdr,
    /Status: \*\*Accepted for component presentation\*\*/,
  );
  assert.match(
    hierarchyAdr,
    /Palette authority: semantic palette generation is now `v2-policy-model-16`/,
  );
  assert.match(hierarchyAdr, /single-filled-action-hierarchy-v1/);
  assert.match(hierarchyAdr, /primary-filled-destructive-outline/);
  assert.match(hierarchyAdr, /destructive-filled-secondary-cancel/);
  assert.match(hierarchyAdr, /diagnostic signal/);
  assert.match(secondaryAdr, /single-filled-action-hierarchy-v2/);
  assert.match(secondaryAdr, /confirmation-secondary-state-family-v1/);
  assert.match(secondaryAdr, /Muted Surface/);
  assert.match(ontology, /Action group hierarchy와 role collision/);
  assert.match(ontology, /single-filled-action-hierarchy-v2/);
  assert.match(ontology, /action group hierarchy/);
  assert.match(decisions, /Architecture decisions/);
  assert.match(decisions, /ADR-0003/);
  assert.match(decisions, /ADR-0004/);
});

test("documentation map separates current truth from preserved history", async () => {
  const [docsMap, archive] = await Promise.all([
    readFile(new URL("docs/README.md", root), "utf8"),
    readFile(new URL("docs/archive/v1/README.md", root), "utf8"),
  ]);

  for (const current of [
    "product.md",
    "v2-spec.md",
    "architecture.md",
    "interaction-design.md",
    "development.md",
    "v2-decisions/README.md",
  ]) {
    assert.ok(
      docsMap.includes(`(${current})`),
      `missing current doc: ${current}`,
    );
  }
  assert.match(docsMap, /Normative/);
  assert.match(docsMap, /Research/);
  assert.match(docsMap, /Historical/);
  assert.match(archive, /do(?:es)? not define current v2 behavior/i);
});

test("the ontology map stays bound to executable IDs and authorities", async () => {
  const [rules, evidence] = await Promise.all([
    readFile(new URL("docs/v2-decisions/rules.md", root), "utf8"),
    readFile(new URL("docs/v2-decisions/policy/evidence.md", root), "utf8"),
  ]);

  assert.match(rules, new RegExp(V2_POLICY.version));
  assert.match(rules, new RegExp(V2_POLICY.crossMode.pairRankingStrategy));
  for (const checkId of V2_POLICY.crossMode.eligibilityCheckIds) {
    assert.ok(rules.includes(`\`${checkId}\``));
  }
  for (const declaration of V2_SEMANTIC_MODEL.declarations) {
    for (const id of [
      declaration.id,
      declaration.evaluator,
      ...declaration.evidence,
    ]) {
      assert.ok(rules.includes(`\`${id}\``), `missing rules ID: ${id}`);
    }
  }
  for (const [decisionId, decision] of Object.entries(V2_POLICY.decisions)) {
    for (const id of [
      decisionId,
      ...decision.constraints,
      ...decision.objectives,
      ...decision.tieBreakers,
    ]) {
      assert.ok(rules.includes(`\`${id}\``), `missing policy ID: ${id}`);
    }
  }
  for (const authority of Object.values(EVIDENCE_AUTHORITIES)) {
    for (const [document, content] of [
      ["rules", rules],
      ["evidence", evidence],
    ]) {
      assert.ok(
        content.includes(`\`${authority}\``),
        `missing ${document} authority: ${authority}`,
      );
    }
  }
});

test("repo-owned policy provenance points to the grouped policy document", () => {
  const localSources = Object.values(EVIDENCE).filter(({ url }) =>
    url.includes("corca-ai/color-palette-gen/blob/main"),
  );

  assert.ok(localSources.length > 0);
  for (const source of localSources) {
    assert.match(source.url, /docs\/v2-decisions\/policy\/roles\.md#/);
  }
});

test("the Primary chroma cap links to its rationale and bounded evidence", async () => {
  const [roles, spec] = await Promise.all([
    readFile(new URL("docs/v2-decisions/policy/roles.md", root), "utf8"),
    readFile(new URL("docs/v2-spec.md", root), "utf8"),
  ]);

  assert.match(roles, /### Why Primary chroma is capped at C 0\.15/);
  assert.match(roles, /not a WCAG requirement/);
  assert.match(roles, /`provisional` authority/);
  assert.match(roles, /primary-chroma-restraint-counterfactual/);
  assert.match(spec, /policy\/roles\.md#why-primary-chroma-is-capped-at-c-015/);
});

test("numeric policy values link to an explicit provenance and authority index", async () => {
  const [rules, evidence] = await Promise.all([
    readFile(new URL("docs/v2-decisions/rules.md", root), "utf8"),
    readFile(new URL("docs/v2-decisions/policy/evidence.md", root), "utf8"),
  ]);

  assert.match(rules, /policy\/evidence\.md#numeric-policy-provenance/);
  assert.match(evidence, /## Numeric policy provenance/);

  for (const policyKey of [
    "search.candidateStep",
    "search.stateCandidateLimit",
    "primary.lightnessRange.light",
    "primary.chromaCap",
    "primary.maximumSourceDistance",
    "state.separation.hoverFromDefault",
    "state.progressionRatio",
    "crossMode.maximumHueDrift",
    "crossMode.maximumChromaDifference",
    "crossMode.lightnessGap",
    "neutral.tintCap",
    "foundation.hierarchySeparation",
    "focus.semanticSeparation",
    "selection.surfaceSeparation",
    "destructive.separation",
    "feedback.semanticSeparation",
    "semanticReview.minimumHueSeparation",
    "semanticReview.chromaFloor",
  ]) {
    assert.ok(
      evidence.includes(`\`${policyKey}`),
      `missing numeric provenance: ${policyKey}`,
    );
  }

  assert.match(evidence, /WCAG 2\.2 Non-text Contrast/);
  assert.match(evidence, /APCA-W3/);
  assert.match(evidence, /잠정적 설계 상수/);
  assert.match(evidence, /지각적으로 최적이거나 보편적으로/);
});

test("the public About page teaches ontology, flow, rules, and numeric authority", async () => {
  const [index, about, aboutScript, reference] = await Promise.all([
    readFile(new URL("v2/index.html", root), "utf8"),
    readFile(new URL("v2/about.html", root), "utf8"),
    readFile(new URL("v2/about.js", root), "utf8"),
    readFile(new URL("v2/reference.html", root), "utf8"),
  ]);

  assert.match(index, /href="\.\/about\.html">About/);
  assert.match(about, /id="concepts"/);
  assert.match(about, /id="dependencies"/);
  assert.match(about, /id="flow"/);
  assert.match(about, /id="rules"/);
  assert.match(about, /id="numbers"/);
  assert.match(about, /버튼이 놓일 화면 바탕부터 만든다/);
  assert.match(about, /대표 버튼의 전체 상태 묶음을 만든다/);
  assert.match(about, /삭제·위험 행동색을 만든다/);
  assert.match(about, /Light 화면과 Dark 화면을 짝짓는다/);
  assert.match(about, /Constraint/);
  assert.match(about, /Numeric policy provenance/);
  for (const dependencyEdge of [
    "foundation-primary",
    "primary-destructive",
    "destructive-states",
    "destructive-warning",
    "warning-states",
    "primary-selection",
    "destructive-focus",
    "destructive-states-ready",
    "warning-states-ready",
    "focus-ready",
    "selection-ready",
    "roles-contracts",
    "contracts-bundle",
  ]) {
    assert.ok(
      about.includes(`data-edge="${dependencyEdge}"`),
      `missing public dependency edge: ${dependencyEdge}`,
    );
  }
  assert.match(about, /Light mode bundle/);
  assert.match(about, /Dark mode bundle/);
  assert.match(about, /최종 Light × Dark pair/);
  assert.match(about, /읽는 값: Foundation \+ Primary \+ Destructive/);
  assert.match(about, /DAG\(방향성 비순환 그래프\)/);
  assert.match(about, /ontology\.md#한-mode가-만들어지는-순서/);
  assert.match(about, /id="numeric-lab"/);
  assert.match(about, /id="red-walkthrough"/);
  assert.match(about, /id="primary-selection-example"/);
  assert.match(about, /Light 밝기 범위에서 family 후보\s*<strong>34개/s);
  assert.match(about, /#FF0000[\s\S]*L \.628[\s\S]*\.46–\.54/);
  assert.match(about, /#B54437[\s\S]*4\.5:1[\s\S]*APCA/s);
  assert.match(reference, /href="\.\/about\.html#primary-selection-example"/);
  assert.match(about, /id="faq"/);
  assert.match(about, /#FF0000.*OKLCH/s);
  assert.match(about, /버튼색보다 먼저, 버튼이 놓일 화면 바탕을 만든다/);
  assert.match(about, /같은 빨강 버튼도 흰 화면\s+위와 검은 화면 위에서/);
  assert.match(about, /Light Foundation/);
  assert.match(about, /Dark Foundation/);
  for (const walkthroughId of [
    "input",
    "foundation",
    "primary",
    "destructive",
    "warning",
    "utility",
    "pair",
    "review",
  ]) {
    assert.match(about, new RegExp(`id="walkthrough-${walkthroughId}"`));
    assert.match(about, new RegExp(`href="#walkthrough-${walkthroughId}"`));
  }
  for (const readerQuestion of [
    "왜 측정하는가?",
    "왜 먼저 만드는가?",
    "왜 원본 빨강을 그대로 버튼에 쓰지 않는가?",
    "Destructive는 무엇인가?",
    "Warning은 무엇인가?",
    "pair는 무엇인가?",
    "생성 contract:",
    "selected-result review:",
    "semantic model:",
  ]) {
    assert.ok(
      about.includes(readerQuestion),
      `missing explanation: ${readerQuestion}`,
    );
  }
  assert.match(about, /#B54437/);
  assert.match(about, /#D05C4E/);
  assert.match(about, /#99000D/);
  assert.match(about, /#D8A730/);
  assert.match(about, /reference\.html#state-separation/);
  assert.match(about, /reference\.html#pair-bands/);
  assert.match(about, /contracts · pass/);
  assert.match(about, /min\(source C, 0\.15\)/);
  assert.match(about, /id="cap-pipeline"/);
  assert.match(about, /id="cap-hue-grid"/);
  assert.match(about, /id="gamut-strip"/);
  assert.match(aboutScript, /V2_POLICY\.primary\.chromaCap/);
  assert.match(aboutScript, /generatePaletteV2/);
  assert.match(aboutScript, /oklchToHex/);
  assert.match(about, /reference\.html#primary-chroma-cap/);
  assert.match(about, /reference\.html#foundation-mode-zone/);
  for (const anchor of [
    "oklch",
    "input-classification",
    "gamut-mapping",
    "generated-primary",
    "candidate-vs-constraint",
    "foundation-mode-zone",
    "foundation-search-radius",
    "foundation-hierarchy",
    "apca-lc",
    "foundation-text",
    "foundation-tint",
    "primary-range",
    "primary-chroma-cap",
    "state-separation",
    "pair-bands",
    "boundary-contrast",
    "oklab-delta-e",
    "semantic-separation",
    "semantic-hue-review",
    "role-inventories",
    "technical-values",
  ]) {
    assert.match(reference, new RegExp(`id="${anchor}"`));
  }
  assert.match(reference, /왜 <code>0\.04<\/code>가 아닌가/);
  assert.match(reference, /binary-search C only/);
  assert.match(reference, /Accessible Perceptual Contrast Algorithm/);
  assert.match(reference, /75% 대비/);
  assert.match(reference, /APCA-W3 계산 구현/);
  assert.match(reference, /Feedback이라는 별도 색 하나가 생성되는 것은 아니다/);
  assert.match(reference, /Focused control/);
  assert.match(
    reference,
    /min\(ΔE\(Warning, Primary\), ΔE\(Warning, Destructive\)\)/,
  );
  assert.match(reference, /min\(7\.1, 4\.2\) = 4\.2/);
  assert.match(reference, /min\(5\.4, 4\.8\) = 4\.8/);
  assert.match(reference, /#FF7452/);
  assert.match(reference, /Perceptual \/ local-MINDE/);
  assert.match(reference, /a = C × cos\(H × π \/ 180\)/);
  assert.match(reference, /b = C × sin\(H × π \/ 180\)/);
  assert.match(reference, /ΔE = √\(\(L₂−L₁\)² \+ \(a₂−a₁\)² \+ \(b₂−b₁\)²\)/);
  assert.match(reference, /ΔE = \.1129/);
  assert.match(reference, /CIEDE2000이 아니라/);
  assert.match(about, /reference\.html#oklab-delta-e/);
  assert.match(about, /reference\.html#gamut-mapping/);
  for (const pairCheckId of [
    "pair.primary-hue-drift",
    "pair.primary-chroma-difference",
    "pair.primary-lightness-gap",
    "light.primary.state.interval-ratio",
    "light.primary.state.monotonic-lightness",
    "dark.primary.state.interval-ratio",
    "dark.primary.state.monotonic-lightness",
  ]) {
    assert.match(reference, new RegExp(pairCheckId.replaceAll(".", "\\.")));
  }
  assert.match(reference, /3 \+ \(2 × 2\) = 7/);
  assert.match(reference, /Lcandidate = Ldefault ± \.0025 × index/);
  assert.match(about, /7개 전체 공식/);
  assert.match(reference, /외부 표준이나 지각 실험으로/);
  assert.match(reference, /H 70\/85\/100°/);
  assert.match(reference, /세 hue × 여러 L 후보 생성/);
  assert.match(reference, /source ΔE \.18/);
  assert.match(reference, /결과를 탈락시키거나 다른 색으로 다시 고르지 않는다/);
});
