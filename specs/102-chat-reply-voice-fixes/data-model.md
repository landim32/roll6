# Data Model: 102

No server data changes. Frontend shapes:

- `WhisperRecipient { characterId: number | null; name; imageUrl }` (existing; `characterId: null` = "Mestre").
- `ReplyViewer { userId: number | null; speakerCharacterId: number | null; isMaster: boolean; approvedIds: ReadonlySet<number> }`.
- `VoiceSwitch` (existing): `{ to: 'master' } | { to: 'character'; characterId; name }`.
- `VoiceViewer` becomes `{ userId; isMaster; characters: { characterId; name }[] }`.
