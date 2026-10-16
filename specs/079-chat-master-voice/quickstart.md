# Quickstart: A voz do mestre no chat (079)

Pre-requisites:
- The master M has his own approved character Goran in the campaign.
- Player P has the character Aria.

1. **Highlight.**
   - With "Mestre (GM)" selected, M writes "A ponte range sob os pés de vocês.". It shows a golden card with bold dark
     text, on M's screen and on P's.
   - With Goran selected, M writes "Eu vou na frente.". It shows as a normal player bubble.
2. **History.** Old messages of M as the master also show gold after the update. Narrations keep their card.
3. **Whisper.** M whispers to Aria as the master. The card is gold, with the whisper's border and footer.
4. **Change the voice.**
   - With Goran selected, M holds his gold message and taps "Falar como Goran". It becomes Goran's, a normal bubble,
     with the same time and reactions, on every screen.
   - M holds it again and taps "Falar como mestre". It is gold again.
5. **Limits.**
   - P never sees these options.
   - M doesn't see them on P's messages, on polls or on actions.
   - With "Mestre (GM)" selected, a gold message offers no "Falar como …".
6. **Photo, audio and roll.** Repeat step 4 with a photo with a caption, a recording and a 3d6 roll.
7. **MCP.**
   - `set_chat_speaker` with `characterId` null and with Goran's id changes the voice.
   - As P it gets 403.
   - On a whisper to Goran, switching to Goran gets 400.
