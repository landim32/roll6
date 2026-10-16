# Research: A voz do mestre no chat (079)

## R1. How "the master's voice" is known

- **Finding**:
  - Only the campaign master may speak without a character (`SpeakerAsync`). A conversation entry with
    `CharacterId == null` is therefore the master speaking as such, shown as "Mestre (GM) — Rodrigo" through
    `display_name`.
  - The items carry `characterId`, `userId` and `kind`.
- **Decision**: the client decides the highlight from the item:
  - **master voice** = kind in {text, image, audio, roll}, `characterId === null` and not deleted.
  - Pure `lib/chatItems.isMasterVoice(item)`. No new server field and no schema change.
- **Rationale**:
  - The rule is already true by construction on the server.
  - The whole history gets the highlight at once (FR-001).
  - Polls (no character possible for the master too) keep their card; the request is about messages.
- **Alternatives considered**: a stored flag. It would be redundant with `character_id`.

## R2. The highlight (Q1)

- **Decision**: `.stm-chat-message.is-master .stm-chat-bubble`:
  - a solid golden card `#f2c14e` with `color: #1a1300` (dark text, contrast ≈ 11:1);
  - `font-weight: 700` on `.stm-chat-text`;
  - the bubble's secondary texts (time, caption counts, author line) in a darkened amber.
  - Own master messages (`is-own`) use the same card, a shade darker (`#e8b23a`), so "mine" stays visible.
- **Whisper interplay**: `.is-whisper.is-master` keeps the gold card and adds the whisper's dashed amber border and its
  footer (now with dark text).
- Images and audio keep their media. The caption text inside goes bold and dark.
- The roll card's numbers and total use dark text on gold.
- **Rationale**:
  - The user asked for a yellow card and accepted suggestions.
  - The whisper uses a pale translucent yellow (`rgba(245,197,24,0.14)` + border), so a solid gold with dark text is
    unmistakable and still "yellow".

## R3. Changing the voice

- **Decision**:
  - `POST /api/chat/{id}/speaker { characterId: long? }` → `TurnService.SetSpeakerAsync(userId, turnId, info)` in
    `TurnService.ChatActions.cs`.
    - `characterId` null means the master; otherwise one of the caller's approved characters in the campaign.
    - It returns the item and publishes `chat.updated` through `PublishUpdatedAsync`, which already splits whispers per
      audience.
  - **Rules**:
    - the caller is the campaign master and the entry's author (`turn.UserId == userId`), else 403;
    - the kind is Text, Image, Audio or Roll and the entry is not deleted, else 400 `characterId`;
    - the character is the caller's own and approved in the campaign, else 403;
    - in a whisper, the new character must not be one of its targets (400 "Este sussurro é para esse personagem.");
    - the same voice changes nothing.
  - `Turn.SetSpeaker(characterId, displayName, displayImage)` keeps the id, `created_at`, `chat_at`, reply, reactions
    and whisper targets.
  - The name and picture come from `SpeakerAsync` (the same text a new message would get: "Mestre (GM) — {first
    name}" or the character's name and picture).
  - No campaign-status gate: the conversation is never blocked (049). No turn record, so no turn rule. Any turn.
- **MCP**: `set_chat_speaker` (115 operations / 116 tools), and the `ITEM` text says that master messages have
  `characterId` null.

## R4. Which voice the menu offers (Q3)

- **Decision**: the pure `lib/chatItems.voiceSwitch(item, viewer)` returns `{ to: 'master' } | { to: 'character',
  characterId, name } | null`:
  - `viewer.isMaster`, `item.userId === viewer.userId`, kind in the four, not deleted, not whisper-hidden;
  - when `item.characterId !== null`, the result is `{ to: 'master' }`;
  - when `item.characterId === null` and `viewer.selected` (the "Personagem atual", an approved character of the
    master) exists, the result is `{ to: 'character', … }`;
  - otherwise null.

  `ChatItemActions` shows one button: "Falar como mestre" (`PersonBadgeIcon` → copy `bi-person-badge`) or "Falar como
  {nome}" (`PersonIcon`). It sits where "Ação/Mensagem" would. Actions are not eligible, so the bar stays ≤ 7.
- `ChatContext.setSpeaker(item, characterId|null)` calls `chatService.setSpeaker` and upserts the answer.

## R5. Tests

- **xUnit**:
  - master → character and back: the display changes and the id and reactions are kept;
  - `chat.updated` is published;
  - a player gets 403;
  - another person's message gets 403;
  - a character that is not his own or not approved gets 403;
  - a deleted entry, a poll or an action gets 400;
  - a whisper to that character gets 400;
  - the same voice changes nothing;
  - MCP coverage, route and description tests.
- **Vitest**:
  - `isMasterVoice`;
  - `voiceSwitch` (each branch, other user, player, whisper-hidden).
