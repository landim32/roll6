using System.ComponentModel;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using Roll6.DTO.Push;

namespace Roll6.Mcp.Tools;

/// <summary>
/// The table's notifications (043): poking who hasn't acted and muting campaigns. Turning notifications on for a
/// device is a browser thing (login session) and has no tool.
/// </summary>
[McpServerToolType]
public static class NotificationTools
{
    [McpServerTool(Name = "poke_players", Title = "Poke players", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/campaign/{id}/poke")]
    [Description("""
        What it does: pokes the players whose characters have not registered an action in the current turn. Each of them
        gets a notification "{your first name} está cutucando você" (on the phone, or a toast if the campaign is open on
        their screen) and everyone sees a gray line in the chat, "{you} cutucou Ana e Bruno". Nobody missing → nothing is
        sent and poked = 0. The same person can poke at most once a minute per campaign.
        Who can use it: the campaign master or a player with an approved character in the campaign.
        Returns: { poked, names, item } — how many players, their first names and the chat line (null when nobody).
        Common errors: 403 no access to the campaign, 404 campaign not found, 409 "Aguarde um minuto para cutucar de novo.".
        Related tools: get_turn_state, list_chat_messages, finish_turn.
        """)]
    public static Task<CallToolResult> PokePlayers(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId) =>
        api.SendAsync(HttpMethod.Post, $"/api/campaign/{campaignId}/poke", new { });

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
        actions (master), "Falta apenas você", turn finished, PV/Fadiga changes and pokes of that campaign.
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
