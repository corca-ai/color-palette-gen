# Color Palette Generator

Live pages:

- [v2 — primary-only light/dark palette (default)](https://corca-ai.github.io/color-palette-gen/)
- [v1 — inspectable palette experiment](https://corca-ai.github.io/color-palette-gen/v1/)

하나의 핵심 색상에서 light/dark UI 팔레트를 생성하고 그 결정 근거를 검사할
수 있는 프로젝트입니다. 기본 페이지는 v2이며, 다중 색상과 vibe를 받는 초기
실험은 v1 경로에 별도로 보존합니다.

v2는 완성된 상용 팔레트 제품이라기보다, 선언된 디자인 의도와 생성 공식,
자동 검증, 사람의 시지각 판단을 서로 대체하지 않고 연결하는 방법을 탐구하는
공개 연구 프로토타입입니다. 생성된 팔레트는 이 연구의 관찰 대상이며, 한
사람의 평가는 보편적인 시각 판단이나 자동 정책 변경으로 취급하지 않습니다.

v1은 유지보수 전용입니다. 보안·호환성·명백한 결함 수정은 계속 받지만 새
팔레트 연구는 기본 프로토타입인 v2에서 진행합니다.

> **Experimental prototype**
>
> 이 프로젝트의 contrast와 gamut 결과는 설계 판단을 돕는 계산 자료이며,
> 완전한 접근성 인증이나 production 적합성 보장을 의미하지 않습니다. 실제
> 서비스의 글자 크기, 굵기, 상태, 컴포넌트 맥락에서 다시 검증해야 합니다.

## 현재 v2

v2의 공개 계약은 단순합니다.

```js
{
  primary: "#507096";
}
```

하나의 primary로 완성된 light/dark semantic palette를 만들고, 다음 순서로
결과와 근거를 전달합니다.

1. **Applied example**: 생성된 역할들이 실제 interface hierarchy를 만드는가?
2. **Generated palette**: 어떤 색이 어떤 역할로 생성되었는가?
3. **Decision evidence**: 목표와 탈락 후보 중 왜 이 색이 선택되었는가?
4. **Quality review**: hard contract 통과 후에도 남은 디자인 품질 신호는 무엇인가?
5. **Relationships**: 결과 역할들은 어떤 구조로 연결되는가?
6. **Validation**: 명시한 text, boundary, focus, separation 계약을 통과했는가?

팔레트와 적용 결과를 먼저 읽고, 상세 분석은 필요할 때 펼치는 구조입니다.
Light, Dark, Compare 선택은 전체 inspector에 동일하게 적용됩니다. 자세한 페이지
계약은 [페이지 및 인터랙션 설계 의도](docs/interaction-design.md)에 있습니다.

JSON export는 범용 example token namespace를 사용합니다. 적용 sample의 coverage는
공개된 디자인 참고 자료에서 아이디어를 얻었지만 특정 제품과의 제휴, 실제 소비
관계 또는 runtime dependency를 의미하지 않습니다.

## 보존된 v1 실험

아래 계약은 현재 기본 제품이 아니라 `/v1/`에 보존된 초기 실험입니다.

### 입력

- **Primary color**: 필수
- **Secondary, tertiary 등의 추가 색상**: 선택
- **Vibe**: 선택
  - 색상 조합에서 느껴져야 하는 인상을 단어로 입력합니다.
  - 예: `calm`, `soft`, `energetic`, `high contrast`

보존된 v1 엔진의 공개 입력 계약은 다음과 같습니다.

```js
{
  primary: "#FF0000",
  secondary: "#00AA88",            // optional
  additionalColors: ["#2255CC"],   // optional
  vibe: "balanced"                 // optional
}
```

현재 UI 프로토타입은 `additionalColors` 중 첫 번째 색만 decorative family에
사용하며, 그 이상의 색이 들어오면 입력을 보존한 채 scope warning을 반환합니다.

### 출력

v1 프로토타입은 19개의 색상과 해당 UI 용도를 연결한 목록을 제공합니다.

```text
list[(color, function)]
```

현재 고정된 `function`은 다음과 같습니다.

- background, surface, border, border control
- main text, secondary text
- primary button default, hover, active, text
- focus ring
- secondary accent, soft, text, on-color
- decorative accent, soft, text, on-color

### 목표

입력된 색상 간의 조화와 지정된 vibe를 함께 고려하여, 일관된 UI 디자인에 활용할 수 있는 색상과 기능의 조합을 생성합니다.

## 현재 v2 문서

- [프로젝트 방향](docs/product-direction.md)
- [구조와 실행 경계](docs/architecture.md)
- [기술 스택](docs/technology-stack.md)
- [개발 및 검증](docs/development.md)
- [협업 및 공개 저장소 원칙](docs/collaboration.md)
- [단기 로드맵](docs/roadmap.md)
- [운영자 인수 기준](docs/operator-acceptance.md)
- [공개 표준 기반 설계 근거](docs/public-design-basis.md)
- [페이지 및 인터랙션 설계 의도](docs/interaction-design.md)
- [v2 색상 결정 정당화 모델](docs/v2-decisions/README.md)
- [현재 색상 결정 흐름 Mermaid](docs/v2-decisions/color-decision-flow.md)

## 보존된 실험 문서

아래 문서는 현재 v2 계약이 아니라 v1 실험과 초기 탐색의 기록입니다.

- [프로토타입 도메인 명세](docs/prototype-domain-spec.md)
- [초기 설계 기록](docs/prototype-plan.md)
- [엔진 검증 및 한계](docs/engine-testing-plan.md)
- [참고 자료와 적용 근거](docs/reference-insights.md)
- [초기 출력 확장 제안](docs/output-artifact-proposal.md)

## 프로토타입 실행

`.node-version`에 선언된 Node.js 버전에서 의존성을 설치하고 공개 artifact를
만든 뒤 저장소의 정적 서버로 실행합니다.
평가 갤러리 JSON은 빌드 과정에서 생성되므로 소스 디렉터리를 직접 서빙하는
것은 완전한 v2 확인 경로가 아닙니다.

```sh
npm ci
npm run build
node scripts/serve-site.mjs 4173
```

```text
http://localhost:4173/       # v2 default
http://localhost:4173/v1/   # v1 experiment
```

기본 v2는 primary 하나로 light/dark color palette를 생성합니다.

팔레트 작성 도구는 중립적인 기준면을 유지하고, 적용 샘플은 공개된 디자인
아틀라스의 Foundation, Navigation, Messages, Composer, component state 구성을
참고해 검증합니다. 이 공개 참고 사례는 내부 서비스 관계나 런타임 의존성을
의미하지 않습니다.

v2는 입력을 achromatic, subdued, chromatic으로 분류하고, 입력 hue와 상대
chroma를 보존하면서 모드별로 사용 가능한 primary 명도를 계산합니다. 텍스트는
APCA, interactive boundary와 focus는 WCAG 비텍스트 대비, 상태와 destructive
분리는 Oklab Delta E 계약으로 검증합니다. 자세한 정책은
[`docs/v2-spec.md`](docs/v2-spec.md)에 기록되어 있습니다.

## 보존된 v1 구현 참고

기존 v1에서는 초기 입력 `#FF0000`과 `balanced` vibe를 사용하며 Palette,
Content, Form, States, Debug 탭에서 계산 결과와 적용 예시를 확인할 수 있습니다.
Debug 탭에서 역할을 선택하면 다음 시각 자료가 해당 역할에 맞게 표시됩니다.

- 공통: candidate와 sRGB output의 OKLCH 변화축
- secondary/decorative family: primary와의 hue wheel 관계
- primary button family: default → hover → active 명도 시퀀스
- text, button text, focus ring: 기준선이 표시된 contrast meter

보존된 축과 조정된 축은 상태 badge로 구분되며, 기존의 문장형 계산 과정은
`Detailed calculation trace`를 펼쳐 확인할 수 있습니다.

## 구조

색을 계산하는 코드와 결과를 보여주는 코드를 분리했습니다. 아래는 진입점만
요약하며 자세한 소유 경계는 [Architecture](docs/architecture.md)에 있습니다.

- `v1/`와 `lib/`: 유지보수 전용 실험 UI와 기존 팔레트 엔진
- `v2/lib/palette.js`: 팔레트 생성 오케스트레이션
- `docs/v2-decisions/color-decision-flow.md`: 현재 색상 결정 단계와 의존성 Mermaid
- `v2/lib/feedback-search.js`: Destructive·Warning 후보 검색
- `v2/lib/diagnostic-corpus.js`, `result-evidence.js`: 진단 공통 입력과 현재 정책 결과의 사전조건 검증
- `v2/app.js`와 `v2/styles/`: 현재 UI, 상호작용, 표시 경계
- `scripts/build-site.mjs`: 배포 artifact와 고정 평가 세트 조립
- `docs/v2-spec.md`: v2 범위, 공개 디자인 참고 규칙, APCA 선택 근거

브라우저 없이 계산 규칙과 진입 스크립트 문법을 함께 확인하려면 다음을
실행합니다.

```sh
npm run check
```

이 빠른 게이트에는 v2/shared 코드 20, 유지보수 전용 v1 코드 25를 상한으로
하는 순환 복잡도 검사도 포함됩니다.

v2 fast 테스트는 대표 primary 입력과 Light/Dark 계약을 검사합니다. 모든
vibe/harmony 후보 및 다중 색상 입력 조합은 보존된 v1 엔진의 회귀 검증입니다.

현재 v2 정책을 고정된 216색 RGB grid 전체에서 비교하는 진단 리포트는 다음과
같이 생성할 수 있습니다.

```sh
npm run diagnose:adversarial > report.json
npm run diagnose:feedback-candidates > feedback-candidates.json
npm run diagnose:destructive-anchor > destructive-anchor.json
npm run diagnose:mode-range > mode-range.json
npm run diagnose:pair-ranking > pair-ranking.json
npm run diagnose:primary-chroma > primary-chroma.json
```

이 명령들은 필요할 때만 실행하며 CI 합격 조건이 아닙니다. 범위 리포트는 현재
범위와 세 개의 강한 반사실적 범위를 비교하고, pair-ranking 리포트는 동일한 후보
집합에서 이전 v11 source-first 순서와 현재 v12 zero-miss eligibility 정책을
비교합니다. 명령 자체는 정책을 변경하거나 최적 해법을 판정하지 않습니다. 출력의
신호 수와 결과 수렴 그룹은 팔레트 점수나 시지각 품질 판정으로 해석하지 않습니다.
adversarial 리포트의 `semanticHueReview`는 기존의 네 Primary ↔
Destructive/Warning provisional hue 검사를 input, mode, relationship 단위로
분리하지만 원인이나 시지각적 혼동을 판정하지 않습니다.
feedback-candidates 리포트는 그중 실패한 120개 검사만 대상으로 현재 역할별
기본색 후보군에 기존 제약과 동일한 hue 검사를 함께 통과하는 후보가 있는지
확인합니다. v2의 관계별 candidate-occurrence funnel은 단계별 이탈을 보여주지만
원인, 확률, 고유 색상 수를 뜻하지 않습니다. hover/active 상태, 공통 label,
pacing, Destructive와 Warning의 공동
대체 가능성은 검사하지 않으므로 전체 팔레트 수정 가능성으로 해석하지 않습니다.
v3의 고정 12°/27°/42° Destructive ladder는 실패한 66개 관계 안에서 후보 폭만
민감도 검사하며, semantic red·시지각 선호·production hue 정책을 정하지 않습니다.
destructive-anchor 리포트는 빨강 근처 source에서만 쓰는 별도 Destructive 목표 L을
제거하고 기본 mode 목표를 썼을 때의 결정적 차이를 같은 후보·제약·후속 생성으로
비교합니다. 현재 검사 결과의 차이만 설명하며 semantic red의 시지각적 동등성이나
정책 변경을 입증하지 않습니다.
primary-chroma 리포트는 Primary에만 현재 고정 chroma cap과 대응 상한을
source-relative 네 origin(중복 제거 후 최대 네 단계) 후보군으로 교체해 비교합니다.
또한 원본 C가 현재 cap을 넘을 때만 변경 결과를 고려하고, 생성 불가나 새 contract /
pair eligibility 실패가 생기면 입력 전체를 현재 v12 결과로 되돌리는 진단용
transactional fallback 결과도 함께 냅니다. 요청 chroma와 실제 sRGB 출력 chroma를
구분하며, 이 fallback 준수는 guard로 구성된 결과이지 쨍함·미감·최적 정책의 증거가
아닙니다.

## 보존된 v1 접근성 대비 모델

팔레트는 OKLCH의 지각 명도 축으로 후보를 만든 뒤, gamut mapping과 8-bit HEX
반올림까지 끝난 실제 sRGB 결과로 WCAG 대비를 다시 계산합니다. 원래 후보가
기준을 충족하지 않으면 hue와 chroma를 우선 보존한 채 가장 가까운 OKLCH
lightness를 이진 탐색합니다.

대비 관계는 `lib/palette-config.js`의 `CONTRAST_CONTRACTS`에 선언되어 있으며,
현재 다음 관계를 보장합니다.

- main/secondary text와 background/surface
- 하나의 primary button text와 default/hover/active 상태 전체
- secondary/decorative accent text와 soft/background/surface
- secondary/decorative accent on-color와 각 accent fill
- focus ring과 background/surface
- control border와 surface

`border`는 장식적인 구분선이고 `border control`은 입력 및 조작 가능한
컴포넌트의 경계입니다. 장식용 accent 원색 역시 텍스트 역할과 분리하며,
soft surface 위 텍스트에는 대응하는 `accent text`, accent fill 위 텍스트에는
대응하는 `accent on-color` 토큰을 사용합니다.

## 현재 범위

모든 계산은 브라우저에서 실행되므로 현재 프로토타입은 정적 웹사이트로
배포할 수 있습니다. 팔레트 저장, 사용자 계정, 공유 데이터베이스는 아직
포함하지 않습니다.

사용자가 입력한 색상은 브라우저 안에서만 계산하며 외부 API, analytics 또는
cookie로 전송하지 않습니다. primary, 점수, 판단, 메모는 저장하지 않습니다.
Light/Dark/Compare 결과 보기 모드만 local storage에 저장됩니다. 이전 버전이
브라우저에 남긴 평가 데이터가 있다면 현재 코드는 이를 읽거나 전송하지 않으며,
브라우저의 사이트 데이터 설정에서 직접 제거할 수 있습니다.

## GitHub Pages 배포

이 프로젝트는 별도 번들러 없이 정적 파일을 GitHub Pages artifact로 배포한다.

```sh
npm run check
npm run build
```

의존성은 `package-lock.json`으로 고정하며 CI는 `npm ci`를 사용한다.

`npm run build`는 v2를 `dist/` 루트의 기본 페이지로, v1을 `dist/v1/`에
조립한다. v2의 독립 asset은 `dist/v2/`에 유지한다. 두
버전이 함께 사용하는 저수준 색 변환 모듈은 `dist/lib/`에 포함한다.
`test/`와 `docs/`는 배포 artifact에 포함하지 않는다.

`.github/workflows/deploy-pages.yml`은 `main` push 또는 수동 실행 시 다음 순서로
동작한다.

```text
check → build dist/ → upload Pages artifact → deploy
```

GitHub의 `Settings → Pages → Source`는 `GitHub Actions`로 설정되어 있다.
`main`에 반영된 빌드는 v2를 기본 URL에 배포하고 기존 실험은 `/v1/`에서
볼 수 있게 한다. 두 앱 모두 상대 asset 경로를 사용하므로 프로젝트 Pages의
base path에서도 동작한다.

## License

[MIT](LICENSE)
