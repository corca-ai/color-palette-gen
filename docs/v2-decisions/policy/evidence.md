# Evidence and provenance

Color Lab separates rule/declaration authority from external source provenance.
Neither vocabulary measures importance, and aggregate verdict authority is a
third, separate concept described in [Ontology](../ontology.md).

## Rule and declaration authority

Every executable decision rule and semantic declaration uses one value from the
closed vocabulary owned by `v2/lib/evidence-authority.js`.

| Authority         | Meaning                                                           | Example                                                |
| ----------------- | ----------------------------------------------------------------- | ------------------------------------------------------ |
| `normative`       | Published requirement used only in its actual scope               | Required input boundary has `>= 3:1` adjacent contrast |
| `product-policy`  | Deliberate selection rule owned by current v2 policy              | Primary pair eligibility membership                    |
| `provisional`     | Review or selection evidence with an unvalidated numeric boundary | Current cross-mode chroma-difference band              |
| `technical`       | Structural implementation truth rather than design validation     | Exported state colors must be distinct                 |
| `heuristic`       | Replaceable design approximation without empirical validation     | Current interaction-state Oklab separation             |
| `research-policy` | Explicit relation chosen for this research prototype              | Active continues beyond hover in one direction         |

Unknown authority values fail policy or semantic trace validation.

## External evidence source class

`policy.js` separately labels cited source material. Current source classes are:

| Source class | Meaning                                                                   |
| ------------ | ------------------------------------------------------------------------- |
| `normative`  | Published requirement cited in its real scope                             |
| `reference`  | Observable precedent from a public design system                          |
| `heuristic`  | Prototype rationale that does not supply normative or empirical authority |

Source class does not automatically determine a rule's authority. A public
reference may motivate a `product-policy` or `heuristic` rule without proving
its exact threshold.

## Numeric policy provenance

이 표는 규칙에 등장하는 숫자를 찾았을 때 보는 정본 색인이다. 숫자가 외부 표준에
직접 규정되어 있으면 그 표준을 연결하고, 그렇지 않으면 현재 제품 방향을 구현하기
위해 선택한 **잠정적 설계 상수**임을 명시한다. `product-policy`, `provisional`,
`heuristic` 값은 코드에 고정되어 있다는 뜻이지 지각적으로 최적이거나 보편적으로
옳다는 뜻이 아니다.

소수점 출력 자릿수, cache 크기, 배열 index처럼 결과 의미를 정하지 않는 구현 숫자는
대상에서 제외한다. 아래에는 후보 범위·간격·threshold·tolerance처럼 결과를 바꿀 수
있는 reader-facing behavioral constant를 포함한다.

### Input classification and search resolution

| 값 / policy key                                                        | 역할                                 | 근거와 현재 권위                                                                                                               |
| ---------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `C 0.015` achromatic 경계                                              | hue를 생성에 사용하지 않을 입력 구분 | hue가 매우 낮은 chroma에서 불안정해지는 문제를 피하기 위한 runtime `heuristic`; 공개 지각 표준이나 검증된 경계가 아님          |
| `C 0.06` subdued/chromatic 경계                                        | 입력 설명과 diagnostic cohort 구분   | 현재 두 분류가 같은 non-achromatic 생성 경로를 사용하므로 분석용 `heuristic`; 생성 정책의 품질 경계가 아님                     |
| `search.candidateStep = 0.0025`                                        | Primary/state lightness 탐색 해상도  | 결과 재현성과 탐색 비용을 절충한 `technical` 상수; 지각 임계값이 아님                                                          |
| `search.stateCandidateLimit = 80`                                      | state 탐색의 유한 상한               | 무한 탐색을 막는 `technical` 실행 한계; 디자인 품질 기준이 아님                                                                |
| `foundation.candidateStep = 0.005` 및 role별 탐색 반경                 | Foundation 후보 표본화               | recipe 주변을 조밀하게 탐색하기 위한 `technical`/`product-policy` 선택; 외부 표준 없음                                         |
| Foundation 일반 `±0.04`, text `±0.08`, input `±0.10` 반경과 tint scale | recipe 주변 후보 inventory           | 역할별 탐색 폭과 tint 다양성을 정한 `product-policy`/`technical` 상수; 지각 임계값이 아니며 exact recipe는 `palette.js`가 소유 |

### Accessibility-linked values

| 값 / policy key                                                                      | 역할                                                                                | 근거와 현재 권위                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `foundation.inputContrast = 3`, `primary.boundaryContrast = 3`, `focus.contrast = 3` | 필수 control boundary와 focus indicator의 인접색 대비                               | [WCAG 2.2 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast)의 실제 범위에 한해 `normative`; Focus는 실제 Background/Surface/Muted Surface를 검사하며 장식 border나 hover 변화량으로 일반화하지 않음 |
| `text.wcagNormalTextMinimum = 4.5`                                                   | 선언된 normal-text 사용의 생성 적격성과 최종 contract                               | [WCAG 2.2 Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum)에 연결된 `normative` 값; 전체 접근성 인증은 아님                                                                                          |
| `text.typographyContexts.*`                                                          | Body `11/400`, Muted `9/400`, Action `11/650`, Warning `10/650`, Selection `10/400` | 공개 specimen의 실제 CSS를 기록한 versioned usage context; 외부 최적값이나 token 자체의 보편적 typography가 아님                                                                                                                    |
| `*.apcaDiagnosticLc = 75/60`                                                         | WCAG 적격 후보의 APCA 진단·순위 목표                                                | [APCA-W3 계산 구현](https://github.com/Myndex/apca-w3)을 사용하지만 목표는 `legacy-provisional`; 생성 탈락이나 WCAG 적합성 권위가 아님                                                                                              |

### Primary, states, and Light/Dark pairing

| 값 / policy key                                                            | 역할                                                | 근거와 현재 권위                                                                                                                                                                                                               |
| -------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `primary.lightnessRange.light = [0.46, 0.54]`, `dark = [0.58, 0.62]`       | mode별 Primary 후보 영역                            | Light/Dark 역할을 분리하려는 `product-policy`; 공개 design-system 방향을 참고했지만 정확한 끝점은 `heuristic`                                                                                                                  |
| `primary.chromaCap = 0.15`                                                 | calm/minimal Primary 상한                           | [전용 근거와 반례 실험](roles.md#why-primary-chroma-is-capped-at-c-015)에 정리된 `provisional` 안정성 가드                                                                                                                     |
| `primary.chromaTolerance = 0.002`                                          | gamut 변환·부동소수점 경계 허용                     | 의도한 상한 부근의 수치 흔들림을 위한 `technical` tolerance; 시각적 허용량이 아님                                                                                                                                              |
| `primary.maximumSourceDistance = 0.18`                                     | 큰 source shift review                              | source fidelity 손실을 드러내기 위한 `provisional` review 경계; 최적 또는 허용 가능한 지각 거리로 검증되지 않음                                                                                                                |
| `state.separation.hoverFromDefault = 0.035`, `activeFromDefault = 0.075`   | default→hover→active 최소 Oklab 이동                | Carbon/Spectrum의 순차 진행을 참고한 `heuristic`; 이 정확한 ΔE 값은 외부 자료가 규정하지 않음                                                                                                                                  |
| Secondary `minimumDeltaE = 0.015/0.030`, step `0.005`, 최대 L shift `0.08` | destructive-confirmation Cancel의 작은 상태 진행    | filled sibling보다 낮은 강조도를 유지하려는 context-local `provisional` recipe; 외부 표준이나 지각 보정 결과가 아니며 [ADR-0006](../adr/0006-context-derived-secondary-action-states.md)의 216-input 검사는 feasibility만 확립 |
| `state.progressionRatio = [0.8, 1.5]`                                      | hover와 active 간격의 pacing review                 | 너무 약한 첫 단계나 급격한 둘째 단계를 찾는 `provisional` band; 사용자 연구로 보정되지 않음                                                                                                                                    |
| `crossMode.maximumHueDrift = 4°`                                           | Light/Dark Primary hue 정체성                       | 같은 brand hue를 유지하기 위한 `provisional` 허용치; 지각 표준이 아님                                                                                                                                                          |
| `crossMode.maximumChromaDifference = 0.035`                                | Light/Dark Primary chroma 차이                      | mode 간 강도 차이를 제한하는 `provisional` 허용치; 경험적으로 교정되지 않음                                                                                                                                                    |
| `crossMode.lightnessGap = [0.04, 0.16]`                                    | Dark Primary가 Light Primary보다 밝게 유지되는 범위 | mode 역할 구분과 과도한 이탈을 함께 제한하는 `provisional` product band                                                                                                                                                        |

### Foundations and supporting roles

| 값 / policy key                                                                                                    | 역할                                     | 근거와 현재 권위                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `neutral.tintCap = 0.012`                                                                                          | 넓은 Foundation 면의 tint 상한           | calm/minimal 방향을 구현한 `heuristic`; [외부 자료가 최적값을 증명하지 않음](#external-sources-and-their-limits)                       |
| Light Background `L >= 0.96`, Dark Background `L <= 0.185`                                                         | `foundation.mode-zone`                   | Foundation이 각 mode의 끝 영역에 머물게 하는 `product-policy`; Dark 값은 recipe `0.145 + 0.04` 탐색 반경에서 유도되며 외부 표준은 아님 |
| `foundation.hierarchySeparation = 0.01`                                                                            | 인접 Foundation layer의 최소 ΔL          | hierarchy가 수치상 같은 면으로 붕괴하지 않게 하는 `product-policy`/`heuristic`; 지각 검증 경계가 아님                                  |
| hierarchy tolerance `0.001`, tint tolerance `0.0005`                                                               | gamut 변환·부동소수점 경계 허용          | threshold의 의미를 바꾸지 않기 위한 `technical` tolerance; 사람이 느끼는 허용량이 아님                                                 |
| `focus.semanticSeparation = 0.05`                                                                                  | Focus와 Primary/Destructive의 Oklab 구분 | control 관계를 구분하려는 `heuristic`; WCAG의 `3:1` 인접 대비와 별개의 잠정 규칙                                                       |
| `focus.lightnessRange = [0.2, 0.86]`, `focus.chromaScales = [0.35, 0.65, 1]`, `focus.candidateStep = 0.01`         | bounded Focus 후보 inventory             | 탐색 공간을 제한하는 `product-policy`/`technical` recipe; 외부 표준이나 최적화 결과가 아님                                             |
| Focus/Primary Border hue drift `4°`; Primary Border `L [0.12, 0.88]`, step `0.01`, chroma scales `[0.35, 0.65, 1]` | source hue family 안의 boundary 후보     | brand 관계를 유지하기 위한 `heuristic`과 bounded inventory; `4°`는 지각적으로 검증된 동일-hue 경계가 아님                              |
| `selection.lightnessRange.light = [0.82, 0.94]`, `dark = [0.24, 0.38]`, `chromaScales = [0.15, 0.3, 0.45]`         | 낮은 강조도의 Selection tint 후보        | surface 위에서 mode에 맞는 tint를 찾는 `product-policy` recipe; 정확한 축 값은 `heuristic`                                             |
| `selection.surfaceSeparation = 0.03`                                                                               | Selection과 Surface의 Oklab 구분         | 선택 상태가 배경에 흡수되지 않게 하는 `heuristic`; 접근성 표준 수치가 아님                                                             |

### Feedback and semantic review

| 값 / policy key                                                                                   | 역할                                        | 근거와 현재 권위                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `destructive` hue `27°`, chroma `0.19`                                                            | semantic red 후보 중심                      | 현재 역할 정의를 위한 `product-policy` anchor; 모든 문화·화면에서의 destructive 의미를 증명하지 않음                                                                                                                                                                                                                                                               |
| source-red band center `27°`, radius `< 38°`                                                      | alternate Destructive lightness anchor 적용 | 입력 red와 Destructive가 가까울 때 lightness preference를 바꾸는 `product-policy` predicate; 38°는 경험적으로 검증된 red 범위가 아니며 [고정-anchor 진단](../research/adversarial-audit.md#destructive-anchor-counterfactual)으로 별도 검토됨                                                                                                                      |
| `destructive.lightnessRange.light = [0.30, 0.56]`, `dark = [0.56, 0.72]`, `candidateStep = 0.005` | Destructive 후보 inventory                  | label과 mode 역할을 함께 만족시키기 위한 `product-policy`/`technical` recipe; 외부 표준 없음                                                                                                                                                                                                                                                                       |
| `destructive.separation = 0.08`                                                                   | Primary↔Destructive Oklab 거리 review       | 의미 역할 충돌을 알리기 위한 `heuristic`; 지각적 의미 구분을 검증한 표준이 아니다. Policy v16에서는 generation eligibility가 아니라 selected-result review이며 false verdict도 보존한다. 이전 v15에서는 frozen candidate/state 조건과 함께 12개 red 입력의 빈 교집합을 만들었다. [ADR-0004](../adr/0004-mode-relative-filled-actions-and-contextual-separation.md) |
| `feedback.warningHue = 85°`, candidates `[70°, 85°, 100°]`                                       | Warning amber hue inventory                 | semantic amber를 위한 `product-policy`; ±15° ladder는 임의성이 남은 bounded recipe                                                                                                                                                                                                                                                                                |
| `feedback.warningChroma.light = 0.18`, `dark = 0.14`                                             | mode별 Warning chroma request               | Light `.18`은 operator가 선택한 v19 arm, Dark `.14`는 검토 범위 밖이라 유지; 실제 rendered C는 sRGB gamut mapping 후 달라짐. [ADR-0007](../adr/0007-light-warning-vivid-amber.md)                                                                                                                                                                                       |
| `feedback.warningLightness.light = 0.78`, `dark = 0.72`, ranges `[0.52, 0.82]` / `[0.62, 0.80]`   | Warning mode anchor와 inventory             | Light 값은 두 단계 human review와 216-input feasibility 후 채택한 `product-policy`; Dark는 미검토 sibling으로 유지. 외부 표준이나 보편적 미적 최적값이 아님. [ADR-0007](../adr/0007-light-warning-vivid-amber.md)                                                                                                                                                         |
| `feedback.semanticSeparation = 0.08`                                                              | Warning과 Primary/Destructive의 Oklab 거리  | 역할 충돌 review를 위한 `heuristic`; semantic 의미를 독립적으로 입증하지 않음                                                                                                                                                                                                                                                                                      |
| `semanticReview.minimumHueSeparation = 30°`                                                       | Primary↔Destructive/Warning hue review      | 낮은 hue 분리를 표시하는 `provisional` review 기준; 생성 contract나 지각적으로 검증된 혼동 경계가 아님                                                                                                                                                                                                                                                             |
| `semanticReview.chromaFloor = 0.025`                                                              | 거의 무채색인 색에서 hue review 제외        | hue가 불안정한 영역을 제외하기 위한 `provisional` guard; 경험적으로 보정된 지각 경계가 아님                                                                                                                                                                                                                                                                        |

값을 변경할 때는 숫자만 수정하지 않는다. 실행 정본인 `V2_POLICY`/role recipe,
이 표의 근거와 authority, 관련 규칙 설명, 고정 corpus 진단을 같은 변경 단위에서
검토한다. 외부 근거가 새로 생겨도 그 자료가 **정확히 어떤 역할과 측정 범위**를
규정하는지 확인하기 전에는 `normative`로 승격하지 않는다.

## External sources and their limits

- [WCAG 2.2 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast)
  supports `3:1` adjacent contrast for required UI information. It does not say
  that hover colors must differ from default colors by `3:1`.
- [WCAG 2.2 Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance)
  separates focus-indicator adjacent contrast from change-of-contrast and area.
- [Carbon interaction colors](https://preview.carbondesignsystem.com/building-blocks/foundations/color/overview)
  supports a subtle hover step, stronger active step, and context-dependent
  lightness direction. It does not establish v2's exact distance.
- [Spectrum using color](https://spectrum.adobe.com/page/using-color/) supports
  a monotonic default, hover, and down scale. It does not establish v2's exact
  scale.
- [Material 3 states](https://m3.material.io/foundations/interaction/states/overview)
  is a precedent for consistent, combinable state indicators, not a requirement
  to use state layers in v2.
- [USWDS state tokens](https://designsystem.digital.gov/design-tokens/color/state-tokens/)
  supports deriving semantic states from a governed scale rather than arbitrary
  component-local functions.

No source above proves that `Delta E 0.035`, chroma scale `0.82`, or neutral tint
`C 0.012` is optimal. These remain heuristics until a documented evaluation
replaces them.
