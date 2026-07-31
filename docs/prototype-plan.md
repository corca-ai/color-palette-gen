# 빠른 프로토타입 플랜

## 목표

입력 색상과 선택적 vibe로부터 그럴듯한 `list[(color, function)]`을 만들고, 브라우저에서 결과와 중간 계산을 즉시 확인한다.

현재 목표는 완성된 디자인 시스템이나 배포 패키지가 아니다. 다음 질문에 빠르게 답할 수 있는 작은 실험 도구를 만든다.

- 입력 색상에서 쓸 만한 UI 팔레트를 만들 수 있는가?
- vibe가 결과에 납득 가능한 차이를 만드는가?
- 결과가 이상할 때 어느 계산 단계에서 문제가 생겼는지 찾을 수 있는가?

`vibe`, `function`, 샘플 탭의 정확한 허용 값과 매핑은
[프로토타입 도메인 명세](prototype-domain-spec.md)를 따른다.

## 변경할 수 없는 계약

### 입력

```typescript
interface PaletteInput {
  primary: string
  secondary?: string
  additionalColors?: string[]
  vibe?: string
}
```

- primary color: 필수
- secondary, tertiary 등의 추가 색상: 선택
- vibe: 선택적 문자열

### 출력

```typescript
type PaletteOutput = Array<[color: string, function: string]>
```

예:

```json
[
  ["#F8F8FB", "background"],
  ["#191927", "main text"],
  ["#5F6072", "secondary text"],
  ["#635BFF", "primary button default"],
  ["#554DE8", "primary button hover"],
  ["#4841CF", "primary button active"],
  ["#FFFFFF", "primary button text"]
]
```

시각화와 debug trace는 이 입출력 계약을 바꾸지 않는 별도 내부 결과다.

## 최소 기능

프로토타입은 한 페이지와 작은 생성 함수로 제한한다.

```text
사용자 입력 form
  → generatePalette(input)
    ├─ PaletteOutput
    └─ DebugTrace
  → 같은 페이지에 결과 렌더링
```

### 입력 UI

- primary color picker + hex 입력
- 선택적 secondary color
- 선택적 additional color 1개
- 선택적 vibe 선택
- Generate 버튼

색상을 무제한으로 추가하는 UI, preset 관리, 계정, 저장 기능은 만들지 않는다.

vibe는 초기에는 자유 텍스트가 아니라 허용 값을 선택하는 control로 제공한다. 공식 입력의 `vibe?: string` 형식은 그대로 유지한다.

### 고정 출력 role

초기에는 다음 10개 안팎만 생성한다.

```text
background
surface
main text
secondary text
border
primary button default
primary button hover
primary button active
primary button text
focus ring
```

error/warning/info/success, dark mode, high-contrast mode는 제외한다.

### 결과 화면

한 화면에서 다음 탭을 제공한다.

1. **Palette**: `function`, swatch, hexcode
2. **Content**: 글, card, CTA 중심 샘플
3. **Form**: input, border, focus ring 중심 샘플
4. **States**: 버튼 default/hover/active/focus 비교
5. **Debug**: 단계별 값, 대비, gamut, 변경 이유

CSS/JSON 다운로드, diff view, pairing matrix, 다양한 component fixture는 만들지 않는다.

## 단순한 생성 전략

정교한 최적화보다 예측 가능하고 디버깅하기 쉬운 규칙을 우선한다.

### 1. 입력 파싱

- hex color를 검증한다.
- 내부 계산을 위해 OKLCH로 변환한다.
- secondary/additional color가 없으면 primary에서 파생한다.

### 2. Vibe 해석

`balanced`, `calm`, `soft`, `energetic`, `high contrast`를 고정 파라미터로 변환한다. 정확한 계산 축과 초기 수치는 [프로토타입 도메인 명세](prototype-domain-spec.md)에 정의한다.

지원하지 않는 단어는 `balanced`로 처리하고 Debug 탭에 표시한다. LLM 기반 해석이나 동의어 사전은 사용하지 않는다.

### 3. 역할 생성

- background와 surface는 거의 중립색으로 만든다.
- main/secondary text는 background 대비를 기준으로 명도를 찾는다.
- primary button은 입력 primary를 가능한 한 유지한다.
- 흰색과 검은색 중 버튼 배경 대비가 높은 색을 button text로 선택한다.
- hover와 active는 primary의 hue를 유지하고 lightness를 단계적으로 조정한다.
- focus ring은 primary에서 lightness 또는 chroma를 조정해 주변색과 구분한다.

### 4. 검증

- main text/background 대비
- secondary text/background 대비
- primary button text/default·hover·active 배경 대비
- 모든 결과가 sRGB 안에 있는지 확인

검증 실패 시 복잡한 전역 최적화를 하지 않는다. 명도를 제한된 횟수만큼 조정하고, 그래도 실패하면 결과와 경고를 함께 보여준다.

## Debug trace

공식 출력과 별도로 메모리에서 다음 구조를 사용한다.

```typescript
interface DebugStep {
  function: string
  stage: "input" | "convert" | "vibe" | "derive" | "contrast" | "gamut" | "final"
  before?: string
  after?: string
  message: string
}
```

예:

```text
primary button hover
input     #635BFF
convert   oklch(56.8% 0.208 281.1)
vibe      energetic → chroma 유지
derive    lightness 56.8% → 51.8%
contrast  white text 6.02:1 → pass
gamut     sRGB → pass
final     #554DE8
```

Debug UI는 예쁘게 만드는 것보다 모든 단계가 빠짐없이 보이고 복사 가능한 것을 우선한다.

## 파일 구조 제안

프레임워크 없이 시작할 수 있는 최소 구조다.

```text
src/
├── index.html
├── style.css
├── main.ts
├── color.ts
└── palette.ts
```

- `color.ts`: 변환, 대비, gamut 같은 순수 함수
- `palette.ts`: 고정 입출력 계약과 생성 규칙
- `main.ts`: form 입력, 렌더링, debug 표시

필요한 색상 변환 라이브러리 하나만 사용한다. 상태 관리, component framework, CSS 전처리기는 도입하지 않는다.

## 구현 순서

### 1. 정적 화면

- 입력 form
- 임시 palette 결과
- sample과 debug 영역

### 2. 기본 생성기

- primary만으로 고정 role 생성
- 출력 타입 유지
- debug step 수집

### 3. 검증

- 대비 계산
- sRGB gamut 처리
- 실패 경고 표시

### 4. 선택 입력

- secondary/additional color 반영
- 네 가지 vibe 규칙

### 5. 프로토타입 평가

대표 입력 몇 개를 수동 비교한다.

```text
#635BFF
#635BFF + calm
#635BFF + energetic
#E5484D + soft
#FFD60A + high contrast
```

## 완료 기준

- 입력과 출력 형식이 고정 계약을 지킨다.
- primary만 입력해도 모든 고정 role이 생성된다.
- 선택 색상과 지원 vibe가 결과에 눈에 띄는 변화를 만든다.
- 결과가 한 페이지에서 즉시 시각화된다.
- 모든 최종 색에 대해 중간 계산을 확인할 수 있다.
- 대비 또는 gamut 문제가 숨겨지지 않고 표시된다.
- 새 규칙을 추가하거나 수치를 바꾼 뒤 결과를 바로 재생성할 수 있다.

## 이번 프로토타입에서 하지 않는 것

- CSS bundle 또는 npm package 배포
- skill 포맷
- canonical export system
- dark mode와 high-contrast mode 조합
- semantic status color 전체
- 복수 테마 저장
- 자연어 vibe의 범용 해석
- 전역 색상 최적화
- 다수의 UI component
- 결과 버전 간 diff

이 항목들은 [장기 결과물 및 시각화 아이디어](output-artifact-proposal.md)에 참고 아이디어로 남긴다.
