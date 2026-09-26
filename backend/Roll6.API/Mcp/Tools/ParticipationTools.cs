using System.ComponentModel;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using Roll6.Domain.Interfaces;
using Roll6.DTO.CampaignCharacter;

namespace Roll6.API.Mcp.Tools;

/// <summary>Characters' participation in campaigns (020). Mirrors CampaignCharacterController.</summary>
[McpServerToolType]
public static class ParticipationTools
{
    private const string RETURNS = """
        Returns: the participation { campaignCharacterId, campaignId, campaignName, characterId, characterName, status
        (1 Invited, 2 RequestedAccess, 3 Approved, 4 Denied), currentLife, currentEnergy, totalLife, totalEnergy, … }.
        """;

    [McpServerTool(Name = "request_campaign_access", Title = "Request campaign access", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/campaigncharacter/request")]
    [Description($$"""
        What it does: asks to join a campaign with one of the current user's characters. Open campaigns (and the master's
        own characters) are approved at once; closed ones wait for approve_access_request.
        Who can use it: the owner of the character.
        {{RETURNS}}
        Common errors: 403 not your character, 404 campaign/character not found, 409 already participating or pending.
        Related tools: list_campaigns, list_my_characters, list_my_participations.
        """)]
    public static Task<CallToolResult> RequestCampaignAccess(
        ICampaignCharacterService participations, IHttpContextAccessor http,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId,
        [Description("Id of the current user's character (characterId from list_my_characters).")] long characterId) =>
        McpToolRunner.RunAsync(() => participations.RequestAccessAsync(McpUser.Id(http),
            new CampaignCharacterRequestInfo { CampaignId = campaignId, CharacterId = characterId }));

    [McpServerTool(Name = "invite_character", Title = "Invite character", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/campaigncharacter/invite")]
    [Description($$"""
        What it does: invites another user's character to the campaign (the owner accepts or declines). Inviting a
        character that had requested access approves it.
        Who can use it: only the master.
        {{RETURNS}}
        Common errors: 403 not the master, 404 campaign/character not found, 409 already participating.
        Related tools: search_characters, list_campaign_characters.
        """)]
    public static Task<CallToolResult> InviteCharacter(
        ICampaignCharacterService participations, IHttpContextAccessor http,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId,
        [Description("Id of the character to invite (characterId from search_characters).")] long characterId) =>
        McpToolRunner.RunAsync(() => participations.InviteAsync(McpUser.Id(http),
            new CampaignCharacterRequestInfo { CampaignId = campaignId, CharacterId = characterId }));

    [McpServerTool(Name = "list_my_invites", Title = "List my invites", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/campaigncharacter/invites")]
    [Description("""
        What it does: lists the pending campaign invites of the current user's characters.
        Who can use it: any authenticated user.
        Returns: [participation with status 1 Invited, including campaignName and campaignOwnerName].
        Common errors: none.
        Related tools: accept_invite, decline_invite.
        """)]
    public static Task<CallToolResult> ListMyInvites(ICampaignCharacterService participations, IHttpContextAccessor http) =>
        McpToolRunner.RunAsync(() => participations.ListInvitesAsync(McpUser.Id(http)));

    [McpServerTool(Name = "accept_invite", Title = "Accept invite", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/campaigncharacter/{id}/accept")]
    [Description($$"""
        What it does: accepts a campaign invite; the character becomes approved (current life/energy reset to the totals
        and the sheet copied to the campaign).
        Who can use it: the owner of the invited character.
        {{RETURNS}}
        Common errors: 403 not your character, 404 not found, 409 not an open invite.
        Related tools: list_my_invites.
        """)]
    public static Task<CallToolResult> AcceptInvite(
        ICampaignCharacterService participations, IHttpContextAccessor http,
        [Description(McpDocs.PARTICIPATION_ID)] long campaignCharacterId) =>
        McpToolRunner.RunAsync(() => participations.AcceptInviteAsync(McpUser.Id(http), campaignCharacterId));

    [McpServerTool(Name = "decline_invite", Title = "Decline invite", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/campaigncharacter/{id}/decline")]
    [Description($$"""
        What it does: declines a campaign invite.
        Who can use it: the owner of the invited character.
        {{RETURNS}}
        Common errors: 403 not your character, 404 not found, 409 not an open invite.
        Related tools: list_my_invites.
        """)]
    public static Task<CallToolResult> DeclineInvite(
        ICampaignCharacterService participations, IHttpContextAccessor http,
        [Description(McpDocs.PARTICIPATION_ID)] long campaignCharacterId) =>
        McpToolRunner.RunAsync(() => participations.DeclineInviteAsync(McpUser.Id(http), campaignCharacterId));

    [McpServerTool(Name = "approve_access_request", Title = "Approve access request", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/campaigncharacter/{id}/approve")]
    [Description($$"""
        What it does: approves a character's access request; it joins the party (current life/energy reset to the totals,
        sheet copied to the campaign).
        Who can use it: only the master.
        {{RETURNS}}
        Common errors: 403 not the master, 404 not found, 409 not a pending request.
        Related tools: list_campaign_characters (status 2 = requested), place_character_on_map.
        """)]
    public static Task<CallToolResult> ApproveAccessRequest(
        ICampaignCharacterService participations, IHttpContextAccessor http,
        [Description(McpDocs.PARTICIPATION_ID)] long campaignCharacterId) =>
        McpToolRunner.RunAsync(() => participations.ApproveRequestAsync(McpUser.Id(http), campaignCharacterId));

    [McpServerTool(Name = "deny_access_request", Title = "Deny access request", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/campaigncharacter/{id}/deny")]
    [Description($$"""
        What it does: denies a character's access request.
        Who can use it: only the master.
        {{RETURNS}}
        Common errors: 403 not the master, 404 not found, 409 not a pending request.
        Related tools: list_campaign_characters.
        """)]
    public static Task<CallToolResult> DenyAccessRequest(
        ICampaignCharacterService participations, IHttpContextAccessor http,
        [Description(McpDocs.PARTICIPATION_ID)] long campaignCharacterId) =>
        McpToolRunner.RunAsync(() => participations.DenyRequestAsync(McpUser.Id(http), campaignCharacterId));

    [McpServerTool(Name = "list_my_participations", Title = "List my participations", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/campaigncharacter/mine")]
    [Description("""
        What it does: lists the participations of the current user's characters in one campaign (any status) — e.g. to see
        whether a request was approved.
        Who can use it: any authenticated user.
        Returns: [participation].
        Common errors: 404 campaign not found.
        Related tools: request_campaign_access.
        """)]
    public static Task<CallToolResult> ListMyParticipations(
        ICampaignCharacterService participations, IHttpContextAccessor http,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId) =>
        McpToolRunner.RunAsync(() => participations.ListMineAsync(McpUser.Id(http), campaignId));

    [McpServerTool(Name = "get_participation", Title = "Get participation", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/campaigncharacter/{id}")]
    [Description("""
        What it does: returns one participation with the campaign sheet (markdown) of the character.
        Who can use it: the master, the character's owner and approved participants of the campaign.
        Returns: the participation plus sheet.
        Common errors: 403 not allowed, 404 not found.
        Related tools: update_participation.
        """)]
    public static Task<CallToolResult> GetParticipation(
        ICampaignCharacterService participations, IHttpContextAccessor http,
        [Description(McpDocs.PARTICIPATION_ID)] long campaignCharacterId) =>
        McpToolRunner.RunAsync(() => participations.GetByIdAsync(McpUser.Id(http), campaignCharacterId));

    [McpServerTool(Name = "update_participation", Title = "Update participation", ReadOnly = false, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("PUT", "/api/campaigncharacter/{id}")]
    [Description("""
        What it does: changes the campaign values of an approved character: current life and energy (up to the totals;
        0 or less = fallen), free-text status (e.g. "poisoned") and the campaign sheet. The character's pieces show them at
        once for everyone.
        Who can use it: the character's owner or the master.
        Returns: the updated participation plus sheet.
        Common errors: 403 not allowed, 404 not found, 400 above the totals or too long, 409 not approved.
        Related tools: get_participation (read current values first).
        """)]
    public static Task<CallToolResult> UpdateParticipation(
        ICampaignCharacterService participations, IHttpContextAccessor http,
        [Description(McpDocs.PARTICIPATION_ID)] long campaignCharacterId,
        [Description("Current life, at most totalLife; 0 or negative means fallen. Example: 6.")] int currentLife,
        [Description("Current energy, at most totalEnergy; may be 0 or negative. Example: 3.")] int currentEnergy,
        [Description("Free-text status shown on the character (up to 260 characters), e.g. \"poisoned\". Null clears it.")] string? characterStatus = null,
        [Description("Campaign sheet in markdown (up to 20000 characters). Send the current sheet to keep it.")] string? sheet = null) =>
        McpToolRunner.RunAsync(() => participations.UpdateAsync(McpUser.Id(http), campaignCharacterId, new CampaignCharacterUpdateInfo
        {
            CurrentLife = currentLife, CurrentEnergy = currentEnergy, CharacterStatus = characterStatus, Sheet = sheet
        }));

    [McpServerTool(Name = "remove_participation", Title = "Remove character from campaign", ReadOnly = false, Idempotent = false, Destructive = true, OpenWorld = false)]
    [ApiOperation("DELETE", "/api/campaigncharacter/{id}")]
    [Description($$"""
        What it does: removes a character from the campaign (its pieces on the campaign maps too); the character itself is
        kept. {{McpDocs.DESTRUCTIVE}}
        Who can use it: only the master.
        Returns: { ok: true }.
        Common errors: 403 not the master, 404 not found.
        Related tools: list_campaign_characters.
        """)]
    public static Task<CallToolResult> RemoveParticipation(
        ICampaignCharacterService participations, IHttpContextAccessor http,
        [Description(McpDocs.PARTICIPATION_ID)] long campaignCharacterId) =>
        McpToolRunner.RunAsync(() => participations.RemoveAsync(McpUser.Id(http), campaignCharacterId));
}
