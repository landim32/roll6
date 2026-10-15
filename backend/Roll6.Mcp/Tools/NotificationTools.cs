using System.ComponentModel;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using Roll6.DTO.Push;

namespace Roll6.Mcp.Tools;

/// <summary>
/// The table's notifications (043, 074): poking who hasn't acted, muting campaigns and the master's simulation and
/// preview. Turning notifications on for a device and testing it are browser things (login session) and have no tool.
/// </summary>
[McpServerToolType]
public static class NotificationTools
{
    [McpServerTool(Name = "poke_players", Title = "Poke players", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/campaign/{id}/poke")]
    [Description("""
        What it does: pokes the players whose characters have not registered an action in the current turn. Each of them
        gets a push notification "{your first name} está cutucando você" on every device and everyone sees a gray line
        in the chat, "{you} cutucou Ana e Bruno". When nobody else is missing, a player's poke goes to the master instead
        ("{you} está cutucando você: todos já agiram", chat line "{you} cutucou o mestre", master = true); the master's
        poke with nobody missing sends nothing (poked = 0). The same person can poke at most once every 30 minutes per campaign.
        Who can use it: the campaign master or a player with an approved character in the campaign.
        Returns: { poked, master, names, item } — how many were poked, whether it was the master, their first names and
        the chat line (null when nobody).
        Common errors: 403 no access to the campaign, 404 campaign not found, 409 "Você só pode cutucar a cada 30 minutos. Tente de novo em 12 min." (the minutes left).
        Related tools: get_turn_state, list_chat_messages, finish_turn.
        """)]
    public static Task<CallToolResult> PokePlayers(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId) =>
        api.SendAsync(HttpMethod.Post, $"/api/campaign/{campaignId}/poke", new { });

    [McpServerTool(Name = "simulate_notification", Title = "Simulate a notification", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/campaign/{id}/notifications/simulate")]
    [Description("""
        What it does: sends to YOUR OWN devices, right now, a push notification of the given kind exactly as the table
        would send it, with the real wording and the names of the campaign's table, titled "Teste · …". Use it to check
        that notifications reach you and how each kind reads. Nothing is stored (no bell entry, no chat line) and nobody
        else gets anything; the campaign status does not matter.
        Who can use it: only the campaign master.
        Returns: { devices [{ pushSubscriptionId, label, result }] } — result "sent", "gone" (the browser dropped that
        device; it was removed) or "failed". An empty list means you have no device with notifications turned on.
        Common errors: 400 kind unknown, 403 not the master, 404 campaign not found, 409 notifications are not configured
        on the server.
        Related tools: preview_turn_notices, poke_players, list_my_notifications.
        """)]
    public static Task<CallToolResult> SimulateNotification(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId,
        [Description("message (chat message), action (a character's action, the master's notice), pending (\"Falta apenas Bruno e você\"), pendingLast (\"Falta só você\"), turnFinished, life (PV), fatigue (Fadiga), poke or pokeMaster (a player poking the master).")] string kind) =>
        api.SendAsync(HttpMethod.Post, $"/api/campaign/{campaignId}/notifications/simulate", new NotificationSimulateInfo { Kind = kind });

    [McpServerTool(Name = "preview_turn_notices", Title = "Preview turn notices", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/campaign/{id}/notifications/preview")]
    [Description("""
        What it does: shows who still owes an action in the current turn and the "Falta…" notification each of those
        players would get with the next first action of a character: nothing before half of the approved characters
        acted, then "Falta apenas {others} e você", or "Falta só você" for the last one. Read only; nothing is sent.
        Who can use it: only the campaign master.
        Returns: { turnNo, approved, acted, threshold, majorityReached, pending [{ userId, name, characters, body }] } —
        body is null while the majority has not acted.
        Common errors: 403 not the master, 404 campaign not found.
        Related tools: simulate_notification, get_turn_state, poke_players.
        """)]
    public static Task<CallToolResult> PreviewTurnNotices(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId) =>
        api.SendAsync(HttpMethod.Get, $"/api/campaign/{campaignId}/notifications/preview");

    [McpServerTool(Name = "list_my_notifications", Title = "List my notifications", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/push/inbox")]
    [Description("""
        What it does: lists the latest notices you received (the bell of the app), newest first, exactly as the Web Push
        carried them: chat messages, polls, actions (to the master), "Falta apenas Bruno e você", turn finished, PV/Fadiga
        changes and pokes, with the campaign and a link to its chat. Reading them here does not mark them as read.
        Who can use it: any logged user (their own notices).
        Returns: { items [{ userNotificationId, campaignId, kind, title, body, url, createdAt, read }], unreadCount } —
        at most the 30 most recent.
        Common errors: none besides authentication.
        Related tools: list_notification_settings, list_chat_messages.
        """)]
    public static Task<CallToolResult> ListMyNotifications(Roll6ApiClient api) =>
        api.SendAsync(HttpMethod.Get, "/api/push/inbox");

    [McpServerTool(Name = "list_notification_settings", Title = "List notification settings", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/push/campaigns")]
    [Description("""
        What it does: lists the campaigns of your table (the ones you master or play with an approved character) and
        whether each one's notifications are muted for you. Muted campaigns send you no notification at all.
        Who can use it: any logged user (their own settings).
        Returns: items [{ campaignId, campaignName, slug, muted }].
        Common errors: none besides authentication.
        Related tools: set_campaign_notifications, list_my_table_campaigns.
        """)]
    public static Task<CallToolResult> ListNotificationSettings(Roll6ApiClient api) =>
        api.SendAsync(HttpMethod.Get, "/api/push/campaigns");

    [McpServerTool(Name = "set_campaign_notifications", Title = "Mute or unmute a campaign", ReadOnly = false, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("PUT", "/api/campaign/{id}/notifications")]
    [Description("""
        What it does: mutes (muted = true) or unmutes a campaign's notifications for you, on every device: chat messages,
        actions (master), "Falta…", turn finished, PV/Fadiga changes and pokes of that campaign.
        Who can use it: the campaign master or a player with an approved character in the campaign.
        Returns: { campaignId, campaignName, slug, muted }.
        Common errors: 403 not a participant, 404 campaign not found.
        Related tools: list_notification_settings.
        """)]
    public static Task<CallToolResult> SetCampaignNotifications(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId,
        [Description("true to mute the campaign's notifications for you, false to receive them again.")] bool muted) =>
        api.SendAsync(HttpMethod.Put, $"/api/campaign/{campaignId}/notifications", new CampaignNotificationUpdateInfo { Muted = muted });
}
