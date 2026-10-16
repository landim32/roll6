# Quickstart: Encerrar uma enquete (077)

Pre-requisites: a campaign with the master and 3 approved characters (Aria, Borin, Cael), each with their own player.

1. **Pinned poll.** A player creates a poll with 3 options, and Aria and Borin vote. The poll stays pinned at the bottom
   for everyone, because Cael has not voted.
2. **Only the master closes.**
   - A player holds the poll: the menu has no "Encerrar enquete", not even for its author.
   - The master holds it: the menu shows "Encerrar enquete" next to Curtir/Amei/Gargalhada/Responder/Copiar/Apagar.
3. **Closing.** The master taps "Encerrar enquete".
   - On every screen, without reloading, the poll leaves the bottom and appears in the flow, where its last vote left
     it.
   - It shows "Enquete encerrada", the counts and bars, and the winner highlighted.
4. **No more votes.**
   - Cael taps an option: nothing happens.
   - Through the API or MCP, `vote_chat_poll` gets 409 "A enquete foi encerrada.".
   - "Ver votos" still lists who voted for what.
5. **Still a message.** React to it, reply to it, copy it (the text says "(encerrada)") and, as its author or the master,
   delete it.
6. **Reload, and a new character.** Reload the page and approve a 4th character: the poll stays in the flow, closed.
7. **MCP.** `close_chat_poll` as a player gets 403. As the master on another poll it closes it, and `list_chat_messages`
   shows `poll.closed: true`.
