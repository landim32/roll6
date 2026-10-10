using System.ComponentModel;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using Roll6.DTO.Chat;

namespace Roll6.Mcp.Tools;

/// <summary>The campaign chat (041). Mirrors the chat routes of CampaignController and ChatController.</summary>
[McpServerToolType]
public static class ChatTools
{
    private const string ITEM = """
        Item: { key, cursor, kind, turnId, campaignId, turnNo, createdAt, userId, mapId, characterId, npcId, mapNpcId,
        displayName, displayImageUrl, authorLabel, text, description, before/after {x, y, look, lookName}, moved,
        movedTotal, changes [{field, label, before, after}], imageUrl, audioUrl, audioSeconds, audioType, deleted,
        canDelete, dice, cancelled, replyTo {key, turnId, displayName, kind, excerpt, deleted, cancelled, hidden},
        reactions [{userId, name, kind like|love|laugh}], canReply, canReact, canConvert (action|message|null),
        poll {question, totalVotes, options [{optionId, text, votes, voters [{characterId|null, name, imageUrl}]}]},
        whisper {master, recipients [{characterId|null, name, imageUrl}]} | null, whisperHidden }.
        kind is text | image | audio | roll | poll (what people said, rolled or asked; a roll has dice = the three faces
        and text = the optional reason; a poll has text = its question and poll = options with votes and voters — a
        null characterId is the master), movement | action | actionResult | characterUpdate | narration (the turn
        records — text is the same line as get_turn_summary), poke ("Ana cutucou Bruno") or turnFinished (the divider
        "Turno N finalizado"). An action with cancelled = true was replaced, reset or deleted ("Ação cancelada") and no
        longer counts in the turn. whisper (when not null) means only its recipients, the author and the master see the
        entry; whisperHidden = true is a whispered action you are not in (its text is "está sussurrando!").
        """;

    [McpServerTool(Name = "list_chat_messages", Title = "List chat messages", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/campaign/{id}/chat")]
    [Description($$"""
        What it does: reads the campaign chat. The chat IS the campaign's timeline: what the players and the master
        said (text, photo, audio), every turn record (moves, actions, action results, character/NPC changes,
        narrations) and a "Turno N finalizado" divider at the end of each turn — the same records the turn tools read.
        Without a cursor it returns the newest page; pass "before" with the first item's cursor to go back in time, or
        "after" with the last item's cursor to get what came next. Items are oldest first within the page.
        kind filters by entry kind (comma separated): the latest poll is kind = "poll", limit = 1 (the last item of the
        page); the conversation only is "text,image,audio,roll,poll"; the actions are "action". Whispers you are not in
        never appear (whispered actions appear masked).
        Who can use it: the campaign master or a player with an approved character in the campaign.
        Returns: { items, hasMore, unreadCount, firstUnreadCursor }.
        {{ITEM}}
        Common errors: 400 malformed cursor or unknown kind, 403 no access to the campaign, 404 campaign not found.
        Related tools: get_chat_message, send_chat_message, vote_chat_poll, get_turn_summary, get_turn_data.
        """)]
    public static Task<CallToolResult> ListChatMessages(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId,
        [Description("Optional: cursor of the first item you have, to read older items.")] string? before = null,
        [Description("Optional: cursor of the last item you have, to read newer items.")] string? after = null,
        [Description("Optional: how many items (1–100, default 50).")] int? limit = null,
        [Description("Optional: only these kinds, comma separated — text, image, audio, roll, poll, poke, movement, action, actionResult, characterUpdate, narration, turnFinished. Example: \"poll\".")] string? kind = null) =>
        api.SendAsync(HttpMethod.Get, $"/api/campaign/{campaignId}/chat", null, ("before", before), ("after", after), ("limit", limit), ("kind", kind));

    [McpServerTool(Name = "get_chat_message", Title = "Get one chat entry", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/chat/{id}")]
    [Description($$"""
        What it does: reads one chat entry by its turnId — for example a poll with its current votes and voters (to see
        a result after voting), a message being answered, or an action. Same visibility as list_chat_messages: a whisper
        you are not in is 404 (a whispered action comes masked).
        Who can use it: the campaign master or a player with an approved character in the campaign.
        Returns: the item. {{ITEM}}
        Common errors: 403 no access to the campaign, 404 entry not found (or a whisper you are not in).
        Related tools: list_chat_messages (kind = "poll" finds polls), vote_chat_poll, react_to_chat_message.
        """)]
    public static Task<CallToolResult> GetChatMessage(
        Roll6ApiClient api,
        [Description("Id of the entry (turnId from list_chat_messages).")] long turnId) =>
        api.SendAsync(HttpMethod.Get, $"/api/chat/{turnId}");

    [McpServerTool(Name = "send_chat_message", Title = "Send chat message", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/campaign/{id}/chat")]
    [Description($$"""
        What it does: says something in the campaign chat, seen at once by everyone at the table. Send text (1–4000
        characters, markdown), or a photo (image = fileName from upload_image, text = optional caption). Speak as one of
        your characters approved in the campaign (characterId) or, omitting characterId, as the master ("Mestre (GM)").
        The name and picture shown are kept as they are now. This is conversation: to record what a character does in
        the turn use act_in_turn; results and narrations go through process_turn / create_turn_entry.
        Who can use it: the campaign master (with or without a character) or a player as his own approved character.
        Returns: the new item.
        {{ITEM}}
        Common errors: 400 empty or too long text, invalid image, 403 not your approved character / not the master
        without a character, 404 campaign not found.
        Related tools: list_chat_messages, upload_image, act_in_turn.
        """)]
    public static Task<CallToolResult> SendChatMessage(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId,
        [Description("What to say (1–4000 characters, markdown), or the caption of a photo. Example: \"Vamos descansar antes de entrar na cripta?\".")] string? text = null,
        [Description("Optional: one of your characters approved in the campaign. Omit to speak as the master (only the master can).")] long? characterId = null,
        [Description("Optional: fileName returned by upload_image, to send a photo.")] string? image = null,
        [Description("Optional: turnId of the chat entry this message answers (message, action, roll or narration; shown as a quote).")] long? replyToTurnId = null,
        [Description("Optional whisper (047): ids of characters approved in the campaign who may see it (not your own). Others don't get a whispered message at all; a whispered action shows them \"está sussurrando!\". The master always sees whispers.")] List<long>? whisperCharacterIds = null,
        [Description("Optional whisper (047): true to whisper to the master (not when you are the master).")] bool? whisperMaster = null) =>
        api.SendAsync(HttpMethod.Post, $"/api/campaign/{campaignId}/chat",
            new ChatSendInfo
            {
                CharacterId = characterId, Text = text, Image = image, ReplyToTurnId = replyToTurnId,
                WhisperCharacterIds = whisperCharacterIds, WhisperMaster = whisperMaster
            });

    [McpServerTool(Name = "roll_dice", Title = "Roll dice", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/campaign/{id}/chat/roll")]
    [Description($$"""
        What it does: rolls 3d6 in the campaign chat. The server draws the three dice, records the roll in the chat
        history and shows it at once to everyone at the table, so nobody can pick the result. Roll as one of your
        characters approved in the campaign (characterId) or, omitting characterId, as the master; text is an optional
        reason ("Ataque com espada"). Only the master can delete a roll.
        Who can use it: the campaign master (with or without a character) or a player as his own approved character.
        Returns: the new item, kind "roll", with dice = [d1, d2, d3].
        {{ITEM}}
        Common errors: 400 reason longer than 260 characters, 403 not your approved character / not the master
        without a character, 404 campaign not found.
        Related tools: list_chat_messages, send_chat_message.
        """)]
    public static Task<CallToolResult> RollDice(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId,
        [Description("Optional: what the roll is for (≤ 260 characters). Example: \"Ataque com espada\".")] string? text = null,
        [Description("Optional: one of your characters approved in the campaign. Omit to roll as the master (only the master can).")] long? characterId = null,
        [Description("Optional whisper (047): ids of characters approved in the campaign who may see it (not your own). Others don't get a whispered message at all; a whispered action shows them \"está sussurrando!\". The master always sees whispers.")] List<long>? whisperCharacterIds = null,
        [Description("Optional whisper (047): true to whisper to the master (not when you are the master).")] bool? whisperMaster = null) =>
        api.SendAsync(HttpMethod.Post, $"/api/campaign/{campaignId}/chat/roll",
            new ChatRollInfo { CharacterId = characterId, Text = text, WhisperCharacterIds = whisperCharacterIds, WhisperMaster = whisperMaster });

    [McpServerTool(Name = "create_chat_poll", Title = "Create a poll in the chat", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/campaign/{id}/chat/poll")]
    [Description($$"""
        What it does: asks the table a question in the campaign chat, like a WhatsApp poll: one question (≤ 300
        characters) and 2–12 options (≤ 100 characters each, no two alike ignoring case and spaces; empty ones are
        dropped). Each character approved in the campaign votes once, and the master has one vote of his own as "Mestre";
        votes are public and can be moved or withdrawn (vote_chat_poll). Asked as one of your approved characters
        (characterId) or, omitting it, as the master. It is a chat message: it notifies the table ("Enquete: …"), can be
        replied to, reacted to and deleted by its author or the master; it is not a turn record.
        Who can use it: the campaign master (with or without a character) or a player as his own approved character.
        Returns: the new item, kind "poll", with poll = { question, totalVotes, options: [{ optionId, text, votes,
        voters: [{ characterId|null, name, imageUrl }] }] }. {{ITEM}}
        Common errors: 400 question empty/too long, fewer than 2 or more than 12 options, an option too long or repeated,
        bad replyToTurnId; 403 not your approved character / not the master without a character; 404 campaign not found.
        Related tools: vote_chat_poll, list_chat_messages, send_chat_message.
        """)]
    public static Task<CallToolResult> CreateChatPoll(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId,
        [Description("The question (≤ 300 characters). Example: \"Para onde vamos?\".")] string question,
        [Description("The answers, 2 to 12, each ≤ 100 characters and different from the others. Example: [\"Floresta\", \"Caverna\"].")] List<string> options,
        [Description("Optional: one of your characters approved in the campaign. Omit to ask as the master (only the master can).")] long? characterId = null,
        [Description("Optional: turnId of the chat entry this poll answers.")] long? replyToTurnId = null) =>
        api.SendAsync(HttpMethod.Post, $"/api/campaign/{campaignId}/chat/poll",
            new ChatPollCreateInfo { CharacterId = characterId, Question = question, Options = options, ReplyToTurnId = replyToTurnId });

    [McpServerTool(Name = "vote_chat_poll", Title = "Vote on a chat poll", ReadOnly = false, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("PUT", "/api/chat/{id}/vote")]
    [Description($$"""
        What it does: puts the voter's single vote on an option of a chat poll, moving it from the option it was on, or
        withdraws it (optionId omitted). The voter is one of your characters approved in the campaign (characterId) or,
        omitting it, the master's own vote. Each character and the master count once; votes are public and notify nobody.
        Who can use it: the owner of an approved character (as that character) or the campaign master (as "Mestre").
        Returns: the updated poll item. {{ITEM}}
        Common errors: 400 not a poll, deleted poll, option of another poll; 403 not your approved character / not the
        master without a character; 404 entry not found.
        Related tools: create_chat_poll, list_chat_messages.
        """)]
    public static Task<CallToolResult> VoteChatPoll(
        Roll6ApiClient api,
        [Description("Id of the poll (turnId from list_chat_messages or create_chat_poll).")] long turnId,
        [Description("optionId from the poll's options; omit to withdraw the vote.")] long? optionId = null,
        [Description("Optional: the voting character (yours, approved). Omit to vote as the master.")] long? characterId = null) =>
        api.SendAsync(HttpMethod.Put, $"/api/chat/{turnId}/vote", new ChatPollVoteInfo { CharacterId = characterId, OptionId = optionId });

    [McpServerTool(Name = "react_to_chat_message", Title = "React to a chat entry", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("PUT", "/api/chat/{id}/reaction")]
    [Description($$"""
        What it does: sets your reaction to a chat entry — "like" (Curtir, thumbs up), "love" (Amei, heart) or "laugh"
        (Gargalhada, laughing face) — switching the one you had, or removes it (kind omitted, or the same kind again). One
        reaction per person and entry. Works on messages, photos, audios, rolls, polls, actions and narrations. Reactions
        notify nobody.
        Who can use it: the campaign master or a player with an approved character.
        Returns: the updated item. {{ITEM}}
        Common errors: 400 not reactable (moves, changes, dividers, pokes, deleted) or unknown kind, 403 no access, 404 not found.
        Related tools: list_chat_messages.
        """)]
    public static Task<CallToolResult> ReactToChatMessage(
        Roll6ApiClient api,
        [Description("Id of the item (turnId from list_chat_messages).")] long turnId,
        [Description("\"like\", \"love\" or \"laugh\"; omit to remove your reaction.")] string? kind = null) =>
        api.SendAsync(HttpMethod.Put, $"/api/chat/{turnId}/reaction", new ChatReactInfo { Kind = kind });

    [McpServerTool(Name = "convert_chat_entry", Title = "Convert a message into an action or back", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/chat/{id}/convert")]
    [Description($$"""
        What it does: to = "action" turns a text message a character said in the current turn into that character's
        action of the turn (its previous action becomes "Ação cancelada"; the master is notified like act_in_turn); to =
        "message" turns the character's valid action of the current turn back into a text message (the character no
        longer has an action). The entry keeps its time, quote and reactions. A character has one valid action per turn.
        Who can use it: the character's owner or the campaign master.
        Returns: the updated item. {{ITEM}}
        Common errors: 400 not a text/action of a character, another turn, text over 2000 characters, the character has no
        piece on the campaign's current map; 403 not the owner nor the master; 404 not found.
        Related tools: act_in_turn, list_chat_messages, get_turn_data.
        """)]
    public static Task<CallToolResult> ConvertChatEntry(
        Roll6ApiClient api,
        [Description("Id of the item (turnId from list_chat_messages).")] long turnId,
        [Description("\"action\" (text → the character's action) or \"message\" (action → text).")] string to) =>
        api.SendAsync(HttpMethod.Post, $"/api/chat/{turnId}/convert", new ChatConvertInfo { To = to });

    [McpServerTool(Name = "delete_chat_message", Title = "Delete chat message", ReadOnly = false, Idempotent = true, Destructive = true, OpenWorld = false)]
    [ApiOperation("DELETE", "/api/chat/{id}")]
    [Description($$"""
        What it does: deletes a chat message (text, photo, audio or a dice roll — rolls only by the master) or a narration
        (an action is cancelled instead: it stays as "Ação cancelada" — its owner or the master); everyone then sees "Mensagem
        apagada" and a deleted narration also leaves the turn summary and narration. Moves, actions, results and
        changes can't be deleted here (use reset_turn or delete_turn_entry). {{McpDocs.DESTRUCTIVE}}
        Who can use it: the author of the message, or the campaign master (any message and narrations).
        Returns: { ok: true }.
        Common errors: 400 a turn record that isn't a message or a narration, 403 not the author nor the master, 404 not found.
        Related tools: list_chat_messages (turnId of the item).
        """)]
    public static Task<CallToolResult> DeleteChatMessage(
        Roll6ApiClient api,
        [Description("Id of the item (turnId from list_chat_messages).")] long turnId) =>
        api.SendAsync(HttpMethod.Delete, $"/api/chat/{turnId}");
}
