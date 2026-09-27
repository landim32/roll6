using System.ComponentModel;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using Roll6.DTO.CampaignNpc;

namespace Roll6.Mcp.Tools;

/// <summary>NPCs available in a campaign (020). Mirrors CampaignNpcController: master only.</summary>
[McpServerToolType]
public static class CampaignNpcTools
{
    [McpServerTool(Name = "add_npc_to_campaign", Title = "Add NPC to campaign", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/campaignnpc")]
    [Description("""
        What it does: makes one of the master's library NPCs available in a campaign (then place it on maps with
        place_npc_on_map; players see it in the NPC panel).
        Who can use it: only the master of the campaign, with an NPC of his own library.
        Returns: { campaignNpcId, campaignId, npcId, name, tokenId, tokenImageUrl, imageUrl, life, energy, move, createdAt }.
        Common errors: 403 not the master or not your NPC, 404 not found, 409 already in the campaign.
        Related tools: list_my_npcs, create_npc, place_npc_on_map, list_campaign_npcs.
        """)]
    public static Task<CallToolResult> AddNpcToCampaign(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId,
        [Description("Id of the master's library NPC (npcId from list_my_npcs).")] long npcId) =>
        api.SendAsync(HttpMethod.Post, "/api/campaignnpc", new CampaignNpcInsertInfo { CampaignId = campaignId, NpcId = npcId });

    [McpServerTool(Name = "remove_npc_from_campaign", Title = "Remove NPC from campaign", ReadOnly = false, Idempotent = false, Destructive = true, OpenWorld = false)]
    [ApiOperation("DELETE", "/api/campaignnpc/{id}")]
    [Description($$"""
        What it does: removes an NPC from a campaign together with all its occurrences and pieces on the campaign's maps
        (and their turn entries). The library NPC is kept. {{McpDocs.DESTRUCTIVE}}
        Who can use it: only the master.
        Returns: { ok: true }.
        Common errors: 403 not the master, 404 not found.
        Related tools: list_campaign_npcs (campaignNpcId).
        """)]
    public static Task<CallToolResult> RemoveNpcFromCampaign(
        Roll6ApiClient api,
        [Description("Id of the campaign NPC (campaignNpcId from list_campaign_npcs — not the npcId).")] long campaignNpcId) =>
        api.SendAsync(HttpMethod.Delete, $"/api/campaignnpc/{campaignNpcId}");
}
