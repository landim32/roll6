# Contract: who gets which notice (074)

Every notice is pushed to **every registered device** of each recipient that is not skipped (`failure_count < 5`).
Nobody gets their own notice, and a campaign muted by the user sends them nothing. Nothing depends on the table or chat
being open, and there is no in-app toast. The bell lists every notice that was enqueued for delivery.

| Kind | When | Recipients | Body |
|---|---|---|---|
| message | text, photo, audio, roll or narration in the chat | every participant except the author; for a whisper, only its audience | as today |
| action | every action saved by someone who is not the master: a character, or an ally NPC by its commander (convert included) | the master | "{actor}: {excerpt}" (the title is the actor) |
| pending | an action is the character's **first valid** action of the turn, after it at least ⌈approved/2⌉ characters have acted, and someone is still missing — **any mode** | owners of the characters without a valid action | "Falta apenas {others} e você" / "Falta só você" |
| turnFinished | finish, `process_turn`, set the current turn forward | the players | as today |
| life / fatigue | someone else changes the PV/Fadiga | the owner | as today |
| poke | poke with players missing (except the caller) | those players | "{poker} está cutucando você" |
| pokeMaster | a player pokes with nobody missing | the master | "{poker} está cutucando você: todos já agiram" |

## US3 reference (4 characters, 4 players: Ana, Bruno, Caio, Duda)

| Action by | Acted | pending notices |
|---|---|---|
| Ana | 1/4 | — |
| Bruno | 2/4 | Caio: "Falta apenas Duda e você"; Duda: "Falta apenas Caio e você" |
| Bruno again (replaces) | 2/4 | — (not a first action) |
| Caio | 3/4 | Duda: "Falta só você" |
| Duda | 4/4 | — |

Every one of these actions also sends `action` to the master.
