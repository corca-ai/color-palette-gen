# Palette engine extraction and testing plan

## Goal

색상 생성 규칙이 UI와 무관하게 실행되고, 여러 hue와 vibe 조합에서도 선언한
조건을 유지하는지 자동으로 검증할 수 있게 한다.

## Completed baseline

`lib/color-math.js`는 다음 순수 계산을 DOM에서 분리한다.

- hex/RGB 변환
- sRGB transfer function
- RGB/OKLCH 변환
- OKLCH → sRGB chroma mapping
- relative luminance와 WCAG contrast
- 출력 formatting

`test/color-math.test.js`는 다음 기준선을 고정한다.

- 알려진 OKLCH 좌표
- 8-bit hex round-trip
- 알려진 WCAG contrast
- gamut mapping 후 sRGB 포함
- mapping 과정의 lightness/hue 보존
- representative L/C/H sweep
- 색역 경계의 부동소수점 tolerance

이 테스트는 현재 알고리즘을 승인된 최종 구현으로 선언하지 않는다. 이후
CSS Color 4 방식이나 검증된 라이브러리로 교체할 때 발생한 결과 차이를
의식적으로 검토하기 위한 baseline이다.

## Extraction progress

현재 다음 계산 경계를 DOM에서 분리했다.

- `lib/color-math.js`: 변환, 대비, gamut mapping과 diagnostic
- `lib/palette-config.js`: vibe, harmony 후보, 필수 semantic function
- `lib/harmony.js`: supporting hue derivation과 pair completion
- `lib/palette-engine.js`: 입력 해석, explicit/derived supporting color 결정
- `lib/constraints.js`: 대비, gamut, state, hue relation 검증

`lib/palette-generator.js`는 semantic token 생성, button state 생성, trace
조립까지 담당한다. 따라서 브라우저 없이 완성 팔레트를 생성하고 Constraint
Report까지 직접 검사할 수 있다. `app.js`는 새 generator를 실제 렌더링 경로로
사용한다.

DOM에 남을 책임은 다음으로 제한한다.

- 입력 읽기
- engine 호출
- 결과 렌더링
- 사용자 인터랙션

## Required palette invariants

입력 해석 단계에서는 다음 조합을 이미 순회한다.

```text
representative primary hues
× every vibe
× every harmony candidate
× input modes:
  primary only
  primary + secondary
  primary + secondary + additional
```

현재 자동 검증되는 내용:

- 모든 vibe와 각 vibe의 harmony 후보 설정 유효성
- primary only / primary + secondary / 세 색상 explicit 입력 처리
- explicit secondary와 additional 보존
- secondary가 있을 때 additional의 pair completion
- analogous와 split complement가 동일한 공식으로 붕괴하지 않음
- 변환, gamut mapping, contrast 계산
- constraint report의 category와 실패/보정 상태 노출

완성 팔레트 단계에서 추가된 검증:

- 필수 16개 function이 정확히 한 번씩 생성됨
- 모든 token에 inspectable trace가 존재하고 `final` 단계로 종료됨
- 대표 primary 4종 × 모든 vibe × 모든 harmony × 세 입력 모드에서 완성
  팔레트와 Constraint Report 생성
- 검증 결과에 `NaN` 같은 계산 실패가 노출되지 않음

추가로 강화할 검증:

- 필수 function이 모두 한 번씩 존재
- 모든 sRGB fallback이 실제 sRGB gamut 내부
- main/secondary text가 각 목표 대비 충족
- primary button text가 default/hover/active 모두에서 4.5:1 이상
- focus ring이 page background에서 내부 3:1 목표 충족
- hover/active가 default와 같은 방향으로 이동
- harmony mapping이 입력 hue를 임의로 변경하지 않음
- gamut mapping 전후 hue와 lightness가 허용 범위 안에서 보존됨

## Wide-gamut follow-up

OKLCH Picker에서 확인한 구조를 따라 token의 생성 후보와 export를 분리한다.

```text
candidate.oklch
output.srgb
output.p3? 
diagnostic.gamut
```

P3는 progressive enhancement이며, 현재의 hex 기반 sRGB fallback을 대체하지
않는다.

현재 각 token은 `artifacts`에 `candidate.oklch`, `output.srgb`,
`diagnostic.gamut`을 함께 보존한다. 따라서 화면용 hex만 보고 계산 의도를
역추적하지 않아도 된다. P3 출력 자체는 후속 범위다.
