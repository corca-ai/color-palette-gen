# Color Palette Generator

사용자가 제공한 핵심 색상과 원하는 분위기(vibe)를 바탕으로, UI에서 바로 사용할 수 있는 색상 팔레트를 생성하는 프로젝트입니다.

> **Experimental prototype**
>
> 이 프로젝트의 contrast와 gamut 결과는 설계 판단을 돕는 계산 자료이며,
> 완전한 접근성 인증이나 production 적합성 보장을 의미하지 않습니다. 실제
> 서비스의 글자 크기, 굵기, 상태, 컴포넌트 맥락에서 다시 검증해야 합니다.

## 입력

- **Primary color**: 필수
- **Secondary, tertiary 등의 추가 색상**: 선택
- **Vibe**: 선택
  - 색상 조합에서 느껴져야 하는 인상을 단어로 입력합니다.
  - 예: `calm`, `soft`, `energetic`, `high contrast`

엔진의 공개 입력 계약은 다음과 같습니다.

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

## 출력

현재 프로토타입은 17개의 색상과 해당 UI 용도를 연결한 목록을 제공합니다.

```text
list[(color, function)]
```

현재 고정된 `function`은 다음과 같습니다.

- background, surface, border, border control
- main text, secondary text
- primary button default, hover, active, text
- focus ring
- secondary accent, soft, text
- decorative accent, soft, text

## 목표

입력된 색상 간의 조화와 지정된 vibe를 함께 고려하여, 일관된 UI 디자인에 활용할 수 있는 색상과 기능의 조합을 생성합니다.

## 공개 문서

- [프로토타입 도메인 명세](docs/prototype-domain-spec.md)
- [초기 설계 기록](docs/prototype-plan.md)
- [엔진 검증 및 한계](docs/engine-testing-plan.md)
- [참고 자료와 적용 근거](docs/reference-insights.md)
- [공개 로드맵 아이디어](docs/output-artifact-proposal.md)

## 프로토타입 실행

프로젝트 루트에서 정적 파일 서버를 실행한 뒤 브라우저로 접속합니다.

```sh
python3 -m http.server 4173
```

```text
http://localhost:4173
```

초기 입력은 `#FF0000`과 `balanced` vibe입니다. Palette, Content, Form,
States, Debug 탭에서 계산 결과와 적용 예시를 확인할 수 있습니다.

Debug 탭에서 역할을 선택하면 다음 시각 자료가 해당 역할에 맞게 표시됩니다.

- 공통: candidate와 sRGB output의 OKLCH 변화축
- secondary/decorative family: primary와의 hue wheel 관계
- primary button family: default → hover → active 명도 시퀀스
- text, button text, focus ring: 기준선이 표시된 contrast meter

보존된 축과 조정된 축은 상태 badge로 구분되며, 기존의 문장형 계산 과정은
`Detailed calculation trace`를 펼쳐 확인할 수 있습니다.

## 구조

색을 계산하는 코드와 결과를 보여주는 코드를 분리했습니다.

- `lib/color-math.js`: sRGB/OKLCH 변환, 대비, gamut mapping
- `lib/harmony.js`: 색상환 관계와 supporting color 도출
- `lib/palette-engine.js`: 입력과 vibe/harmony 해석
- `lib/palette-generator.js`: semantic token과 디버깅 trace 생성
- `lib/constraints.js`: 대비, 색역, 상태 변화, hue 관계 검증
- `app.js`: 입력 처리, 시각화, 사용자 인터랙션

브라우저 없이 계산 규칙과 진입 스크립트 문법을 함께 확인하려면 다음을
실행합니다.

```sh
npm run check
```

테스트는 대표 primary 색상과 모든 vibe, harmony 후보, 입력 모드를
조합하여 필수 function, trace, 대비 및 관계 조건을 검사합니다.

## 접근성 대비 모델

팔레트는 OKLCH의 지각 명도 축으로 후보를 만든 뒤, gamut mapping과 8-bit HEX
반올림까지 끝난 실제 sRGB 결과로 WCAG 대비를 다시 계산합니다. 원래 후보가
기준을 충족하지 않으면 hue와 chroma를 우선 보존한 채 가장 가까운 OKLCH
lightness를 이진 탐색합니다.

대비 관계는 `lib/palette-config.js`의 `CONTRAST_CONTRACTS`에 선언되어 있으며,
현재 다음 관계를 보장합니다.

- main/secondary text와 background/surface
- 하나의 primary button text와 default/hover/active 상태 전체
- secondary/decorative accent text와 soft/background/surface
- focus ring과 background/surface
- control border와 surface

`border`는 장식적인 구분선이고 `border control`은 입력 및 조작 가능한
컴포넌트의 경계입니다. 장식용 accent 원색 역시 텍스트 역할과 분리하며,
작은 텍스트에는 반드시 대응하는 `accent text` 토큰을 사용합니다.

## 현재 범위

모든 계산은 브라우저에서 실행되므로 현재 프로토타입은 정적 웹사이트로
배포할 수 있습니다. 팔레트 저장, 사용자 계정, 공유 데이터베이스는 아직
포함하지 않습니다.

사용자가 입력한 색상은 브라우저 안에서만 계산하며 외부 API, analytics,
cookie 또는 browser storage로 전송하거나 저장하지 않습니다.

## GitHub Pages 배포 준비

이 프로젝트는 별도 번들러 없이 정적 파일을 GitHub Pages artifact로 배포한다.

```sh
npm run check
npm run build
```

의존성은 `package-lock.json`으로 고정하며 CI는 `npm ci`를 사용한다.

`npm run build`는 공개 페이지에 필요한 `index.html`, `app.js`, `style.css`,
`lib/*.js`와 `.nojekyll`만 `dist/`에 조립한다. `test/`와 `docs/`는 배포
artifact에 포함하지 않는다.

`.github/workflows/deploy-pages.yml`은 `main` push 또는 수동 실행 시 다음 순서로
동작한다.

```text
check → build dist/ → upload Pages artifact → deploy
```

원격 저장소를 만든 뒤 GitHub의 `Settings → Pages → Source`를
`GitHub Actions`로 설정해야 실제 배포가 시작된다. 저장소 이름이 확정되기
전까지는 현재의 상대 asset 경로를 유지하며 별도의 base path 설정은 필요 없다.

## License

[MIT](LICENSE)
