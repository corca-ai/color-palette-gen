# 공개 로드맵 및 결과물 아이디어

> 상태: 확정 일정이나 약속이 아닌 공개 아이디어 모음
>
> 이 문서는 향후 확장 가능한 결과물 아이디어를 보존한다. 현재 구현 범위는
> [빠른 프로토타입 플랜](prototype-plan.md)을 따른다. 프로젝트의 공식 입출력은
> 변경하지 않으며, 이 문서의 HTML, CSS, JSON, debug 파일은 모두 고정 출력에서
> 파생되는 보조 산출물이다.

## 결론

장기적으로는 브라우저에서 바로 열 수 있는 **self-contained HTML 리포트**가 대표 시각화 결과물로 적합하다.

이 리포트는 단순한 palette preview가 아니라 다음 내용을 한곳에서 보여주는 생성 결과의 설명서이자 디버거다.

1. 사용자가 제공한 입력
2. 입력을 해석한 결과
3. 색상이 단계별로 변환된 과정
4. 최종 semantic color token
5. token을 적용한 UI 샘플
6. 접근성 및 gamut 검사 결과
7. CSS와 JSON 등 재사용 가능한 원본 데이터

```text
input
  → normalized intent
  → candidate colors
  → constraint solving
  → semantic tokens
  → component preview
```

이 구조라면 실제 제품에서 결과를 어떻게 소비할지 결정하지 않은 상태에서도 생성 품질을 충분히 관찰하고 비교할 수 있다.

## 장기 결과물 번들 아이디어

하나의 생성 요청마다 다음과 같은 디렉터리를 만든다.

```text
output/
└── <palette-id>/
    ├── index.html
    ├── palette.css
    ├── palette.json
    ├── palette.txt
    └── debug.json
```

### `index.html`

대표 산출물이다. 외부 개발 환경 없이 파일을 열어 결과를 확인할 수 있어야 한다.

- 팔레트 시각화
- semantic token 목록
- UI component preview
- light/dark 또는 normal/high-contrast 전환
- 생성 과정과 diagnostics
- CSS/JSON/text 결과 복사

가능하면 CSS와 데이터를 HTML 내부에도 포함해 `index.html` 하나만 전달해도 동작하게 한다. 별도 파일은 사람이 읽거나 다른 프로그램에서 사용하기 위한 export다.

### `palette.css`

최종 색상값을 semantic custom property로 제공한다.

```css
:root {
  --color-surface-canvas: #f8f8fb;
  --color-surface-raised: #ffffff;
  --color-text-primary: #191927;
  --color-text-secondary: #5f6072;

  --color-button-primary-bg: #635bff;
  --color-button-primary-bg-hover: #554de8;
  --color-button-primary-bg-active: #4841cf;
  --color-button-primary-fg: #ffffff;
  --color-focus-ring: #817aff;
}
```

CSS에서 primary color로부터 모든 값을 런타임 계산하는 버전도 실험할 수 있다.

```css
:root {
  --brand-primary-l: 0.62;
  --brand-primary-c: 0.22;
  --brand-primary-h: 285;

  --color-button-primary-bg:
    oklch(
      var(--brand-primary-l)
      var(--brand-primary-c)
      var(--brand-primary-h)
    );

  --color-button-primary-bg-hover:
    oklch(
      calc(var(--brand-primary-l) - 0.06)
      var(--brand-primary-c)
      var(--brand-primary-h)
    );
}
```

다만 CSS 계산식만 제공하면 실제 계산 결과와 gamut mapping, 접근성 보장이 브라우저 기능에 암묵적으로 의존한다. 초기 버전에서는 다음 두 계층을 함께 제공하는 편이 좋다.

- **resolved tokens**: 생성기가 계산과 검증을 끝낸 실제 값
- **recipe variables**: 어떤 관계로 값이 만들어졌는지 보여주는 계산 파라미터

### `palette.json`

공식 출력 `list[(color, function)]`을 JSON으로 직렬화한 파일이다. 이 파일이 새로운 출력 계약을 정의하지 않는다.

```json
[
  ["#F8F8FB", "background"],
  ["#191927", "main text"],
  ["#635BFF", "primary button default"]
]
```

HTML, CSS, text 결과는 이 파일에서 파생할 수 있다.

### `palette.txt`

도구에 종속되지 않는 간단한 텍스트 결과다.

```text
surface.canvas                 #F8F8FB
surface.raised                 #FFFFFF
text.primary                   #191927
text.secondary                 #5F6072
button.primary.background      #635BFF
button.primary.backgroundHover #554DE8
button.primary.foreground      #FFFFFF
```

hexcode만 나열하지 않고 반드시 semantic role과 함께 기록한다.

### `debug.json`

생성 과정의 machine-readable trace다. 공식 출력과 분리된 보조 산출물이며, 결과가 이상할 때 중간 계산을 재현하거나 비교하는 용도로 사용한다.

## HTML 리포트의 화면 구성

### 1. Overview

첫 화면에서 결과의 성격을 빠르게 파악한다.

- palette 이름 또는 ID
- 입력 primary/secondary/tertiary color
- 입력 vibe
- 최종 대표 색상
- 전체 검증 상태
- mode 전환

### 2. Color families

각 입력 및 파생 hue를 lightness/chroma 단계로 펼쳐 보여준다.

```text
Primary
50  100  200  300  400  500  600  700  800  900
■    ■    ■    ■    ■    ■    ■    ■    ■    ■
```

각 swatch에는 다음 정보를 표시한다.

- hex
- OKLCH
- gamut
- 원본 또는 파생 여부
- 원본 색과의 색차

### 3. Semantic tokens

색상 계열과 실제 역할을 분리해서 보여준다.

| Role | Default | Hover | Active | Disabled |
|---|---|---|---|---|
| Primary button background | swatch | swatch | swatch | swatch |
| Primary button foreground | swatch | swatch | swatch | swatch |
| Border | swatch | swatch | swatch | swatch |

token을 클릭하면 해당 색의 생성 과정과 사용된 모든 preview 위치를 강조한다.

### 4. Component playground

완성도 높은 몇 개의 fixture에 token을 실제 적용한다.

- typography hierarchy
- filled/outline/ghost button
- input, checkbox, focus ring
- card와 tinted section
- badge
- alert: error/warning/info/success

현재 목표는 범용 component library가 아니라 색상 관계를 관찰하는 것이므로 컴포넌트 종류를 과도하게 늘리지 않는다.

상태는 hover를 직접 유발하지 않아도 나란히 비교할 수 있어야 한다.

```text
Button: [Default] [Hover] [Active] [Disabled] [Focus]
```

### 5. Pairing matrix

foreground와 background 조합을 행렬로 보여준다.

| Foreground ↓ / Background → | Canvas | Raised | Primary | Error |
|---|---:|---:|---:|---:|
| Text primary | 16.1 AAA | 17.2 AAA | 2.3 Fail | 4.8 AA |
| Text secondary | 5.2 AA | 5.5 AA | 1.4 Fail | 2.1 Fail |
| Button foreground | 1.1 Fail | 1.0 Fail | 5.1 AA | 5.7 AA |

실제로 사용하도록 지정된 조합은 강조하고, 사용하지 않는 조합은 참고 정보로 표시한다. 모든 색의 모든 조합이 통과해야 한다는 잘못된 인상을 피할 수 있다.

### 6. Generation trace

디버깅 과정을 결과물의 일부로 시각화한다.

```text
Input #635BFF
  ├─ parsed: sRGB(99, 91, 255)
  ├─ converted: OKLCH(0.568, 0.208, 281.1)
  ├─ intent: preserve hue, energetic chroma
  ├─ target role: button.primary.background.default
  ├─ initial candidate: OKLCH(0.568, 0.208, 281.1)
  ├─ foreground test: white 5.21:1, black 4.03:1
  ├─ selected foreground: white
  ├─ gamut: sRGB
  └─ final: #635BFF
```

각 단계는 접고 펼칠 수 있게 하며, 값이 실제로 바뀐 단계만 기본적으로 강조한다.

### 7. Export

- CSS 복사
- JSON 복사
- text/hex 복사
- 전체 HTML 저장

초기에는 다운로드 기능보다 화면 안의 코드 블록과 복사 버튼만으로도 충분하다.

## Debug trace 설계

### 이벤트 기반 기록

색상 하나마다 최종 상태만 저장하지 않고 변환 이벤트를 순서대로 기록한다.

```typescript
interface TraceEvent {
  stage:
    | "parse"
    | "normalize"
    | "derive"
    | "apply-vibe"
    | "solve-contrast"
    | "map-gamut"
    | "assign-role"
    | "validate"
  input?: unknown
  output?: unknown
  reason: string
  constraints?: string[]
  warnings?: string[]
}
```

### 색상 lineage

모든 최종 token이 어디서 나왔는지 추적할 수 있어야 한다.

```text
user.primary
  → primary.500
    → button.primary.background.default
      → button.primary.background.hover
      → button.primary.background.active
```

각 token에 다음 필드를 둔다.

```typescript
interface TokenProvenance {
  source: "user-input" | "derived" | "semantic-default"
  parentToken?: string
  transformations: string[]
}
```

### Diagnostics

diagnostic은 단순한 성공/실패보다 다음 수준으로 나눈다.

- `info`: 자동 파생 또는 정상적인 조정
- `warning`: 의도 일부를 완화했거나 gamut mapping이 큼
- `error`: hard constraint를 만족하는 결과를 찾지 못함

예:

```text
warning VIBE_CONSTRAINT_RELAXED
"soft"의 낮은 대비 선호보다 본문 WCAG AA 조건을 우선했습니다.

info GAMUT_MAPPED
Display P3 후보를 sRGB 출력에 맞게 chroma 0.214 → 0.187로 조정했습니다.
```

## 추가로 유용한 시각화

### Before / After

사용자 입력색과 최종 역할색을 나란히 보여준다. 생성기가 브랜드 색을 얼마나 변경했는지 빠르게 이해할 수 있다.

### L/C/H profile

token들을 hue가 아니라 lightness와 chroma 축으로도 정렬한다. 텍스트 위계와 상태 변화가 일관적인지 확인하기 쉽다.

### Color-blindness preview

후속 단계에서 색각 이상 시뮬레이션을 제공할 수 있다. 다만 시뮬레이션은 접근성 판정 그 자체가 아니므로 참고용이라고 명시한다.

### Diff view

알고리즘 또는 vibe 파라미터를 수정했을 때 두 결과를 비교한다.

- 바뀐 token
- OKLCH 변화량
- contrast 변화
- 새로 생기거나 사라진 diagnostic
- component preview before/after

이 기능은 생성기 개발 과정에서 특히 가치가 크다.

## 장기 구현 범위 아이디어

향후 리포트를 확장할 때 다음 요소를 점진적으로 추가할 수 있다.

1. 다양한 component fixture
2. contrast pairing matrix
3. token별 generation trace
4. 여러 export 포맷
5. mode 전환
6. 결과 간 diff view

skill 포맷이나 실제 CSS package 배포 구조는 사용처가 확정된 뒤 선택한다.

## 결과 품질 판단 기준

현재 스코프에서는 다음 질문에 답할 수 있으면 성공이다.

- 결과가 입력 색상과 vibe를 시각적으로 반영하는가?
- 텍스트와 버튼이 실제 UI처럼 보이는가?
- 상태별 색이 구분되면서 한 계열처럼 느껴지는가?
- 접근성 제약을 어디서 어떻게 만족했는지 확인할 수 있는가?
- 예상과 다른 색이 나왔을 때 그 이유를 trace에서 찾을 수 있는가?
- 생성 규칙을 바꾼 뒤 전후 결과를 비교할 수 있는가?
