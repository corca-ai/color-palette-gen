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

여섯 workspace tab은 항상 한눈에 보여야 하며 tab strip 자체를 좌우로 스크롤하지 않는다.
넓은 화면에서는 한 줄, 좁은 화면에서는 `3열 × 2행`으로 배치한다. 화살표 키 탐색 순서는
DOM 순서를 유지하며, 줄이 바뀌어도 숨겨진 tab이 생기지 않아야 한다.

## Constraint Map

Constraint Map의 목적은 검사 개수를 압축해서 보여주는 것이 아니라, 디자이너가 다음
질문에 시각적으로 답할 수 있게 하는 것이다.

1. 무엇과 무엇을 검사했는가?
2. 통과 조건과 허용 범위는 어디인가?
3. 후보값과 최종값은 그 범위의 어디에 있는가?
4. 조건을 만족시키기 위해 어떤 축을 얼마나 움직였는가?

검사는 `Overview → Contrast → sRGB gamut → Hue relation → State distinction` 순서를
유지하지만 모든 상세 카드를 기본 노출하지 않는다. 기본 `Overview`는 category 상태만
보여준다. category를 선택하면 그래프 전체가 아니라 가벼운 check index를 먼저 보여주고,
check를 선택했을 때 카드 하나를 렌더링한다. `Corrections only`는 독립 navigation이 아닌
현재 category 또는 token 범위에 적용되는 상태 filter다. `← All constraints`는 Overview로
돌아가는 breadcrumb 역할을 한다. Constraint Map 상단의 `View applied samples`는 상세
목록을 건너뛰고 Generated samples로 이동한다.

Lineage graph는 같은 detail panel의 또 다른 진입점이다. 모든 node와 edge는 keyboard와
pointer로 선택 가능하다. token node는 그 token에 연결된 모든 check 카드를, source node는
source 설명을, edge는 해당 derivation 또는 constraint 관계 카드를 보여준다. Lineage
선택이 곧바로 side inspector를 열어서는 안 된다. Side inspector는 상세 카드의
`Full calculation`에서만 전체 token trace를 보여준다. 클릭할 수 없는 것처럼 보이는
interactive node나, 클릭할 수 있는 것처럼 보이지만 아무 동작도 없는 edge를 만들지 않는다.

Constraint report는 입력 또는 harmony가 변경될 때 한 번만 생성한다. category, node, edge
사이를 이동할 때는 기존 report를 필터링하며 다시 계산하지 않는다. 색 공간 raster와
boundary는 입력 조건을 포함한 key로 cache하고, 같은 카드를 다시 열 때 재사용한다.

카드 안에서도 모든 provenance를 동시에 펼치지 않는다. 기본 상태는 mode와
candidate → resolved 요약만 보여주고, 전체 `Intent → Candidate → Decision → Resolved`,
optimization, locked axis는 `Full decision path`를 열어 확인한다. 이는 정보를 삭제하는
것이 아니라 같은 카드 안에서 progressive disclosure를 적용하는 것이다. 글자 크기를
줄여 밀도를 확보하지 않는다.

모든 그래프는 가능한 한 동일한 문법을 사용한다.

- track 또는 영역은 측정 가능한 전체 범위를 뜻한다.
- 강조된 영역은 명시적인 목표 또는 허용 범위다.
- 가는 점은 후보값, 굵은 점은 최종값이다.
- 화살표나 연결선은 후보에서 최종값까지의 실제 이동을 뜻한다.
- 기준선은 contrast threshold, gamut boundary처럼 판정에 사용한 경계다.
- pass, adjusted, fail 색만으로 의미를 전달하지 않고 label과 수치를 함께 쓴다.

각 검사는 통과 상태보다 먼저 색 결정 방식을 명시한다.

- `SOLVED`: 조건이 최종값을 직접 결정하며 가장 가까운 통과값을 탐색한다.
- `MAPPED`: 허용 영역의 경계까지 한 축을 최소한으로 이동한다.
- `SELECTED`: 검정/흰색처럼 유한한 후보 중 조건에 가장 적합한 값을 선택한다.
- `VALIDATED`: 이미 결정된 색을 검사하며 이 단계에서는 색을 변경하지 않는다.
- `HEURISTIC`: vibe나 recipe 상수로 값을 만들며 수학적 최적해라고 주장하지 않는다.

카드는 `Intent → Candidate → Decision → Resolved` 순서를 보여준다. 실선 화살표는 실제
값 변경, 점선은 변경 없는 검사, 갈라지는 선은 후보 선택을 뜻한다. OKLCH 축 중 고정된
축은 lock으로 표시하고, 변경된 축과 delta를 함께 쓴다. `Passed`는 이 provenance보다
낮은 위계의 결과 상태다.

각 category의 기본 시각화는 다음과 같다.

- Contrast solver: hue를 고정한 `OKLCH lightness × chroma` 평면의 통과 가능 영역
- Black/white selection: foreground × background 상대 휘도 평면의 contrast 가능 영역
- sRGB gamut: hue를 고정한 `OKLCH lightness × chroma` 평면의 재현 가능 영역
- Hue relation: lightness를 고정한 `hue × chroma` polar gamut과 target sector
- State distinction: hue를 고정한 `lightness × chroma` 평면의 gamut·contrast·step 교집합

2차원 map의 면은 해당 좌표의 실제 색을 렌더링한다. 조건을 만족하지 못하는 색은 같은
색 공간 안에서 어둡게 마스킹하고, feasible boundary는 확대되어도 두꺼워지지 않는 가는
선으로만 표시한다. 따라서 단색 status fill이나 장식적인 gradient를 색 공간처럼 쓰지
않는다. candidate는 diamond, resolved는 triangle로 표시하되 둘 다 해당 색으로 채운다.
마커는 밝거나 어두운 색 공간 어디에서도 사라지지 않도록 검정 halo와 흰색 inner stroke를
함께 사용한다. 두 값이 사실상 같거나 현재
축척에서 겹치면 마커를 하나로 합치고 caption에 겹침을 알린다. 그래프 아래에는 각 점의 큰 swatch, HEX, OKLCH 값을 항상 노출해 작은 점의
색만 보고 값을 추측하게 하지 않는다. 이동 path는 실제 좌표 차이가 있을 때만 그린다.
그래프가 보여주는 축 이외의 값은 caption에 고정값으로 명시한다.

그래프 안의 marker는 위치 확인만 담당하며 색상 식별용 swatch보다 작아야 한다. 인접한
marker가 서로의 형태를 가릴 거리라면 둘을 겹쳐 그리지 않고 resolved marker 하나만
표시한다.

`SELECTED` 결정은 선택된 값만 표시하지 않는다. 허용된 모든 후보를 같은 좌표계에
표시하고, 선택된 후보는 resolved triangle, 선택되지 않은 후보는 candidate diamond로
구분한다. 각 후보의 swatch와 worst-case score를 그래프 아래에 함께 보여줘 무엇이
탈락했고 왜 선택되지 않았는지 비교할 수 있어야 한다.

연속형 contrast solver도 탐색한 darker/lighter 해를 provenance에 보존한다. 역할 정책이나
최소 이동 기준으로 선택되지 않은 해는 square marker와 swatch로 표시한다. 여러 배경을
동시에 검사하면 배경별 경계를 모두 그리고, 최종값에서 대비가 가장 낮은 limiting
background의 경계를 강조한다. 전체 feasible field는 이 경계들의 교집합이다.
교집합은 밝은 실제 색과 어두운 rejected 색의 경계로 이미 읽히므로 그 위에 별도의 흰색
aggregate outline을 중복해서 그리지 않는다. Gamut처럼 단일 경계만 존재하는 경우에는
고정밀도로 계산한 가는 outline을 유지한다.

Harmony는 사용자가 상단 candidate를 전환하기 전에도 비교 가능해야 한다. Hue relationship
wheel에는 선택되지 않은 harmony가 만들 secondary/additional 방향을 낮은 위계의 radial
mark로 표시하고, 아래 비교 목록에서 세 색의 조합과 선택 상태를 함께 보여준다. 명시적
사용자 색은 harmony가 변경하지 않으므로 모든 후보에서 같은 위치로 표시한다.

색 공간 raster는 외부 이미지가 아니라 현재 입력과 constraint로 브라우저에서 생성한다.
고해상도 화면에서도 보간이나 확대 때문에 경계가 계단처럼 보이지 않도록, 화면 표시
크기의 최소 2배 해상도로 계산한다. 성능을 위해 저해상도 이미지를 확대하지 않는다.

핵심 판정 근거는 카드 안에 항상 보인다. 전체 OKLCH 값, recipe, 상세 계산은
`Show calculation`이나 token inspector에 둘 수 있지만, inspector를 열어야만 통과 이유를
알 수 있게 만들지 않는다. 빈 matrix cell과 상태만 표시하는 축약 표는 사용하지 않는다.

Constraint 카드는 heading, decision summary, measured-value summary, graph, interpretation,
calculation link 순서를 공통으로 사용한다. 나란한 카드의 graph가 위아래로 흔들리지 않도록
heading과 measured-value summary의 공간을 맞추고 모든 graph plot에 같은 최대 너비를
적용한다. 글자 크기를 줄여 정렬하지 않는다.

인접한 위치에 같은 상태를 두 번 쓰지 않는다. 카드 상단 result는 constraint의 통과·보정
여부를, decision badge는 수행된 연산을 설명한다. 반면 정확한 수치, graph legend,
접혀 있는 full decision path는 각각 빠른 판정, 시각적 해석, 상세 검증이라는 서로 다른
역할이 있으므로 유지한다.

Hue relation의 target과 actual이 표시 정밀도상 같으면 두 수치와 marker를 반복하지 않고
`Target matched`인 단일 결과로 합친다. 실제 편차가 있을 때만 target, actual, deviation과
두 지점 사이의 이동선을 각각 표시한다.

Gamut mapping으로 내부 OKLCH 값이 바뀌었더라도 candidate와 resolved가 같은 8-bit HEX로
직렬화되면 이를 큰 시각 변화처럼 표현하지 않는다. 카드의 주 결과는 `Normalized`와
`Export unchanged`로 표시하고 swatch와 graph legend를 하나로 합친다. 내부 chroma 변화는
요약 수치와 full calculation에 남겨 constraint correction의 기록을 잃지 않는다.

Lineage는 독립적인 고정 dark theme가 아니라 현재 생성된 semantic palette를 사용한다.
section background, node surface, text, muted text, border, focus는 각각 같은 이름의 출력
token을 참조한다. Node 선택 surface는 해당 node color를 옅게 섞고, edge는 source에서
target으로 이어지는 색 gradient를 사용한다. 밝거나 어두운 edge가 배경에서 사라지지 않도록
main text 기반의 낮은 opacity underlay를 함께 그리며, focus stroke는 contrast contract를
통과한 focus ring token을 사용한다. 색 공간 graph 내부의 좌표와 marker는 palette sample이
아닌 진단 도구이므로 별도의 고정 diagnostic contrast를 유지한다.

Hue wheel처럼 여러 밝기의 색 위를 가로지르는 흰색 점선은 단일 stroke로 그리지 않는다.
같은 dash pattern의 어두운 underlay를 더 굵게 먼저 그리고 흰색 foreground stroke를 위에
놓아 밝은 hue와 어두운 hue 모두에서 관계선의 형태가 유지되게 한다. Point도 흰 경계 바깥에
어두운 1px ring을 둔다.

### Component usage contracts

Contrast 검사는 토큰이 존재하는지만 보지 않고 실제 component가 사용하는 foreground와
background 조합을 기준으로 한다. 이 조합은 `CONTRAST_CONTRACTS`에 usage 이름과 함께
한 번만 선언하고, palette engine과 Constraint Map이 같은 목록을 참조한다.

Soft accent surface용 `accent text`를 채도가 높은 accent fill 위에 재사용하지 않는다.
채워진 accent 위의 글자는 별도 `accent on-color` 역할을 사용하며, 엔진이 해당 fill을
기준으로 black/white 중 더 강한 foreground를 선택한다. 새로운 component fixture가 색을
조합할 때는 공개 전에 그 조합을 usage contract에 추가해야 한다.

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
