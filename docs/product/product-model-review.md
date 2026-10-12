# Product Model and Documentation Review

**Status:** review artifact; no product decisions made  
**Reviewed:** 2026-10-07  
**Scope:** `README.md`, `dev-docs/user-workflows.md`, `CONTEXT.md`, `docs/adr/`, product open questions, current app model and active backlog.

This review is for discussion, not a replacement for the source documents. The current domain-doc convention is one root `CONTEXT.md` plus ADRs; there is no separate glossary. Expand `CONTEXT.md` rather than introduce another glossary file unless that convention changes. Keep unresolved questions in `docs/product/open-questions.md` and durable decisions in ADRs.

## Findings: conflicts and stale claims

| Priority | Finding | Evidence and implication |
| --- | --- | --- |
| High | The README's “Add teams, members, fixtures, and duties” setup step overpromises schedule creation. | `app/pages/setup.vue` creates a plan and collects teams, members, and role names; current plan pages have no gameday/match creation flow. Interactive schedule creation is still open in GitHub issue [#26](https://github.com/dyeske61283/gameday-helperplan/issues/26). Describe only available setup until that flow ships. |
| High | “Automated assignment” is called deferred, but automatic allocation exists. | `app/pages/plans/[planId]/assignments.vue` exposes `autoAssignMatchSlots`, backed by `app/utils/helper-assignment.ts`. Distinguish this implemented assignment action from any future unattended/season-wide automation. |
| High | Cancellation is both an explicit slot status and an unresolved product rule. | ADRs 0001/0004 list `CANCELLED`, while `docs/product/open-questions.md` Q18 and the parent refinement issue leave cancellation effects open. A stored status does not settle whether cancelling a match/gameday clears assignments, preserves them, blocks claims, or affects progress. |
| High | Gameday times have no timezone, but member `.ics` export serializes them as UTC. | ADR 0009 says gameday opening/closing values are local-looking and must not be presented as locally correct before timezone data exists. `app/utils/ical-export.ts` appends `Z` to those values. Decide the intended interpretation before advertising this export as a reliable local-time calendar entry. Match instants are a separate, UTC-defined case. |
| Medium | ADR 0001's implementation status conflicts with ADR 0006. | ADR 0001 says plan-scoped routes exist but legacy routes and migration remain; ADR 0006 says the canonical route migration is implemented and the global routes were removed. Reconcile ADR 0001's implementation note. |
| Medium | Check-in is deferred in product docs but remains in the data and store. | `SlotSchema` retains `checkedIn`, and `app/stores/plan.ts` still exposes a check-in mutation. ADR 0004 says it is legacy and does not determine completion; decide whether it is hidden compatibility data, an accessible workflow, or removable/migratable legacy. |
| Medium | “Custom role configuration” is only partly deferred. | `/setup` accepts user-entered role names, but current configuration does not expose the full role/skill/scope/quota model. Clarify that basic role naming exists while advanced configuration and quota policy remain undecided. |
| Medium | README background can be mistaken for a current feature promise. | The opening describes people swapping and illness as a current pain point; later the README correctly defers swaps. Label the opening as motivation and keep the current limitation adjacent. |

### Topics that are not current contradictions

- Neither targeted document promises iCal import or nuLiga synchronization. README explicitly defers nuLiga import; the workflow doc defers nuLiga import/synchronization. The current `.ics` feature is **export**, and the live calendar feed in ADR 0009 / issue [#40](https://github.com/dyeske61283/gameday-helperplan/issues/40) is a separate pending read-only subscription feature. Do not conflate these with schedule import.
- Both docs correctly say identity/authentication and authorization are not current controls. They could be clearer that a valid shared link is a bearer secret granting full-plan access and, for now, editing; selected-member choice is not identity.
- `getMemberDutyCounts` is an internal allocation count, not the member-facing “duty progress” defined in `CONTEXT.md`. Preserve that distinction when documenting progress or fairness.

## Domain concepts the context should capture

These are vocabulary candidates, not new decisions:

- **Plan / season:** the encrypted aggregate and its season label; clarify whether “plan” and “season plan” are synonyms and whether one plan always means one season.
- **Gameday / match:** a gameday groups matches and may have its own duties, opening/closing times, and location; a match has a timestamp, participating teams, and match duties.
- **Duty / slot:** member-facing language says “duty”; the data model calls each assignable occurrence a `Slot`. Define whether a slot is one instance of a role, and use “assignment” for its staffing/lifecycle rather than as a synonym for the duty itself.
- **Role / skill (capability):** a role describes work and scope; an optional required skill is a hard eligibility constraint. Distinguish skill eligibility from helper-team preference and from member categories.
- **Assignment status:** `OPEN`, `ASSIGNED`, `COMPLETED`, and `CANCELLED` exist in the model. Define each transition and what it means for a cancelled parent match/gameday.
- **Member / team / helper team:** membership can be zero-or-many teams; helper-team membership affects presentation/preference, not eligibility. Member categories remain open (Q15) and are not authorization roles.
- **Custom helper:** a slot can contain a typed helper name without a `Member` reference. Define whether this is an exception, how it affects counts/eligibility, and whether it is member-visible.
- **Location and local time:** locations currently have name/link/note but no timezone. Gameday times are local-looking; match times are instants. Avoid treating these values as interchangeable.
- **Selected member, identity, and access:** document the three separately, along with the bearer-link boundary and unrestricted current editing.
- **Progress and allocation:** public progress counts completed duties only; allocator counts/fairness scores are internal signals and are not rewards, balances, or rankings.

## Decisions still needed

1. **Cancellation and completion:** effects on assignments and progress; whether completion is derived or persisted; boundary behavior at closing time; behavior on reload, save, SSE, migration, and export. Q17/Q18 and ADR 0004 overlap and should become one explicit lifecycle decision.
2. **Configuration:** which role, skill, location, duty-count, quota, and default settings are editable; plan-level versus fixture-level scope; whether changed defaults affect only newly created fixtures; what happens when referenced roles/skills are renamed or removed. The schema has roles and locations but no quota model.
3. **Schedule import:** whether any input format is wanted (`.ics`, CSV, nuLiga, or none); source ownership, timezone interpretation, stable identity/deduplication, update/merge rules, and preservation of duties/assignments. Existing `.ics` export/feed work does not answer this.
4. **Print and helper guidance:** whether print/PDF is needed; required fields and sensitive-data exclusions; where instructions belong (role, venue, or plan); whether emergency contacts can be exposed by a bearer-link plan.
5. **Member categories and capability data:** Q15 is open; decide category vocabulary separately from team membership, skills, and authorization. Include how custom helpers fit.
6. **Time and calendar semantics:** timezone source (per location or per event), daylight-saving behavior, and what current exports may safely claim. No global timezone is currently modeled.

## Missing refinement / exploration

- The backlog child for printable output cites `dev-docs/gemini_tips.md`, but that file is absent from the current checkout; recover the source or restate its ideas in a durable issue before relying on it.
- Validate current setup and assignment flows against the running app, then update README/workflow wording from observed behavior. In particular, separate role-name entry from full role configuration, and automatic allocation from future background automation.
- Ask the intended club organizer and helpers which import, print, and instruction workflows solve a real problem before creating implementation commitments.
- Prototype/inspect native browser printing before choosing PDF generation; determine the minimum printable fields and privacy exclusions first.
- Trace cancellation/completion through store actions, save, SSE, migration, progress, and calendar export before settling lifecycle terms. Add representative boundary examples to the decision.
- Inspect existing plan fixtures and migration behavior before deciding configuration deletion/rename rules; establish whether any current plans rely on legacy `checkedIn` or custom-helper fields.

## Suggested documentation follow-up

First settle the lifecycle, time, and configuration questions. Then expand `CONTEXT.md` with the missing entity/relationship vocabulary and stable rules; update ADRs 0001, 0004, and 0009 where implementation state or chosen lifecycle/time behavior changes. Reconcile README/workflow promises against shipped UI. Keep this review as a temporary checklist, not a competing source of truth. The original documentation-reconciliation ticket remains open until its acceptance criteria are applied to the source docs.
