# Specification Quality Checklist: Notificações da mesa (Web Push)

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-09
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Revised 2026-10-09 with the product owner's notification rules: a fixed catalog N1–N7 (chat messages to everyone, actions only to the master, "Falta apenas você…" at the majority, turn finished, HP and Fadiga of the own character, "Cutucar" in the paperclip). The issue's open questions are superseded: no per-type preferences, only mute per campaign.
- Defaults taken without asking (Assumptions): majority counts approved characters (⌈N/2⌉) and N3 fires once per turn; personal alerts (N3–N7) ignore "chat visible"; poke has a 1-minute cooldown per user and campaign and is not logged in the chat.
