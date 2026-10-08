using System.ComponentModel;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using Roll6.DTO.CampaignCharacter;

namespace Roll6.Mcp.Tools;

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
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId,
        [Description("Id of the current user's character (characterId from list_my_characters).")] long characterId) =>
        api.SendAsync(HttpMethod.Post, "/api/campaigncharacter/request", new CampaignCharacterRequestInfo { CampaignId = campaignId, CharacterId = characterId });

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
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId,
        [Description("Id of the character to invite (characterId from search_characters).")] long characterId) =>
        api.SendAsync(HttpMethod.Post, "/api/campaigncharacter/invite", new CampaignCharacterRequestInfo { CampaignId = campaignId, CharacterId = characterId });

    [McpServerTool(Name = "list_my_invites", Title = "List my invites", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/campaigncharacter/invites")]
    [Description("""
        What it does: lists the pending campaign invites of the current user's characters.
        Who can use it: any authenticated user.
        Returns: [participation with status 1 Invited, including campaignName and campaignOwnerName].
        Common errors: none.
        Related tools: accept_invite, decline_invite.
        """)]
    public static Task<CallToolResult> ListMyInvites(
        Roll6ApiClient api) =>
        api.SendAsync(HttpMethod.Get, "/api/campaigncharacter/invites");

    [McpServerTool(Name = "accept_invite", Title = "Accept invite", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/campaigncharacter/{id}/accept")]
    [Description($$"""
        What it does: accepts a campaign invite; the character becomes approved (current life/energy reset to the totals,
        status cleared and standing, and the campaign sheet and its file re-copied from the character).
        Who can use it: the owner of the invited character.
        {{RETURNS}}
        Common errors: 403 not your character, 404 not found, 409 not an open invite.
        Related tools: list_my_invites.
        """)]
    public static Task<CallToolResult> AcceptInvite(
        Roll6ApiClient api,
        [Description(McpDocs.PARTICIPATION_ID)] long campaignCharacterId) =>
        api.SendAsync(HttpMethod.Post, $"/api/campaigncharacter/{campaignCharacterId}/accept");

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
        Roll6ApiClient api,
        [Description(McpDocs.PARTICIPATION_ID)] long campaignCharacterId) =>
        api.SendAsync(HttpMethod.Post, $"/api/campaigncharacter/{campaignCharacterId}/decline");

    [McpServerTool(Name = "approve_access_request", Title = "Approve access request", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/campaigncharacter/{id}/approve")]
    [Description($$"""
        What it does: approves a character's access request; it joins the party (current life/energy reset to the totals,
        status cleared and standing, and the campaign sheet and its file re-copied from the character).
        Who can use it: only the master.
        {{RETURNS}}
        Common errors: 403 not the master, 404 not found, 409 not a pending request.
        Related tools: list_campaign_characters (status 2 = requested), place_character_on_map.
        """)]
    public static Task<CallToolResult> ApproveAccessRequest(
        Roll6ApiClient api,
        [Description(McpDocs.PARTICIPATION_ID)] long campaignCharacterId) =>
        api.SendAsync(HttpMethod.Post, $"/api/campaigncharacter/{campaignCharacterId}/approve");

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
        Roll6ApiClient api,
        [Description(McpDocs.PARTICIPATION_ID)] long campaignCharacterId) =>
        api.SendAsync(HttpMethod.Post, $"/api/campaigncharacter/{campaignCharacterId}/deny");

    [McpServerTool(Name = "list_my_participations", Title = "List my participations", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/campaigncharacter/mine")]
    [Description("""
        What it does: lists the participations of the current user's characters in one campaign (any status) — e.g. to see
        whether a request was approved.
        Who can use it: any authenticated user.
        Returns: [participation], each with currentMove (how far the character may move per turn in this campaign) and
        characterMove (the character's permanent move).
        Common errors: 404 campaign not found.
        Related tools: request_campaign_access.
        """)]
    public static Task<CallToolResult> ListMyParticipations(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId) =>
        api.SendAsync(HttpMethod.Get, "/api/campaigncharacter/mine", null, ("campaignId", campaignId));

    [McpServerTool(Name = "get_participation", Title = "Get participation", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/campaigncharacter/{id}")]
    [Description("""
        What it does: returns one participation with the campaign's own copy of the character's sheet (`sheet`, markdown)
        and of its sheet file (`sheetFile`/`sheetFileUrl`/`sheetFileType`). The copy is made when the character joins and
        from then on changes only here; `characterSheet` is the character's original sheet, read-only.
        Who can use it: the master, the character's owner and approved participants of the campaign.
        Returns: the participation plus sheet (this campaign's sheet), sheetFile/sheetFileUrl/sheetFileType (this
        campaign's sheet file), characterSheet (the character's own sheet, read-only here),
        characterTokenName/characterTokenImageUrl, currentMove (the Deslocamento: movement points per turn on this
        campaign's maps, the player's limit) and characterMove (the character's permanent move, where currentMove starts).
        Common errors: 403 not allowed, 404 not found.
        Related tools: update_participation.
        """)]
    public static Task<CallToolResult> GetParticipation(
        Roll6ApiClient api,
        [Description(McpDocs.PARTICIPATION_ID)] long campaignCharacterId) =>
        api.SendAsync(HttpMethod.Get, $"/api/campaigncharacter/{campaignCharacterId}");

    [McpServerTool(Name = "update_participation", Title = "Update participation", ReadOnly = false, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("PUT", "/api/campaigncharacter/{id}")]
    [Description("""
        What it does: changes the campaign values of an approved character: current life and energy (up to the totals;
        0 or less is allowed and does not change posture), optionally the Deslocamento (`currentMove`, how many movement
        points the player may spend per turn with this character on this campaign's maps — e.g. lower it for a wounded
        character; the character's own move never changes), free-text status (e.g. "poisoned"), optionally the posture
        (standing, down or out of combat), the campaign sheet (`sheet`) and its sheet file (`sheetFile`). The campaign
        sheet is this campaign's own copy of the character's sheet, made when the character joined: write the
        character's full sheet as it stands here, not only the differences. Neither the character's sheet nor its sheet
        file ever changes through this tool. Optionally sets the character's token (saved on the character, used when it
        is placed on any map; the master's only change to someone else's character). The character's pieces show these
        values at once for everyone.
        Who can use it: the character's owner or the master.
        Returns: the updated participation plus sheet, sheetFile/sheetFileUrl/sheetFileType.
        Common errors: 403 not allowed, 404 participation or token not found, 400 above the totals, a negative
        currentMove, too long or an invalid sheetFile, 409 not approved.
        Related tools: get_participation (read current values first), upload_document, list_tokens.
        """)]
    public static Task<CallToolResult> UpdateParticipation(
        Roll6ApiClient api,
        [Description(McpDocs.PARTICIPATION_ID)] long campaignCharacterId,
        [Description("Current life, at most totalLife; 0 or negative is allowed and does not change posture. Example: 6.")] int currentLife,
        [Description("Current energy, at most totalEnergy; may be 0 or negative. Example: 3.")] int currentEnergy,
        [Description("Free-text status shown on the character (up to 260 characters), e.g. \"poisoned\". Null clears it.")] string? characterStatus = null,
        [Description(McpDocs.CAMPAIGN_SHEET)] string? sheet = null,
        [Description("Optional new token for the character (tokenId from list_tokens); null keeps the current token.")] long? tokenId = null,
        [Description(McpDocs.POSTURE_OPTIONAL)] int? posture = null,
        [Description(McpDocs.CAMPAIGN_SHEET_FILE_OPTIONAL)] string? sheetFile = null,
        [Description("Optional Deslocamento: movement points this character may spend per turn on this campaign's maps; 0 or more, may exceed the character's move. Null keeps the current value. Example: 1.")] int? currentMove = null) =>
        api.SendAsync(HttpMethod.Put, $"/api/campaigncharacter/{campaignCharacterId}", new CampaignCharacterUpdateInfo
        {
            CurrentLife = currentLife, CurrentEnergy = currentEnergy, CharacterStatus = characterStatus, Sheet = sheet, TokenId = tokenId,
            Posture = posture, SheetFile = sheetFile, CurrentMove = currentMove
        });

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
        Roll6ApiClient api,
        [Description(McpDocs.PARTICIPATION_ID)] long campaignCharacterId) =>
        api.SendAsync(HttpMethod.Delete, $"/api/campaigncharacter/{campaignCharacterId}");
}
