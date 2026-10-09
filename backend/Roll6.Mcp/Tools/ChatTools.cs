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
        canDelete }. kind is text | image | audio (what people said), movement | action | actionResult |
        characterUpdate | narration (the turn records — text is the same line as get_turn_summary) or turnFinished
        (the divider "Turno N finalizado").
        """;

    [McpServerTool(Name = "list_chat_messages", Title = "List chat messages", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/campaign/{id}/chat")]
    [Description($$"""
        What it does: reads the campaign chat. The chat IS the campaign's timeline: what the players and the master
        said (text, photo, audio), every turn record (moves, actions, action results, character/NPC changes,
        narrations) and a "Turno N finalizado" divider at the end of each turn — the same records the turn tools read.
        Without a cursor it returns the newest page; pass "before" with the first item's cursor to go back in time, or
        "after" with the last item's cursor to get what came next. Items are oldest first within the page.
        Who can use it: the campaign master or a player with an approved character in the campaign.
        Returns: { items, hasMore, unreadCount, firstUnreadCursor }.
        {{ITEM}}
        Common errors: 400 malformed cursor, 403 no access to the campaign, 404 campaign not found.
        Related tools: send_chat_message, get_turn_summary, get_turn_data.
        """)]
    public static Task<CallToolResult> ListChatMessages(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId,
        [Description("Optional: cursor of the first item you have, to read older items.")] string? before = null,
        [Description("Optional: cursor of the last item you have, to read newer items.")] string? after = null,
        [Description("Optional: how many items (1–100, default 50).")] int? limit = null) =>
        api.SendAsync(HttpMethod.Get, $"/api/campaign/{campaignId}/chat", null, ("before", before), ("after", after), ("limit", limit));

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
        [Description("Optional: fileName returned by upload_image, to send a photo.")] string? image = null) =>
        api.SendAsync(HttpMethod.Post, $"/api/campaign/{campaignId}/chat",
            new ChatSendInfo { CharacterId = characterId, Text = text, Image = image });

    [McpServerTool(Name = "delete_chat_message", Title = "Delete chat message", ReadOnly = false, Idempotent = true, Destructive = true, OpenWorld = false)]
    [ApiOperation("DELETE", "/api/chat/{id}")]
    [Description($$"""
        What it does: deletes a chat message (text, photo or audio) or a narration; everyone then sees "Mensagem
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
