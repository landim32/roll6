# Quickstart: Enquete em aberto fixada

Setup: a master M and players P1 and P2, each with one approved character.

1. **Created at the bottom:** M creates a poll. It is the last item for M, P1 and P2.
2. **Messages go above it:** P1 sends 3 messages. They appear above the poll, which is still last for everyone.
3. **Votes don't release it early:** P1 votes, and the poll stays at the bottom. M votes, and it still stays (the master doesn't count).
4. **Last vote:** P2 votes. Within 3 s nothing moves on any screen. P1 sends a message, and it appears **below** the poll.
5. **Withdrawn vote:** P2 withdraws the vote, and the poll returns to the bottom. P2 votes again, and the poll sits after the latest message.
6. **Old poll after reload:** reload the page with an open poll created 200 messages ago. The poll is at the bottom without scrolling.
7. **New character:** with the poll closed, M approves a new character P3. The poll returns to the bottom until P3 votes.
8. **Deleting:**
   - P1 creates a poll; P2 votes. P1 holds it, and "Apagar" is offered.
   - P2 holding P1's poll gets no "Apagar".
   - M deletes it: it shows as deleted for everyone and is no longer pinned.
9. **Unread:** a vote on an old poll does not change anyone's unread count.
