# Implementation Plan: Melhorias no chat — citação do mestre, resposta privada e voz do mestre

**Branch**: `102-chat-reply-voice-fixes` | **Date**: 2026-10-24 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/102-chat-reply-voice-fixes/spec.md`

## Summary

Frontend only — the server already has every rule.

1. **Quote on the golden card**: `.stm-chat-message.is-master .stm-chat-quote` gets dark text (`#1a1300` name,
   `rgba(26,19,0,0.78)` excerpt/notice) and a darker translucent background, ≥ 4.5:1 on `#f2c14e`/`#e8b23a`.
2. **Reply to a whisper**: pure `lib/whisper.replyRecipients(item, viewer)` computes the pre-filled recipients — the
   original's voice (its character if approved and not the replier's own, else "Mestre" unless the replier is the
   master) or, when the replier wrote the whisper, its own recipients (minus his speaking character; "Mestre" only when
   he is not the master). `ChatComposer` applies it when `replyTo` changes to a whispered item and clears them again when
   the reply is cancelled while they are still the automatic ones (Q1 = B: editable, nothing enforced).
3. **Master → character voice**: `lib/chatItems.voiceSwitch` becomes `voiceSwitches(item, viewer)` returning a list:
   "Falar como mestre" on his character's entry; on his master-voice entry one "Falar como {nome}" per **approved own
   participation** in the campaign (from `CharacterContext.myParticipations` — not the "Personagem atual"), minus a
   character that is a recipient of that whisper. `ChatItemActions` renders one button per switch.

## Technical Context

**Language/Version**: TypeScript 5 / React 18
**Primary Dependencies**: existing only (React, i18next, Bootstrap 5.3). **No new dependency.**
**Storage**: none.
**Testing**: Vitest (`whisper.test.ts`, `chatItems.test.ts`, `i18n/keys.test.ts`).
**Target Platform**: SPA (desktop + phones).
**Project Type**: web application (frontend only).
**Performance Goals**: n/a (pure functions over one item).
**Constraints**: the server rules of 047 (whispers) and 079 (`POST /api/chat/{id}/speaker`) are unchanged; no API, schema or MCP change.
**Scale/Scope**: 2 pure functions, 2 components, CSS.

## Constitution Check

| Principle | Gate | Status |
|---|---|---|
| I. Skills de arquitetura | No entity, context or service added. | PASS |
| II. Stack fixa | No dependency. | PASS |
| III. Casing | Edits in `lib/`, `components/chat/`, `styles/`. | PASS |
| IV. Convenções | i18n keys, Bootstrap Icons only, `interface`. | PASS |
| V. Banco | none. | PASS |
| VI. Auth | Server rules unchanged (whisper audience and speaker checks still on the server). | PASS |
| VII. Grid | n/a. | PASS |

Post-design re-check: PASS.

## Project Structure

```text
specs/102-chat-reply-voice-fixes/
├── plan.md · research.md · data-model.md · quickstart.md
├── contracts/ui-chat.md
└── tasks.md
frontend/src/
├── lib/whisper.ts (+ test)          # replyRecipients
├── lib/chatItems.ts (+ test)        # voiceSwitches (replaces voiceSwitch)
├── components/chat/ChatComposer.tsx # pre-fill on reply
├── components/chat/ChatMessageList.tsx, ChatItemActions.tsx  # several voice buttons
├── styles/app.css                   # dark quote on the golden card
└── i18n/locales/pt-BR.json          # whisper.replyFallback (if needed)
```

**Structure Decision**: existing frontend layout.

## Complexity Tracking

No violations.
