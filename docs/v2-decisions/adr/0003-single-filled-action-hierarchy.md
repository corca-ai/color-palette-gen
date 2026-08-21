# ADR-0003: Single-filled action hierarchy

- Status: **Accepted for component presentation**
- Date: 2026-08-20
- Palette authority: semantic palette generation is now `v2-policy-model-16`
- Presentation authority: `single-filled-action-hierarchy-v1`
- Supersedes: [ADR-0002](0002-red-band-role-collision-presentation.md)

> This component-presentation decision remains active after
> [ADR-0004](0004-mode-relative-filled-actions-and-contextual-separation.md)
> changed palette generation and separation authority.
> [ADR-0006](0006-context-derived-secondary-action-states.md) retains this
> hierarchy and advances the executable authority to
> `single-filled-action-hierarchy-v2` by defining the previously missing
> Secondary state contract.

## Context

Primary와 Destructive가 같은 action group에서 모두 filled이면 두 행동이 같은 수준으로
경쟁한다. Primary가 red 계열일 때는 두 semantic red가 특히 비슷하게 보일 수 있지만,
이 문제를 raw source hue에만 연결하면 거의 같은 입력이 red-band 경계 안팎에서 서로
다른 component 문법을 갖게 된다.

[Carbon Button](https://carbondesignsystem.com/components/button/usage/)과
[Spectrum Button](https://spectrum.adobe.com/page/button/) 같은 공개 디자인 시스템은
Destructive의 semantic color를 없애지 않고, 문맥에 따라 filled danger와 낮은
강조도의 tertiary/outline/ghost danger를 구분한다. 따라서 palette가 색 유사성으로
위계를 결정하는 대신 component가 현재 action group의 구성을 명시한다.

## Decision

Primary와 Destructive semantic token 및 visual family는 모든 입력에서 독립적으로
유지한다. 한 action group에서는 filled action을 하나만 사용한다.

| Action group                               | Primary | Destructive | Cancel                   |
| ------------------------------------------ | ------- | ----------- | ------------------------ |
| ordinary Primary와 Destructive가 함께 있음 | filled  | outline     | 필요할 때 별도 secondary |
| destructive confirmation                   | 없음    | filled      | secondary                |

실행 resolver는 component가 `ordinaryPrimaryPresent`를 명시하도록 요구한다.

- `true` → `primary-filled-destructive-outline`
- `false` → `destructive-filled-secondary-cancel`

두 경우 모두 Destructive의 색은 generated Destructive family에서 온다. Primary visual
family를 재사용하지 않는다. `destructive-anchor.source-band-applicable`은 버튼 variant를
결정하지 않고 red 역할 충돌을 우선 검토하기 위한 diagnostic signal로만 남는다.

## Ownership

- Palette generator: Primary와 Destructive family 및 검증 evidence 생성
- Component presentation policy: action group의 filled/outline/secondary 조합
- Component author: ordinary Primary가 같은 action group에 존재하는지 명시
- Red-band diagnostic: 가까운 red 역할을 표시하되 presentation을 선택하지 않음

## Rejected and superseded alternatives

- 두 역할을 같은 visual family로 전역 alias하지 않는다.
- red-band destructive-only 문맥에서 Primary family를 재사용하던 ADR-0002 규칙은
  superseded다.
- 두 filled 버튼을 함께 보여 주는 표본은 문제 비교군으로만 유지한다.
- `C 0.15`, Oklab `ΔE 0.08`, hue review만으로 component hierarchy를 자동 결정하지
  않는다.

## Acceptance

- red와 non-red 입력이 같은 action-group 문맥에서 같은 presentation strategy를 받는다.
- coexisting context는 Primary filled와 Destructive outline을 표시한다.
- destructive confirmation은 dedicated Destructive filled와 secondary Cancel을 표시한다.
- applied specimen의 Destructive는 Primary family를 재사용하지 않는다.
- red-band는 UI에서 diagnostic으로 표시되지만 버튼 hierarchy를 바꾸지 않는다.
- 이 ADR의 최초 채택은 당시 palette generation, result schema, export, cache와
  policy v15를 변경하지 않았다. 후속 palette 변경은 ADR-0004가 소유한다.

## Nonclaims

- filled 하나라는 규칙이 모든 제품·플랫폼의 유일한 정답임을 주장하지 않는다.
- outline/filled 조합이 미적으로 최적이거나 오조작을 방지함을 자동 검사로 입증하지
  않는다.
- red-band predicate가 지각적으로 검증된 red 경계임을 주장하지 않는다.
- 이 hierarchy가 context-free palette의 `destructive.brand-separation = 0.08`을
  영구적으로 정당화한다고 주장하지 않는다. 두 semantic role의 identity와 두 filled
  fill의 수치 분리는 별도 의무다. Dark↑ joint 진단이 둘의 범위 차이를 드러냈지만,
  separation authority 변경은 후속 policy ADR이 소유한다.
