# Color Palette Generator

사용자가 제공한 핵심 색상과 원하는 분위기(vibe)를 바탕으로, UI에서 바로 사용할 수 있는 색상 팔레트를 생성하는 프로젝트입니다.

## 입력

- **Primary color**: 필수
- **Secondary, tertiary 등의 추가 색상**: 선택
- **Vibe**: 선택
  - 색상 조합에서 느껴져야 하는 인상을 단어로 입력합니다.
  - 예: `calm`, `soft`, `energetic`, `high contrast`

## 출력

각 색상과 해당 색상의 UI 용도를 연결한 목록을 제공합니다.

```text
list[(color, function)]
```

`function`은 다음과 같은 역할이 될 수 있습니다.

- 메인 글자색
- 배경색
- 보조 글자색
- 버튼 기본 색상
- 버튼 hover 상태 색상
- 버튼 클릭 상태 색상
- 그 밖의 UI 요소 및 상태별 색상

## 목표

입력된 색상 간의 조화와 지정된 vibe를 함께 고려하여, 일관된 UI 디자인에 활용할 수 있는 색상과 기능의 조합을 생성합니다.

## 문서

- [빠른 프로토타입 플랜](docs/prototype-plan.md)
- [프로토타입 도메인 명세](docs/prototype-domain-spec.md)
- [참고 자료 조사 및 프로젝트 적용 인사이트](docs/reference-insights.md)
- [장기 결과물 및 시각화 아이디어](docs/output-artifact-proposal.md)

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
