# Contextual Destructive separation counterfactual

Status: completed diagnostic; adopted by production v16 through
[ADR-0004](../adr/0004-mode-relative-filled-actions-and-contextual-separation.md).

## 질문

Accepted [single-filled action hierarchy](../adr/0003-single-filled-action-hierarchy.md)는
한 action group에서 Primary와 Destructive를 동시에 filled로 표시하지 않는다. 그렇다면
`destructive.brand-separation >= 0.08`은 후보를 생성 단계에서 탈락시키는 전역
constraint여야 하는가, 아니면 선택된 결과에 남는 presentation-context review
evidence여야 하는가?

이 진단은 두 번째 해석이 **현재 bounded engine에서 실행 가능한지**만 검사한다.
미적으로 더 좋거나 사람이 위험 의미를 더 잘 이해한다는 주장은 하지 않는다.

## 고정한 것과 바꾼 것

고정:

- historical production v15 baseline and cache/export identity during the probe;
- Primary와 Destructive라는 독립 semantic token/family;
- Light는 darker, Dark는 lighter인 diagnostic state 방향;
- mode별 하나의 shared black/white foreground;
- 현재 Primary·Destructive 후보 범위, step, sRGB gamut mapping과 rendered dedupe;
- state `ΔE`, label APCA, Warning, Focus, Selection, pair ranking과 semantic evaluator;
- fallback 없음.

변경:

- `destructive.brand-separation` 하나만 Destructive candidate eligibility에서 제외한다.
- 같은 `Brand → destructive` Oklab 거리와 `0.08` verdict는
  `reviewOnlyChecks`와 semantic evidence에 그대로 남긴다. Diagnostic mode contract의
  `nonTextChecks`에서는 제외해 contract와 review authority를 중복시키지 않는다.
- false verdict를 pass로 바꾸거나 숨기지 않는다.

실행 identity는
`mode-relative-contextual-destructive-separation`, report schema는
`color-palette-contextual-destructive-separation-counterfactual.v1`이다.

## 216-input 결과

| 관찰 | Production v15 | Candidate |
| --- | ---: | ---: |
| 비교 가능한 입력 | 216 | 216 |
| 완전 생성 | 216 | 216 |
| generation infeasible | 0 | 0 |
| generated contracts 통과 | 216 | 216 |
| pair eligibility miss 입력 | 0 | 0 |
| selected-result quality review 전체 통과 | 68 | 68 |
| semantic model 전체 satisfied | 216 | 194 |

`quality review 68/216`은 나머지 148개가 이 arm 때문에 새로 실패했다는 뜻이 아니다.
Baseline과 비교해 새로 생긴 quality finding은 Dark source-fidelity 9건뿐이다.

- `#00CCFF`
- `#33CCCC`
- `#33CCFF`
- `#66CC99`
- `#66CCCC`
- `#99CC00`
- `#99CC33`
- `#99CC66`
- `#99CC99`

새 contract failure와 pair-eligibility miss는 없었다. Semantic model에는
`feedback-oklab-separation-passes:unsatisfied`가 22개 입력에서 새로 나타났다. 이것은
의도한 authority 이동의 결과다. 생성은 허용하되 separation evidence 자체는 계속
false라고 말한다.

## Separation evidence

| Mode | `ΔE >= 0.08` 통과 | 최소 | 평균 | 최대 |
| --- | ---: | ---: | ---: | ---: |
| Light | 211 / 216 | 0.03977 | 0.22171 | 0.31602 |
| Dark | 194 / 216 | 0.04064 | 0.21653 | 0.31938 |

Dark에서 22개 입력이 separation review를 통과하지 않는다. 이 결과는 token identity를
합치지 않는다. Primary와 Destructive는 계속 서로 다른 family와 decision provenance를
갖고, component layer가 둘 중 어느 role을 filled로 표시할지 결정한다.

## 온톨로지에 대해 얻은 것

이번 결과는 다음 구분이 실행 가능한 구조임을 강하게 지지한다.

```text
semantic role identity
!= candidate-generation eligibility
!= selected-result relationship evidence
!= component presentation hierarchy
```

즉 `Primary`와 `Destructive`가 다른 role이라는 사실을 유지하면서도, 둘의 수치 거리를
모든 palette 후보의 생성 조건으로 강제하지 않을 수 있다. 22개 false relation과
9개 source-fidelity 회귀는 계속 남는다. 후속 operator 검토는 이 경고를
감수하고 v16으로 authority를 이동했지만 false verdict를 pass로 바꾸지 않았다.

## 완료된 결정

1. Project operator가 `/contextual-review.html`에서 exact warning queue를 검토했다.
2. Dark default·hover·active와 shared foreground를 중심으로 오른쪽 결과를
   충분히 구분 가능하다고 disposition했다.
3. [ADR-0004](../adr/0004-mode-relative-filled-actions-and-contextual-separation.md)가
   `0.08`의 owner를 selected-result review로 이동하고 policy v16을 채택했다.

## 재현

```bash
npm run diagnose:contextual-destructive-separation
npm run test:contextual-destructive-separation-counterfactual
```

비교 UI는 이 report의 고정 warning queue만 읽는 진단 표면이다. 입력마다 두 arm을
그때 생성하지만 선택을 저장하거나 production cache/export를 수정하지 않는다.

고정 corpus는 deterministic coverage이지 사용자 집단이나 지각 실험의 표본이 아니다.
