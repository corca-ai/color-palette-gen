# Page and interaction design intent

이 문서는 Color Lab 페이지의 주요 영역이 왜 현재 순서와 동작을 갖는지 기록한다.
시각적 개선이나 구조 변경을 할 때 아래의 사용자 흐름을 보존하는 것이 목적이다.

## Core journey

페이지의 핵심 흐름은 다음 순서를 따른다.

1. 사용자가 primary, optional supporting colors, vibe를 입력한다.
2. 시스템이 기본 palette를 생성하고 Color lineage로 이동한다.
3. 사용자가 lineage 상단의 harmony candidates를 비교하고 선택한다.
4. 선택한 harmony가 lineage, constraints, palette, sample 전체에 동시에 반영된다.
5. 사용자는 아래로 스크롤하며 선택을 유지한 채 실제 적용 샘플을 확인한다.
6. 더 자세한 근거가 필요하면 palette row, Adjustments, Debug를 연다.

따라서 큰 섹션의 기본 순서는 다음과 같다.

> Input → Color lineage and harmony selection → Generated samples

Color lineage는 결과 뒤에 붙는 부가 문서가 아니다. 색을 선택하고 그 결과를 비교하는
주요 조작 구간이므로 Generated samples보다 앞에 있어야 한다.

## Harmony switcher continuity

Harmony candidates는 lineage 내부에서 처음 등장한다. 사용자가 결과 영역으로 내려갈 때
선택 컨트롤을 잃지 않도록, 원래 컨트롤이 화면 상단을 벗어나는 순간 동일한 버튼 묶음을
같은 가로 위치와 너비에 복제해 고정한다.

다음 조건은 의도된 불변 사항이다.

- 플로팅 컨트롤은 별도의 하단 dock이 아니다.
- 원래 탭 영역 전체를 떼어내지 않고 버튼 묶음만 복제한다.
- 플로팅 전후에 버튼의 가로 위치가 바뀌지 않아야 한다.
- 원본과 복제본은 같은 선택 상태를 보여야 한다.
- harmony 변경은 lineage뿐 아니라 모든 sample과 output에 즉시 반영되어야 한다.
- lineage를 Generated samples 아래로 이동하면 이 연속성이 깨지므로 이동하지 않는다.

## Generate behavior

`Generate palette`는 입력을 계산한 뒤 Content sample을 기본 결과 탭으로 준비하고,
화면을 Color lineage의 시작점으로 이동시킨다. 이 위치에서 사용자는 계산의 출발점을
확인하고 harmony 후보를 고른 다음 자연스럽게 결과로 내려갈 수 있다.

Generate 직후 constraint table의 중간이나 Generated samples로 바로 이동시키면 harmony
선택 단계를 발견하기 어렵다. 따라서 scroll target은 `.lineage-section`을 유지한다.

## Result workspace

Generated samples에서는 실제 쓰임새를 먼저 이해할 수 있도록 Content를 기본 탭으로 연다.
각 탭의 역할은 다음과 같다.

- Content: 색이 콘텐츠 화면에서 함께 쓰이는 방식
- Form: 입력, 경계, 도움말, action hierarchy 적용
- States: 기본, hover, active, disabled 상태 비교
- Palette: semantic function과 hex output 확인
- Adjustments: 요청값이나 후보값에 실제 수정이 발생한 경우만 표시
- Debug: 변환, 검사, recipe를 포함한 전체 trace

Content가 기본 탭이라는 사실은 lineage를 결과 뒤로 옮기는 근거가 아니다. 하나는 결과
영역 내부의 기본 관점이고, 다른 하나는 전체 생성·비교 흐름의 순서다.

## Change review checklist

페이지 구조나 sticky/floating UI를 수정할 때는 최소한 다음을 확인한다.

- primary 입력 후 Generate를 눌러 harmony candidates를 바로 발견할 수 있는가?
- harmony를 바꾸면서 결과까지 내려갈 때 선택 컨트롤의 위치가 연속적인가?
- secondary/additional 입력과 harmony 변경이 모든 sample에 반영되는가?
- 데스크톱과 390px 모바일에서 페이지 자체의 수평 overflow가 없는가?
- keyboard tab/arrow 조작과 `aria-selected` 또는 `aria-checked` 상태가 일치하는가?
- 시각적 강조를 바꾸면서 핵심 조작 순서를 뒤집지는 않았는가?

새로운 디자인 결정이 이 흐름을 바꾼다면, 구현 전에 이 문서에 이유와 대체 흐름을 먼저
기록한다.
