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

    [McpServerTool(Name = "update_campaign_npc", Title = "Classify campaign NPC", ReadOnly = false, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("PUT", "/api/campaignnpc/{id}")]
    [Description("""
        What it does: sets the category of an NPC in a campaign — 1 Inimigo (enemy), 2 Neutro (neutral), 3 Aliado (ally)
        — and, for allies only, its master character: an approved character of the campaign whose current owner then
        commands every occurrence of the NPC in this campaign (act_in_turn, reset_turn, move_map_token, set_piece_posture,
        and life/energy/status/posture through update_map_npc). Enemies and neutrals stay in the NPC panel; allies show on
        the party's side (under their master character when they have one) and their pieces get the ally color. Any
        category other than ally clears the master; the master is also cleared when that character is denied, removed
        from the campaign or deleted. Same values = nothing changes.
        Who can use it: only the master of the campaign, in any campaign status.
        Returns: the campaign NPC (same fields as list_campaign_npcs, with category, masterCampaignCharacterId and
        masterCharacterId).
        Common errors: 400 category outside 1–3, 400 masterCampaignCharacterId on a non-ally ("Só aliados podem ter um
        personagem-mestre.") or not an approved participation of this campaign, 403 not the master, 404 not found.
        Related tools: list_campaign_npcs (campaignNpcId), list_campaign_characters (campaignCharacterId of approved
        characters), list_map_tokens (npcCategory, commanderUserId).
        """)]
    public static Task<CallToolResult> UpdateCampaignNpc(
        Roll6ApiClient api,
        [Description("Id of the campaign NPC (campaignNpcId from list_campaign_npcs — not the npcId).")] long campaignNpcId,
        [Description("1 Inimigo (enemy), 2 Neutro (neutral), 3 Aliado (ally).")] int category,
        [Description("Only for allies: campaignCharacterId of an approved character of this campaign whose owner commands the ally. Omit or null = no master.")] long? masterCampaignCharacterId = null) =>
        api.SendAsync(HttpMethod.Put, $"/api/campaignnpc/{campaignNpcId}", new CampaignNpcUpdateInfo
        {
            Category = category,
            MasterCampaignCharacterId = masterCampaignCharacterId
        });

    [McpServerTool(Name = "remove_npc_from_campaign", Title = "Remove NPC from campaign", ReadOnly = false, Idempotent = false, Destructive = true, OpenWorld = false)]
    [ApiOperation("DELETE", "/api/campaignnpc/{id}")]
    [Description($$"""
        What it does: removes an NPC from a campaign together with all its occurrences and pieces on the campaign's maps.
        What the occurrences did stays in the chat and the turn summary under their names (051). The library NPC is kept.
        To take a single occurrence off a map use delete_map_npc. {{McpDocs.DESTRUCTIVE}}
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
