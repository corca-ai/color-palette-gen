# Architecture decision records

ADR은 현재 production 규칙과 검토 중인 정책 후보를 구분한다.

- **Proposed**: 구현·시각 검토 전의 후보. production authority가 아니다.
- **Accepted**: 사람이 명시적으로 trade-off를 disposition하고, 코드·정책 버전·문서·테스트를 함께 갱신한 결정.
- **Rejected/Superseded**: 채택하지 않았거나 후속 결정으로 대체된 기록.

현재 목록:

- [ADR-0001: source-red collision-aware filled-action direction](0001-source-red-collision-aware-filled-action-direction.md)
  — **Superseded before adoption**; its diagnostic evidence remains historical input.
- [ADR-0002: red-band role collision presentation](0002-red-band-role-collision-presentation.md)
  — **Superseded after operator review**; retains the rejected Primary-family reuse rationale.
- [ADR-0003: single-filled action hierarchy](0003-single-filled-action-hierarchy.md)
  — **Accepted for component presentation**; one filled action per action group.
- [ADR-0004: mode-relative filled actions and contextual separation](0004-mode-relative-filled-actions-and-contextual-separation.md)
  — **Accepted for production v16**; Light darkens, Dark lightens, and
  Primary–Destructive separation remains selected-result review evidence.
- [ADR-0005: WCAG normal-text generation authority](0005-wcag-normal-text-generation-authority.md)
  — **Accepted for production v17**; WCAG 4.5 is text eligibility and APCA ranks eligible candidates diagnostically.
- [ADR-0006: context-derived Secondary action states](0006-context-derived-secondary-action-states.md)
  — **Accepted for production v18**; Confirmation Cancel follows the shared mode direction with checked label contrast, and Focus covers Muted Surface.
- [ADR-0007: Light Warning vivid amber](0007-light-warning-vivid-amber.md)
  — **Accepted for production v19**; Light adopts the reviewed higher-lightness amber while Dark retains its previous recipe.
- [ADR-0008: Warning shared-label transaction](0008-warning-shared-label-transaction.md)
  — **Accepted for production v20**; the selected Default label is reused and validated across the complete Warning family.
- [ADR-0009: public reference export boundary](0009-public-reference-export-boundary.md)
  — **Accepted schema/version removal**; the public build now ships only product-neutral export contracts.
