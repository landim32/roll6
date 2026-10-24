# Contract: chat UI (102)

## Golden card quote
`.stm-chat-message.is-master .stm-chat-quote` (+ `-name`, `-text`): dark text, contrast ≥ 4.5:1.

## Reply to a whisper
"Responder" on a whispered item → the composer shows `WhisperChips` with `replyRecipients(item, viewer)` and the
yellow field; the user may remove/add (`@`) recipients; "×" on the reply card clears the automatic ones if untouched.
Sending uses the existing `whisperCharacterIds`/`whisperMaster` payload. Public items: unchanged.

## Voice switches (hold menu)
- Character entry of the master's own: "Falar como mestre" (as today).
- Master-voice entry of the master's own: "Falar como {nome}" (`PersonFillIcon`) per approved own character, not a
  recipient of the whisper. Each calls `ChatContext.setSpeaker(item, characterId)` (existing endpoint).
