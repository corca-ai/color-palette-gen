# 참고 자료 조사 및 프로젝트 적용 인사이트

조사일: 2026-07-31

## 요약

이 프로젝트는 단순한 색상 조합기가 아니라 **사용자의 디자인 의도를 semantic color token으로 컴파일하는 도구**로 정의하는 것이 적합하다.

```text
list[(color, function)] = f(primary color, optional additional colors, optional vibe)
```

- 입력 색상은 결과에 그대로 복사해야 하는 값이 아니라 브랜드 정체성을 나타내는 **제약 또는 힌트**다.
- `vibe`는 자유 텍스트로만 소비하지 않고 lightness, chroma, hue distance, contrast 같은 계산 가능한 파라미터로 정규화한다.
- 출력의 `function`은 `surface`, `text.primary`, `button.primary.hover`처럼 역할과 상태를 표현할 수 있다.
- 접근성은 생성 후 검사하는 부가 단계가 아니라 생성 알고리즘의 제약 조건이어야 한다.
- 접근성 기준과 색역 같은 설정은 사용자 입력을 늘리지 않고 내부 기본값으로 처리한다.

## 1. Itten

자료:

- [Itten 데모](https://corca-ai.github.io/itten/)
- [Itten GitHub 저장소](https://github.com/corca-ai/itten)
- 조사한 리비전: `0bb80444fbb0f24a841f13033c987319e1679818` (2026-07-22)

### 구현에서 확인한 접근법

Itten은 하나의 primary hue에서 다음 네 모드를 자동 생성하는 실험적 색상 시스템이다.

- light / normal contrast
- light / high contrast
- dark / normal contrast
- dark / high contrast

주요 구현 방식은 다음과 같다.

1. **OKLCH를 생성용 색공간으로 사용한다.**
   - 지각적 밝기 `L`, 색의 강도 `C`, 색상 `H`를 비교적 독립적으로 다룬다.
   - 색이 sRGB, Display P3 또는 gamut 밖에 있는지도 기록한다.
2. **명도와 대비를 계산으로 결정한다.**
   - surface를 먼저 정한 뒤 WCAG 목표 대비를 만족하는 text lightness를 이진 탐색한다.
   - `textMuted`, `text`, `textStrong`에 서로 다른 대비 목표를 부여해 위계를 만든다.
3. **색상값보다 역할 중심 token을 생성한다.**
   - `surface`, `textMuted`, `text`, `textStrong`
   - `accentBg`, `accentFg`
   - `error`, `warning`, `info`, `success` 각각의 background/foreground/text
4. **semantic color의 의미를 브랜드 색과 분리한다.**
   - error, warning, info, success는 primary hue와 무관한 고정 hue와 허용 명도 범위를 사용한다.
   - 예를 들어 warning yellow는 너무 어두워져 갈색처럼 보이지 않도록 별도의 범위를 둔다.
5. **색역 내 최대 chroma를 탐색한다.**
   - accent는 해당 lightness와 hue에서 P3로 표현 가능한 최대 chroma를 찾은 뒤 모드별 비율을 적용한다.
6. **자동 테스트로 불변 조건을 확인한다.**
   - 텍스트 대비, 텍스트 위계, semantic foreground 대비, 색역 여부 등을 여러 hue에서 검사한다.

### 현재 프로젝트에 가져올 점

- 내부 계산은 OKLCH로 통일하고, 공식 출력의 `color`는 hex로 표현한다.
- 생성 순서는 `surface 결정 → 역할별 대비 목표 결정 → L 탐색 → C/gamut 조정 → 검증`으로 구성한다.
- primary/secondary/tertiary는 브랜드 계열에 사용하고 error/warning/success/info는 별도 semantic 계열로 관리한다.
- `contrastRatio`, `gamut` 같은 근거는 공식 출력에 추가하지 않고 별도 debug trace에 기록한다.
- 알고리즘 테스트를 특정 예시 몇 개가 아니라 hue와 mode의 조합을 순회하는 property 중심 테스트로 작성한다.

### 그대로 복제하지 않을 점

- Itten은 primary **색상 전체가 아니라 hue 하나**만 입력받는다. 이 프로젝트는 사용자가 지정한 원색의 lightness/chroma도 브랜드 의도로 보존해야 한다.
- secondary와 tertiary를 각각 180°, ±120°로 고정 파생한다. 사용자가 추가 색상을 주면 그 값을 우선하고, 자동 파생은 누락된 경우의 전략 중 하나로만 사용해야 한다.
- 버튼의 hover/active/disabled/focus 같은 interaction state token은 제공하지 않는다. 이 프로젝트에서는 필수 출력 영역이다.
- Itten이 실험적 프로젝트임을 명시한 점을 고려해, 아이디어와 테스트 전략을
  참고하되 이 프로젝트의 입력 계약과 자동 검증 기준에 맞춰 독립적으로
  재검증한다.
- P3 최대 chroma만 생성하면 sRGB 화면에서 fallback이 필요하다. 최소 공통 출력은 sRGB gamut에 맞추고 P3를 progressive enhancement로 제공하는 정책을 검토한다.

## 1.1 OKLCH Picker

자료:

- [Evil Martians OKLCH Picker](https://oklch.com/)
- [GitHub 저장소](https://github.com/evilmartians/oklch-picker)

Itten을 만들 때 참고한 기반 프로젝트로 공유받았다. 이 프로젝트에서 가져올
핵심은 picker UI보다 **색상값과 출력 색역을 분리해서 취급하는 방식**이다.

### 구현에서 확인한 접근법

1. 내부 색상을 OKLCH canonical value로 유지한다.
   - 변환 과정에서 불필요한 반올림을 피하기 위해 높은 정밀도를 사용한다.
   - 화면 표시용 문자열의 정밀도와 내부 계산 정밀도를 구분한다.
2. 색이 속한 색역을 단계적으로 분류한다.
   - sRGB
   - Display P3
   - Rec. 2020
   - 지원 색역 밖
3. 출력 포맷의 성격을 구분한다.
   - hex/rgb처럼 sRGB에 묶인 출력은 gamut mapping 후 내보낸다.
   - OKLCH/P3 같은 wide-gamut 출력은 가능한 경우 원래 값을 보존한다.
4. 단순 RGB channel clipping과 perceptual gamut mapping을 구분한다.
   - 저장 또는 export에는 CSS Color 4 계열의 chroma reduction을 사용한다.
   - 브라우저 fallback을 설명할 때만 naive channel clipping 결과를 별도로
     다룬다.
5. 색역 판정에는 부동소수점 및 round-trip 오차를 고려한 명시적 tolerance를
   둔다.
6. 변환, parsing, gamut 판정, export를 UI model과 분리하고 단위 테스트한다.

### 현재 프로젝트에 가져올 점

- palette engine은 DOM과 분리된 순수 함수 모듈이어야 한다.
- token마다 다음 두 값을 구분해 보존한다.
  - `candidate`: 의도에 따라 생성된 원본 OKLCH
  - `output.srgb`: 최소 공통 출력에 맞게 mapping된 값
- gamut diagnostic은 단순한 `adjusted: true`가 아니라 다음을 기록한다.
  - 원래 color space
  - mapping 전후 OKLCH
  - chroma 감소량과 비율
  - hue/lightness 보존 여부
- 현재 직접 구현한 sRGB chroma binary search는 테스트 기준점으로 유지하되,
  CSS Color 4에 맞는 검증된 color library 도입을 검토한다.
- 테스트는 최소한 parsing/round-trip, gamut classification, mapping 후 sRGB
  포함 여부, mapping 전후 hue 안정성을 포함한다.

### 그대로 복제하지 않을 점

- 이 프로젝트는 범용 color picker가 아니므로 자유 형식 parsing, URL state,
  WebGL/3D gamut visualization은 우선 범위가 아니다.
- Rec. 2020 export는 현재 프로토타입의 필수 결과물이 아니다.
- wide-gamut 지원을 위해 기본 hex 출력 형식을 제거하지 않는다. hex는 계속
  sRGB fallback으로 제공한다.

## 2. 선언적 디자인과 디자인 런타임

자료:

- [선언적 디자인과 디자인 런타임](https://wiki.g15e.com/pages/Declarative%20design%20and%20design%20runtime)
- [Markdown 원문](https://wiki.g15e.com/pages/Declarative%20design%20and%20design%20runtime.txt)

### 핵심 관점

디지털 디자인은 다크 모드, 고대비, 기기, 사용자 선호처럼 서로 곱해지는 조건 때문에 조합적 폭발을 일으킨다. 완성된 픽셀 값을 모든 경우에 직접 지정하는 방식 대신, 디자인 의도를 선언하고 런타임이 사용자와 맥락에 맞는 결과를 계산해야 한다.

원문의 표현을 이 프로젝트에 맞추면 다음과 같다.

```text
color system = f(design intent, user preference, context)
```

### 현재 프로젝트에 가져올 점

고정된 사용자 입력을 디자인 의도로 해석한다.

```json
{
  "primary": "#635BFF",
  "secondary": "#00D4A0",
  "vibe": "calm soft"
}
```

- 색상 입력은 브랜드 정체성에 대한 의도다.
- `vibe`는 원하는 지각적 성격에 대한 의도다.
- appearance, contrast, gamut 같은 맥락과 제약은 현재 사용자 입력이 아니다. 프로토타입 내부의 고정 정책으로 둔다.

### 정적 검사기 개념의 적용

생성기는 결과만 반환하지 말고 의도 간 충돌도 보고해야 한다.

- “soft”를 요청했지만 작은 본문 텍스트에 “high contrast”도 요구한 경우: 대비는 지키되 chroma나 주변 surface 차이를 줄이는 방식으로 해석
- 입력 브랜드 색을 버튼 배경으로 썼을 때 흰색과 검은색 어느 쪽도 목표 대비를 만족하지 못하는 경우: 명도 조정 또는 대체 token 생성
- 서로 다른 역할에 할당된 색이 지각적으로 너무 비슷한 경우: 구분 가능성 경고
- 요청 색이 target gamut 밖인 경우: gamut mapping 결과와 변화량 보고

단, 원문도 simultaneous contrast와 color size effect처럼 알고리즘만으로 완전히 통제하기 어려운 지각 현상을 지적한다. 따라서 결과에 preview와 사용자 override 경로를 남겨야 한다.

## 3. Stripe의 accessible color system

자료:

- [Designing accessible color systems](https://stripe.com/blog/accessible-color-systems)

### 핵심 관점

Stripe는 색을 손으로 고른 뒤 매번 대비를 검사하거나, base color를 단순히 밝고 어둡게 만드는 방식의 한계를 지적한다. 전자는 시행착오가 크고 후자는 색이 탁해지거나 hue별 시각적 무게가 달라질 수 있다.

Stripe가 제시한 색상 시스템의 목표는 다음 세 가지다.

1. 예측 가능한 접근성
2. 분명하고 생생하게 구분되는 hue
3. 같은 단계에서 일관된 시각적 무게

이를 위해 CIELAB 같은 지각적으로 균일한 색공간에서 lightness curve를 맞추고, 실제 UI 컴포넌트에서 반복 검증했다. 또한 색공간에는 표현 불가능한 조합이 있으므로 gamut을 시각화하고 가능한 범위 안에서 조정해야 한다고 설명한다.

### 현재 프로젝트에 가져올 점

- 생성용 색공간은 RGB/HSL보다 OKLCH 같은 지각 기반 공간을 사용한다.
- 동일한 `level`은 hue가 달라도 비슷한 지각적 밝기와 시각적 무게를 갖게 한다.
- WCAG 대비 통과와 hue 간 구분 가능성을 별도 목표로 본다. 대비 통과가 곧 좋은 팔레트를 뜻하지 않는다.
- 접근 가능한 색 조합의 관계를 token 규칙에 내장한다. 사용자가 매 조합을 직접 계산하게 하지 않는다.
- 실제 component fixture에서 검증한다.
  - 본문과 보조 텍스트
  - filled/outline button
  - hover/active/disabled/focus-visible
  - badge와 tinted surface
  - error/warning/info/success
- 생성할 수 없는 `L/C/H` 조합은 조용히 clip하지 않고 gamut mapping 여부와 변화량을 결과 metadata에 기록한다.

Stripe 글은 2019년의 WCAG 2.0 대비 모델을 다룬다. 첫 구현의 안정적인 기준으로 WCAG 2.x 대비를 사용할 수 있지만, 현재 표준 선택은 구현 시점에 W3C 원문을 다시 확인하고 버전이 명시된 정책으로 관리해야 한다.

## 4. 제안하는 도메인 모델

아래 모델은 프로젝트의 고정 입출력 계약을 구체화한 것이다. debug 정보와 시각화 데이터는 이 계약에 포함하지 않는다.

### 입력

```typescript
interface PaletteInput {
  primary: string
  secondary?: string
  additionalColors?: string[]
  vibe?: string
}
```

### 출력

출력은 처음 정의한 `list[(color, function)]`을 유지한다.

```typescript
type ColorAssignment = [
  color: string,
  function: string
]

type PaletteOutput = ColorAssignment[]

// 예시
const output: PaletteOutput = [
  ["#F8F8FB", "background"],
  ["#191927", "main text"],
  ["#635BFF", "primary button default"],
  ["#554DE8", "primary button hover"]
]
```

중간 계산은 별도 내부 자료형으로 기록할 수 있지만 공식 출력에는 섞지 않는다.

```typescript
interface DebugRecord {
  function: string
  sourceColor: string
  steps: unknown[]
}
```

권장 최소 role 집합:

```text
surface.canvas
surface.subtle
surface.raised
text.primary
text.secondary
text.disabled
border.default
border.strong
button.primary.background.{default,hover,active,disabled}
button.primary.foreground.{default,disabled}
button.secondary.background.{default,hover,active,disabled}
button.secondary.foreground.{default,disabled}
focus.ring
status.error.{background,foreground,text}
status.warning.{background,foreground,text}
status.info.{background,foreground,text}
status.success.{background,foreground,text}
```

## 5. Vibe를 계산 가능한 제약으로 변환하기

자유 형식 vibe는 그대로 색 생성 공식에 넣기보다 중간 표현으로 변환한다. 아래 값은 구현 전 사용자 연구와 실험으로 보정해야 하는 초기 가설이다.

| Vibe | 주로 조정할 축 | 초기 해석 |
|---|---|---|
| `calm` | C, hue distance, contrast hierarchy | chroma와 보조 hue 간 긴장을 낮추되 텍스트 대비는 유지 |
| `soft` | C, surface delta-L, state delta | tinted surface와 완만한 상태 변화를 사용 |
| `energetic` | C, hue distance, accent count | gamut 안에서 chroma와 보색 긴장을 높임 |
| `high contrast` | foreground/background delta-L | 접근성 모드를 명시적으로 높이고 경계·focus도 강화 |
| `minimal` | palette cardinality, neutral ratio | accent 수를 줄이고 neutral 역할 비중을 높임 |
| `playful` | hue diversity, C variance | 구분 가능한 보조 hue를 늘리되 semantic color와 충돌 방지 |

중요한 우선순위:

```text
internal accessibility policy
> semantic meaning
> explicit user colors
> vibe preferences
> generator defaults
```

상충 시 결과를 임의로 숨기지 말고 어떤 요구가 우선되었는지 diagnostics로 설명한다.

## 6. 권장 생성 파이프라인

1. 입력 색상을 파싱하고 OKLCH로 변환한다.
2. vibe 단어를 정규화된 intent parameter로 변환한다.
3. surface와 neutral scale을 context별로 생성한다.
4. 사용자가 준 브랜드 색을 우선하고, 빠진 계열만 harmony rule로 파생한다.
5. 역할별 대비와 의미 제약을 정의한다.
6. 각 role/state의 L과 C를 탐색하고 gamut mapping한다.
7. 모든 foreground/background 쌍과 state hierarchy를 검증한다.
8. semantic token 목록, 색상 표현, 검증 metadata, 경고를 반환한다.
9. 실제 UI fixture로 시각 회귀 및 수동 검토를 수행한다.

## 7. 구현 우선순위

이 절은 장기적인 확장 순서를 나타낸다. 현재 프로토타입 범위는 [빠른 프로토타입 플랜](prototype-plan.md)을 따른다.

### 장기 1단계: 결정론적 핵심

- 색상 파싱과 OKLCH 변환
- light mode
- neutral surface/text와 primary button 상태
- WCAG 대비 검사
- sRGB gamut mapping
- 고정 출력과 별도 diagnostics 생성

### 장기 2단계: 맥락과 의미

- dark/high-contrast 모드
- secondary/tertiary 입력 및 자동 파생
- error/warning/info/success
- P3 출력
- component preview fixture

### 장기 3단계: Vibe

- 제한된 canonical vibe vocabulary와 동의어 매핑
- 복수 vibe의 가중치 및 충돌 처리
- 생성 결과에 해석 근거 제공
- 사람의 평가를 이용한 파라미터 보정

자연어 vibe 해석에 LLM을 사용하더라도 최종 색 계산과 접근성 검증은 결정론적 엔진이 담당하는 것이 좋다. 같은 입력의 재현성과 테스트 가능성을 보장할 수 있기 때문이다.

## 8. 검증 체크리스트

- 모든 텍스트 token이 실제 사용 surface에서 목표 대비를 만족하는가?
- 버튼의 default/hover/active가 구분되면서 foreground 대비를 유지하는가?
- disabled 상태가 흐리지만 여전히 식별 가능한가?
- focus indicator가 인접 색 모두에서 구분되는가?
- semantic color가 브랜드 hue 변화에도 의미를 유지하는가?
- hue별 같은 scale level이 비슷한 시각적 무게를 가지는가?
- sRGB와 P3 밖의 색이 명시적으로 처리되는가?
- light/dark × normal/high-contrast 모든 조합이 자동 테스트되는가?
- 작은 텍스트, 큰 텍스트, 아이콘, 넓은 면적의 색을 실제 크기로 검토했는가?
- 결과가 실패 또는 조정 이유를 diagnostics로 설명하는가?
