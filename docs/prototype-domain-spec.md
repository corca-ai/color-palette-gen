# 프로토타입 도메인 명세

## 목적

이 문서는 빠른 프로토타입에서 사용하는 `vibe`, 출력 `function`, 샘플 페이지 시나리오를 고정한다.

공식 입출력 형식은 변경하지 않는다.

```typescript
interface PaletteInput {
  primary: string
  secondary?: string
  additionalColors?: string[]
  vibe?: string
}

type PaletteOutput = Array<[color: string, function: string]>
```

## 1. Vibe

### 정의

`vibe`는 결과 팔레트가 전달해야 하는 **시각적 인상에 대한 선택적 힌트**다.

접근성 기준이나 semantic role을 대체하지 않는다. 같은 입력색이라도 색의 강도, 배경 tint, 상태 변화 폭, 보조색 사용량을 조정하는 데만 사용한다.

```text
accessibility and role constraints
> explicit input colors
> vibe
> defaults
```

따라서 `soft`가 낮은 대비처럼 해석되더라도 텍스트 가독성 기준을 낮추지는 않는다.

### 입력 형식

프로토타입에서는 vibe 하나만 받는다.

```json
{
  "vibe": "calm"
}
```

- 대소문자와 앞뒤 공백은 무시한다.
- 아래 canonical value만 지원한다.
- 자연어 문장, 복수 vibe, 임의의 유사어는 해석하지 않는다.
- 지원하지 않는 값은 오류로 중단하지 않고 기본값 `balanced`로 처리하며 Debug 탭에 경고한다.

### 허용 값

```typescript
type PrototypeVibe =
  | "balanced"
  | "calm"
  | "soft"
  | "energetic"
  | "high contrast"
```

`vibe`가 생략되면 `balanced`를 사용한다. `balanced`는 사용자가 실제로 입력할 수도 있다.

### 해석 축

프로토타입에서는 vibe를 다음 네 파라미터로 변환한다.

```typescript
interface VibeParameters {
  harmony: string
  hueOffsets: [number, number]
  chromaScale: number
  derivedChromaScale: number
  surfaceTint: number
  stateLightnessStep: number
  borderEmphasis: number
}
```

- `harmony`: supporting hue를 고르는 색상 관계
- `hueOffsets`: primary hue로부터 secondary/additional hue까지의 각도
- `chromaScale`: 입력색의 chroma를 얼마나 유지하거나 강조할지
- `derivedChromaScale`: 자동 파생 hue의 chroma 강도
- `surfaceTint`: background와 surface에 브랜드 hue를 얼마나 섞을지
- `stateLightnessStep`: button default에서 hover, active로 이동할 때의 명도 간격
- `borderEmphasis`: border와 주변 surface 사이의 명도 차이

### 초기 규칙

수치는 첫 구현을 위한 가설이며, 샘플 페이지를 비교하면서 조정한다.

| Vibe | Harmony | Hue offsets | Chroma | Derived chroma | Surface tint | State L step | 의도 |
|---|---|---|---:|---:|---:|---:|---|
| `balanced` | split complementary | +150°, +210° | 1.00 | 0.82 | 0.02 | 0.05 | 반대편 hue의 긴장을 완화해 균형 있게 분산 |
| `calm` | analogous | -24°, +24° | 0.78 | 0.68 | 0.03 | 0.035 | 가까운 hue와 낮은 chroma로 긴장을 억제 |
| `soft` | soft analogous | +18°, +42° | 0.72 | 0.56 | 0.08 | 0.025 | 가까운 한 방향 hue와 tinted surface 사용 |
| `energetic` | split complementary | +150°, +210° | 1.12 | 1.08 | 0.02 | 0.07 | 멀리 떨어진 hue와 높은 chroma로 역동성 강화 |
| `high contrast` | complementary | +180°, +165° | 1.00 | 1.00 | 0.00 | 0.08 | 정반대 hue와 강한 명도·경계 차이 사용 |

모든 계산 후에는 sRGB gamut에 맞게 chroma를 줄일 수 있다.

### Harmony 후보 비교

Vibe는 하나의 harmony 결과만 강제하지 않는다. 각 vibe는 동일한 role과 sample에
즉시 적용해 비교할 수 있는 세 후보를 제공한다.

| Vibe | 기본 후보 | 대안 1 | 대안 2 |
|---|---|---|---|
| `balanced` | split complementary | analogous | triadic |
| `calm` | analogous | monochromatic | wide analogous |
| `soft` | soft analogous | monochromatic | wide analogous |
| `energetic` | split complementary | triadic | complementary |
| `high contrast` | complementary | split complementary | triadic |

기본 후보는 현재의 가설이지 심미적으로 가장 우수하다고 검증된 결과가 아니다.
후보 탭은 같은 입력과 sample fixture에서 차이를 빠르게 비교하고 이후 사용자
선택 데이터를 수집하기 위한 장치다.

사용자가 secondary 또는 additional을 지정하면 해당 hue는 모든 후보에서
고정된다. primary만 주어진 경우에는 두 supporting hue를 harmony template의
offset으로 파생한다. primary와 secondary가 주어지고 additional만 비어 있다면,
additional은 primary의 고정 offset이 아니라 두 입력색이 만든 관계를 완성하도록
파생한다.

### 추가 색상과의 관계

- primary는 primary button과 focus ring의 기준이다.
- secondary가 있으면 자동 harmony보다 우선하여 secondary family의 anchor가 된다.
- additional color가 있으면 자동 harmony보다 우선하여 decorative family의 anchor가 된다.
- secondary와 additional이 모두 없으면 vibe의 `hueOffsets`에 따라 primary에서
  두 supporting hue를 파생한다.
- secondary가 있고 additional이 없으면 선택한 harmony별 pair completion 규칙을
  적용한다.
  - analogous: secondary를 primary hue 반대편으로 반사
  - split complementary: secondary와 가까운 split arm을 찾고 반대쪽의 설정된
    arm으로 관계 완성
  - triadic: secondary와 가까운 arm의 반대쪽 ±120° arm 선택
  - complementary: 새로운 hue를 만들지 않고 secondary hue의 L/C 변형 사용
  - monochromatic: primary hue를 유지하고 L/C로 역할 구분
- 사용자 secondary가 선택한 harmony의 이상적인 위치와 다르더라도 입력값을
  이동시키지 않는다. additional 생성 근거와 관계 오차를 diagnostics에서 밝힌다.
- primary 역할은 hue를 유지하고, supporting family에만 harmony rotation을 적용한다.
- 파생 hue의 lightness와 chroma는 gamut 및 역할별 대비 조건에 맞춰 추가 조정한다.

### Debug 표시

Debug 탭에는 최소한 다음 내용을 표시한다.

```text
raw vibe: "soft"
normalized vibe: "soft"
parameters:
  chromaScale: 0.72
  surfaceTint: 0.08
  stateLightnessStep: 0.025
  borderEmphasis: 0.04
```

지원하지 않는 입력 예:

```text
raw vibe: "luxurious"
normalized vibe: "balanced"
warning: UNSUPPORTED_VIBE
```

## 2. Function

### 정의

`function`은 색상의 이름이나 생성 방법이 아니라 **샘플 UI에서 색이 담당하는 semantic role과 state**다.

프로토타입에서는 자유 문자열을 만들지 않고 아래 고정 값을 사용한다. 출력 형식은 여전히 `[color, function]` tuple 목록이다.

### 허용 값

```typescript
type PrototypeColorFunction =
  | "background"
  | "surface"
  | "main text"
  | "secondary text"
  | "border"
  | "primary button default"
  | "primary button hover"
  | "primary button active"
  | "primary button text"
  | "focus ring"
  | "secondary accent"
  | "secondary accent soft"
  | "secondary accent text"
  | "decorative accent"
  | "decorative accent soft"
  | "decorative accent text"
```

마지막 여섯 값은 사용자 입력 또는 vibe harmony로 만든 supporting color family다.

### 필수 여부와 적용 위치

| Function | 필수 | CSS 적용 | 샘플 용도 |
|---|---|---|---|
| `background` | 예 | `body { background }` | 페이지 전체 배경 |
| `surface` | 예 | card, input, panel의 `background` | 배경 위에 놓인 영역 |
| `main text` | 예 | heading, body의 `color` | 핵심 텍스트 |
| `secondary text` | 예 | caption, metadata의 `color` | 보조 정보 |
| `border` | 예 | card, input, divider의 `border-color` | 영역과 컨트롤 경계 |
| `primary button default` | 예 | primary button `background` | 기본 상태 |
| `primary button hover` | 예 | primary button `:hover` | hover 및 상태 비교 |
| `primary button active` | 예 | primary button `:active` | active 및 상태 비교 |
| `primary button text` | 예 | primary button `color` | 세 버튼 배경 위의 텍스트 |
| `focus ring` | 예 | `:focus-visible` outline/box-shadow | 키보드 focus 표시 |
| `secondary accent` | 예 | link, indicator | secondary family의 anchor |
| `secondary accent soft` | 예 | supporting card와 action background | secondary의 낮은 chroma surface |
| `secondary accent text` | 예 | supporting card와 action text | soft surface에서 대비 보정 |
| `decorative accent` | 예 | badge, indicator | decorative family의 anchor |
| `decorative accent soft` | 예 | highlight와 callout background | additional의 낮은 chroma surface |
| `decorative accent text` | 예 | highlight와 callout text | soft surface에서 대비 보정 |

### 적용 규칙

- 하나의 function은 한 결과 안에서 하나의 color만 갖는다.
- 샘플 HTML은 색상값을 직접 쓰지 않고 function을 CSS custom property에 매핑한다.
- 상태 token은 실제 pseudo-class와 나란히 놓인 상태 비교 샘플 양쪽에 사용한다.
- `primary button text`는 default, hover, active 세 배경 모두에서 내부 대비 기준을 만족해야 한다.
- `secondary accent`와 `decorative accent`는 텍스트 전달의 유일한 수단으로 사용하지 않는다.

### CSS 매핑

공식 출력 tuple을 렌더러가 다음 내부 변수로 변환한다.

```css
:root {
  --color-background: /* function: background */;
  --color-surface: /* function: surface */;
  --color-main-text: /* function: main text */;
  --color-secondary-text: /* function: secondary text */;
  --color-border: /* function: border */;
  --color-primary-button: /* function: primary button default */;
  --color-primary-button-hover: /* function: primary button hover */;
  --color-primary-button-active: /* function: primary button active */;
  --color-primary-button-text: /* function: primary button text */;
  --color-focus-ring: /* function: focus ring */;
}
```

이 CSS 변수는 시각화를 위한 파생 표현이며 공식 출력 형식을 바꾸지 않는다.

## 3. 샘플 HTML 페이지

### 목적

샘플은 완성된 웹사이트 템플릿이 아니라 동일한 function이 서로 다른 UI 맥락에서도 자연스럽게 보이는지 확인하는 fixture다.

한 HTML 문서 안에서 탭으로 시나리오를 전환한다. 별도의 페이지나 router는 만들지 않는다.

### 전체 구조

```text
[Palette] [Content] [Form] [States] [Debug]
```

탭은 모두 같은 `PaletteOutput`을 사용한다.

### Palette 탭

생성 결과 자체를 확인한다.

- 입력 primary/secondary/additional color
- raw vibe와 normalized vibe
- function별 swatch와 hex
- 필수 function 누락 여부

각 행을 클릭하면 Debug 탭에서 해당 function의 trace로 이동한다.

### Content 탭

읽기 중심 화면에서 중립색 위계를 검증한다.

- page background
- article 또는 card surface
- heading과 본문
- secondary metadata
- inline link 또는 secondary badge
- primary CTA

주로 다음 관계를 확인한다.

- `background`와 `surface`
- `main text`와 `secondary text`
- primary CTA가 콘텐츠보다 지나치게 강하거나 약하지 않은지

### Form 탭

경계와 focus 상태를 검증한다.

- label
- text input
- select 모양의 control
- helper text
- primary submit button
- focus-visible 상태를 강제로 보여주는 input

주로 다음 관계를 확인한다.

- `surface`, `border`, `main text`
- `secondary text`
- `focus ring`
- primary button foreground/background

실제 form 제출 기능이나 validation은 구현하지 않는다.

### States 탭

interaction state를 한눈에 비교한다.

```text
[Default] [Hover] [Active] [Focus]
```

- pseudo-class가 적용되는 실제 버튼
- default, hover, active 색을 강제로 적용한 비교용 버튼
- 각 상태의 hex와 인접 상태 간 OKLCH 변화량
- button text 대비 결과

Disabled state는 현재 출력 function에 없으므로 샘플에도 넣지 않는다.

### Debug 탭

입력부터 최종 tuple까지의 중간 과정을 확인한다.

- normalized input
- vibe parameter
- function별 trace
- contrast checks
- gamut adjustment
- warning
- 최종 `list[(color, function)]` JSON

기본적으로 function 목록을 보여주고 하나를 선택하면 단계가 펼쳐진다.

### 탭 구현 제약

- client-side JavaScript로 `hidden` 상태만 전환한다.
- URL routing과 페이지별 데이터 fetching을 사용하지 않는다.
- 탭은 키보드로 이동 가능하도록 `role="tablist"`, `role="tab"`, `role="tabpanel"` 구조를 사용한다.
- 샘플 탭 내부에서는 hexcode를 직접 쓰지 않고 function에서 변환한 CSS 변수만 사용한다.

## 4. 명세 밖의 값 처리

### 알 수 없는 vibe

- `balanced`로 fallback
- Debug 경고 생성
- 공식 출력은 정상 생성

### 알 수 없는 function

생성기에서 나오면 프로그래밍 오류로 취급한다.

- Palette 탭에서 경고 표시
- 샘플에는 적용하지 않음
- 테스트 실패

### 선택 색상이 없는 경우

- secondary는 vibe의 첫 번째 hue offset으로 primary에서 파생
- additional은 vibe의 두 번째 hue offset으로 primary에서 파생
- Debug와 Lineage에 `derived` 출처와 적용된 각도를 기록

## 5. 테스트 가능한 불변 조건

- 모든 결과 항목은 정확히 `[color, function]` 형태다.
- 모든 `color`는 `#RRGGBB` 형식이다.
- 모든 `function`은 허용 값 중 하나다.
- 필수 function은 정확히 한 번씩 존재한다.
- 사용자 지정 supporting color는 harmony로 파생한 색보다 우선한다.
- 모든 탭은 동일한 output 목록에서 파생한 CSS 변수를 사용한다.
- main/secondary text는 background에서 내부 대비 기준을 만족한다.
- primary button text는 세 button state 모두에서 내부 대비 기준을 만족한다.
- 지원하지 않는 vibe는 결과 생성 실패가 아니라 debug warning을 만든다.
