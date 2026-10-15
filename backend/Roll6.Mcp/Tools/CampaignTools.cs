using System.ComponentModel;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using Roll6.DTO.Campaign;
using Roll6.DTO.Turn;

namespace Roll6.Mcp.Tools;

/// <summary>Campaigns and what hangs from them (020). Mirrors CampaignController.</summary>
[McpServerToolType]
public static class CampaignTools
{
    private const string CAMPAIGN_FIELDS = """
        Campaign fields: campaignId, userId (the master), ownerName, name, slug (immutable URL slug), open (open campaigns
        approve access requests at once), currentTurn, currentMapId (the map players follow), createdAt, updatedAt.
        """;

    [McpServerTool(Name = "list_campaigns", Title = "List campaigns", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/campaign")]
    [Description($$"""
        What it does: lists campaigns of all users (to find one to join) or only the current user's (mine=true), paged and
        searchable by name.
        Who can use it: any authenticated user.
        Returns: { items: [campaign], page, pageSize, totalCount }. {{CAMPAIGN_FIELDS}}
        Common errors: none.
        Related tools: get_campaign, create_campaign, request_campaign_access.
        """)]
    public static Task<CallToolResult> ListCampaigns(
        Roll6ApiClient api,
        [Description(McpDocs.PAGE)] int page = 1,
        [Description(McpDocs.PAGE_SIZE)] int pageSize = 20,
        [Description(McpDocs.SEARCH)] string? search = null,
        [Description("true = only campaigns where the current user is the master; false (default) = all campaigns.")] bool mine = false) =>
        api.SendAsync(HttpMethod.Get, "/api/campaign", null, ("page", page), ("pageSize", pageSize), ("search", search), ("mine", mine));

    [McpServerTool(Name = "get_campaign", Title = "Get campaign", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/campaign/{id}")]
    [Description($$"""
        What it does: returns one campaign (public data: name, master, open/closed, current turn and current map).
        Who can use it: any authenticated user.
        Returns: the campaign. {{CAMPAIGN_FIELDS}}
        Common errors: 404 not found.
        Related tools: list_campaign_maps, list_campaign_characters, get_turn_state.
        """)]
    public static Task<CallToolResult> GetCampaign(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId) =>
        api.SendAsync(HttpMethod.Get, $"/api/campaign/{campaignId}");

    [McpServerTool(Name = "get_campaign_by_slug", Title = "Get campaign by slug", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/campaign/slug/{slug}")]
    [Description($$"""
        What it does: returns one campaign by its URL slug (the same public data as get_campaign).
        Who can use it: any authenticated user.
        Returns: the campaign. {{CAMPAIGN_FIELDS}}
        Common errors: 404 slug not found.
        Related tools: get_campaign, get_map_by_slug, list_my_table_campaigns.
        """)]
    public static Task<CallToolResult> GetCampaignBySlug(
        Roll6ApiClient api,
        [Description(McpDocs.SLUG)] string slug) =>
        api.SendAsync(HttpMethod.Get, $"/api/campaign/slug/{slug}");

    [McpServerTool(Name = "list_my_table_campaigns", Title = "List my table campaigns", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/campaign/table")]
    [Description("""
        What it does: lists the campaigns where the current user is the master or has an approved character, each with
        the active map the table follows (omitted when there is no current map or it is archived or deleted).
        Who can use it: any authenticated user (the list is only their own table).
        Returns: [{ campaignId, name, slug, isMaster, currentMapId, currentMapName, currentMapSlug }].
        Common errors: none.
        Related tools: get_campaign_by_slug, get_map_by_slug, set_current_map.
        """)]
    public static Task<CallToolResult> ListMyTableCampaigns(Roll6ApiClient api) =>
        api.SendAsync(HttpMethod.Get, "/api/campaign/table");

    [McpServerTool(Name = "create_campaign", Title = "Create campaign", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/campaign")]
    [Description("""
        What it does: creates a campaign; the current user becomes its master.
        Who can use it: any authenticated user.
        Returns: the created campaign (turn 1, no current map).
        Common errors: 400 invalid name.
        Related tools: create_map_model, add_map_to_campaign, invite_character.
        """)]
    public static Task<CallToolResult> CreateCampaign(
        Roll6ApiClient api,
        [Description("Campaign name (required, up to 260 characters). Example: \"The Lost Mine\".")] string name,
        [Description("true = access requests are approved immediately; false (default) = the master approves each one.")] bool? open = null) =>
        api.SendAsync(HttpMethod.Post, "/api/campaign", new CampaignInsertInfo { Name = name, Open = open });

    [McpServerTool(Name = "rename_campaign", Title = "Rename campaign", ReadOnly = false, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("PUT", "/api/campaign/{id}/name")]
    [Description("""
        What it does: renames a campaign (everyone at the table sees it at once).
        Who can use it: only the master.
        Returns: the updated campaign.
        Common errors: 403 not the master, 404 not found, 400 invalid name.
        Related tools: set_campaign_open.
        """)]
    public static Task<CallToolResult> RenameCampaign(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId,
        [Description("New name (required, up to 260 characters).")] string name) =>
        api.SendAsync(HttpMethod.Put, $"/api/campaign/{campaignId}/name", new CampaignInsertInfo { Name = name });

    [McpServerTool(Name = "set_campaign_open", Title = "Open or close campaign", ReadOnly = false, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("PUT", "/api/campaign/{id}/open")]
    [Description("""
        What it does: opens (access requests approved at once) or closes (master approves each request) a campaign.
        Who can use it: only the master.
        Returns: the updated campaign.
        Common errors: 403 not the master, 404 not found.
        Related tools: approve_access_request.
        """)]
    public static Task<CallToolResult> SetCampaignOpen(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId,
        [Description("true = open campaign, false = closed campaign.")] bool open) =>
        api.SendAsync(HttpMethod.Put, $"/api/campaign/{campaignId}/open", new CampaignOpenInfo { Open = open });

    [McpServerTool(Name = "set_campaign_status", Title = "Set campaign status", ReadOnly = false, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("PUT", "/api/campaign/{id}/status")]
    [Description("""
        What it does: sets the campaign status — 1 Preparing ("Preparando", new campaigns start here), 2 Active ("Ativa"),
        3 Paused ("Pausada") or 4 Finished ("Finalizada"); any status can go to any other. Only an active campaign plays:
        otherwise acting, resetting, finishing/processing/setting the turn, poking and characters joining (request,
        invite, approve, accept) answer 409, and pieces/NPC occurrences/new campaign maps answer 409 too — except for
        the master while Preparing. The conversation chat (messages, photos, audios, dice rolls, polls, reactions)
        always works. Connected players see the change in real time.
        Who can use it: only the master.
        Returns: the updated campaign (status).
        Common errors: 400 status not 1–4, 403 not the master, 404 not found.
        Related tools: get_campaign, set_campaign_open.
        """)]
    public static Task<CallToolResult> SetCampaignStatus(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId,
        [Description("1 = Preparing, 2 = Active, 3 = Paused, 4 = Finished.")] int status) =>
        api.SendAsync(HttpMethod.Put, $"/api/campaign/{campaignId}/status", new CampaignStatusInfo { Status = status });

    [McpServerTool(Name = "set_campaign_free_mode", Title = "Set campaign free mode", ReadOnly = false, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("PUT", "/api/campaign/{id}/free-mode")]
    [Description("""
        What it does: switches the campaign's free mode (054) on or off. While it is on: every action of a character or NPC
        piece stays valid (act_in_turn and convert_chat_entry cancel nothing; the map balloon shows the last one, the
        summary and the turn data list them all); character and NPC pieces move any number of times per turn, without
        the Deslocamento limit and without a Movement entry (so there is no trail and nothing to undo); finish_turn
        finishes at once without the pending list; no "Falta apenas você…" notice goes out; reset_turn only cancels the
        actions and leaves the piece where it is. Nothing else changes: process_turn, set_current_turn, the turn number,
        the chat, pokes and the campaign status keep working as always, and the mode stays on after a turn finishes.
        Switching it never touches the turn: no confirmation, no finish, no cancellation — leaving free mode just brings
        the normal rules back from the next action or move of each actor. Connected participants see the change in
        real time.
        Shared walk (069): while it is on, players walk their own standing character in the 3D view and its piece follows
        hex by hex for everyone, passing through other pieces (it may stop on an occupied hex). Turning free mode off is
        therefore refused while two pieces of the campaign share a hex: move them apart first (move_map_token).
        Who can use it: only the master, in any campaign status (outside Active the turn stays frozen anyway).
        Returns: the updated campaign (freeMode).
        Common errors: 403 not the master, 404 not found, 409 on switching off while pieces share a hex ("Não é possível
        sair do modo livre: Aria e Borin estão no mesmo hex." — the names say which pieces to move).
        Related tools: get_campaign, finish_turn, act_in_turn, move_map_token, list_map_tokens, reset_turn, set_campaign_status.
        """)]
    public static Task<CallToolResult> SetCampaignFreeMode(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId,
        [Description("true = free mode on (several actions, unlimited unrecorded moves, no pending list); false = turn mode.")] bool freeMode) =>
        api.SendAsync(HttpMethod.Put, $"/api/campaign/{campaignId}/free-mode", new CampaignFreeModeInfo { FreeMode = freeMode });

    [McpServerTool(Name = "set_campaign_pending_notice", Title = "Set campaign pending notice", ReadOnly = false, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("PUT", "/api/campaign/{id}/pending-notice")]
    [Description("""
        What it does: shows or hides, in the app, the notice over the campaign chat — the blinking round pictures of
        the characters that still owe their play this turn (red border: neither moved nor acted; yellow: only moved).
        It is only a display flag of the campaign: it changes no rule, no turn and no notification. On by default; while
        on, it also shows in free mode (where only actions count, since moves are not recorded). It never shows while
        the campaign is not Active.
        Who can use it: only the master, in any campaign status.
        Returns: the updated campaign (pendingNotice).
        Common errors: 403 not the master, 404 not found.
        Related tools: get_campaign, set_campaign_free_mode, poke_players, get_turn_state.
        """)]
    public static Task<CallToolResult> SetCampaignPendingNotice(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId,
        [Description("true = show the pending pictures over the chat; false = hide them for everyone.")] bool pendingNotice) =>
        api.SendAsync(HttpMethod.Put, $"/api/campaign/{campaignId}/pending-notice", new CampaignPendingNoticeInfo { PendingNotice = pendingNotice });

    [McpServerTool(Name = "delete_campaign", Title = "Delete campaign", ReadOnly = false, Idempotent = false, Destructive = true, OpenWorld = false)]
    [ApiOperation("DELETE", "/api/campaign/{id}")]
    [Description($$"""
        What it does: deletes a campaign with its participations, campaign NPCs, plans and turn entries.
        {{McpDocs.DESTRUCTIVE}}
        Who can use it: only the master, and only when all its maps were deleted first (delete_map).
        Returns: { ok: true }.
        Common errors: 403 not the master, 404 not found, 409 the campaign still has active or archived maps.
        Related tools: list_campaign_maps, delete_map.
        """)]
    public static Task<CallToolResult> DeleteCampaign(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId) =>
        api.SendAsync(HttpMethod.Delete, $"/api/campaign/{campaignId}");

    [McpServerTool(Name = "set_current_map", Title = "Set current map", ReadOnly = false, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("PUT", "/api/campaign/{id}/current-map")]
    [Description("""
        What it does: sets the campaign map every player follows in the app — their screens switch to it in real time
        (the master's own screen does not move). This is the only way the current map changes: opening, creating or
        editing maps never does, so the master can prepare another map while the table plays on the current one.
        Who can use it: only the master.
        Returns: the updated campaign (currentMapId).
        Common errors: 403 not the master, 404 map/campaign not found, 400 the map is not an active map of this campaign
        (archived or deleted maps can't be current).
        Related tools: list_campaign_maps, add_map_to_campaign.
        """)]
    public static Task<CallToolResult> SetCurrentMap(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId,
        [Description("Map to follow (mapId of an active map of this campaign); null clears the current map.")] long? mapId) =>
        api.SendAsync(HttpMethod.Put, $"/api/campaign/{campaignId}/current-map", new CampaignCurrentMapInfo { MapId = mapId });

    [McpServerTool(Name = "list_campaign_maps", Title = "List campaign maps", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/campaign/{id}/map")]
    [Description("""
        What it does: lists the non-deleted maps of a campaign, paged.
        Who can use it: the master and approved participants.
        Returns: { items: [{ mapId, campaignId, mapModelId, mapModelName, mapModelImageUrl, gridWidth, gridHeight, imageWidth,
        imageHeight, imageTop, imageLeft, hexSize, userId, sequence, name, status (1 active, 2 archived), createdAt,
        updatedAt }], page, pageSize, totalCount }.
        Common errors: 403 not the master nor an approved participant, 404 campaign not found.
        Related tools: get_map, list_map_tokens, set_current_map.
        """)]
    public static Task<CallToolResult> ListCampaignMaps(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId,
        [Description(McpDocs.PAGE)] int page = 1,
        [Description(McpDocs.PAGE_SIZE)] int pageSize = 20) =>
        api.SendAsync(HttpMethod.Get, $"/api/campaign/{campaignId}/map", null, ("page", page), ("pageSize", pageSize));

    [McpServerTool(Name = "list_campaign_characters", Title = "List campaign characters", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/campaign/{id}/character")]
    [Description("""
        What it does: lists the characters in a campaign with their participation data (the party).
        Who can use it: the master (sees every status: invited, requested, approved, denied) and approved participants
        (see only approved characters).
        Returns: [{ campaignCharacterId, campaignId, campaignName, campaignOwnerName, characterId, characterName,
        characterImageUrl, characterOwnerId, characterOwnerName, status (1 Invited, 2 RequestedAccess, 3 Approved,
        4 Denied), currentLife, currentEnergy, totalLife, totalEnergy, characterMove, characterStatus, characterTokenId,
        createdAt, updatedAt }].
        Common errors: 403 not allowed, 404 campaign not found.
        Related tools: approve_access_request, get_participation, place_character_on_map.
        """)]
    public static Task<CallToolResult> ListCampaignCharacters(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId) =>
        api.SendAsync(HttpMethod.Get, $"/api/campaign/{campaignId}/character");

    [McpServerTool(Name = "list_campaign_npcs", Title = "List campaign NPCs", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/campaign/{id}/npc")]
    [Description("""
        What it does: lists the NPCs available in a campaign (the master's library NPCs added to it).
        Who can use it: the master and approved participants.
        Returns: [{ campaignNpcId, campaignId, npcId, name, tokenId, tokenImageUrl, imageUrl, life, energy, move, mapNpcCount
        (active occurrences across the campaign's maps), category (1 Inimigo, 2 Neutro, 3 Aliado), masterCampaignCharacterId
        and masterCharacterId (an ally's master character, null when none), createdAt }].
        Common errors: 403 not allowed, 404 campaign not found.
        Related tools: add_npc_to_campaign, update_campaign_npc, place_npc_on_map, list_map_npcs.
        """)]
    public static Task<CallToolResult> ListCampaignNpcs(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId) =>
        api.SendAsync(HttpMethod.Get, $"/api/campaign/{campaignId}/npc");

    [McpServerTool(Name = "list_campaign_plans", Title = "List campaign plans", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/campaign/{id}/plan")]
    [Description("""
        What it does: lists the entries of the campaign plan (the master's secret notes), without their text.
        Who can use it: only the master.
        Returns: [{ campaignPlanId, campaignId, title, createdAt, changedAt }] in creation order.
        Common errors: 403 not the master, 404 campaign not found.
        Related tools: get_campaign_plan, create_campaign_plan.
        """)]
    public static Task<CallToolResult> ListCampaignPlans(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId) =>
        api.SendAsync(HttpMethod.Get, $"/api/campaign/{campaignId}/plan");

    [McpServerTool(Name = "get_turn_state", Title = "Get turn state", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/campaign/{id}/turn")]
    [Description("""
        What it does: returns the turn in progress and its entries (moves, actions, action results), to know who already
        moved or acted.
        Who can use it: the master and approved participants.
        Returns: { turnNo, entries: [{ turnId, campaignId, mapId, turnNo, turnType (1 Movement, 2 Action, 3 ActionResult),
        characterId, npcId, mapNpcId, actorName, beforeX, beforeY, beforeLook, x, y, look, description, createdAt }] }.
        Common errors: 403 not allowed, 404 campaign not found.
        Related tools: act_in_turn, move_map_token, finish_turn, list_turn_entries.
        """)]
    public static Task<CallToolResult> GetTurnState(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId) =>
        api.SendAsync(HttpMethod.Get, $"/api/campaign/{campaignId}/turn");

    [McpServerTool(Name = "list_turn_entries", Title = "List turn entries", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/campaign/{id}/turn/{turnNo}")]
    [Description("""
        What it does: returns the entries of any turn of the campaign, in chronological order — use it to summarize what
        happened in a finished turn.
        Who can use it: the master and approved participants.
        Returns: [turn entry] (same fields as get_turn_state entries).
        Common errors: 403 not allowed, 404 campaign not found.
        Related tools: get_turn_state.
        """)]
    public static Task<CallToolResult> ListTurnEntries(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId,
        [Description("Turn number, starting at 1 (get_campaign.currentTurn is the one in progress). Example: 3.")] int turnNo) =>
        api.SendAsync(HttpMethod.Get, $"/api/campaign/{campaignId}/turn/{turnNo}");

    [McpServerTool(Name = "finish_turn", Title = "Finish turn", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/campaign/{id}/turn/finish")]
    [Description("""
        What it does: finishes the turn in progress and starts the next one; everyone gets a "turn finished" notification.
        Without force it only finishes when every approved character has acted — otherwise it returns who is missing and
        changes nothing. NPCs never block. In free mode (set_campaign_free_mode) it finishes at once, with no pending
        list, and the mode stays on for the next turn.
        Who can use it: only the master.
        Returns: { finished, pending: [character names], finishedTurn, turnNo (turn in progress after the call) }.
        Common errors: 403 not the master, 404 campaign not found.
        Related tools: get_turn_state, list_turn_entries.
        """)]
    public static Task<CallToolResult> FinishTurn(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId,
        [Description("true = finish even if some characters haven't acted; false (default) = only report who is missing.")] bool force = false) =>
        api.SendAsync(HttpMethod.Post, $"/api/campaign/{campaignId}/turn/finish", new TurnFinishInfo { Force = force });

    [McpServerTool(Name = "set_current_turn", Title = "Set current turn", ReadOnly = false, Idempotent = true, Destructive = true, OpenWorld = false)]
    [ApiOperation("PUT", "/api/campaign/{id}/turn/current")]
    [Description($$"""
        What it does: sets the turn in progress directly, to fix the campaign's turn counter (e.g. turns played outside the
        table, or a turn finished by mistake). Going forward works like finish_turn without the pending check: every
        skipped turn counts as finished and everyone gets a "turn finished" notification. Going back reopens that turn;
        when later turns have entries it is refused (409, listing the turns) unless discardLaterEntries is true, which
        deletes those entries in the same atomic call. The same number changes nothing. Pieces, characters and NPCs never
        change.
        {{McpDocs.DESTRUCTIVE}}
        Who can use it: only the master.
        Returns: { previousTurn, turnNo, discardedEntries }.
        Common errors: 400 turnNo below 1, 403 not the master, 404 campaign not found, 409 later turns have entries.
        Related tools: get_turn_state, finish_turn, get_turn_history, update_turn_entry, create_turn_entry.
        """)]
    public static Task<CallToolResult> SetCurrentTurn(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId,
        [Description("The new turn in progress (1 or more).")] int turnNo,
        [Description("Only when going back: true = delete the entries of the later turns; false (default) = refuse with 409 if there are any.")] bool discardLaterEntries = false) =>
        api.SendAsync(HttpMethod.Put, $"/api/campaign/{campaignId}/turn/current",
            new TurnSetCurrentInfo { TurnNo = turnNo, DiscardLaterEntries = discardLaterEntries });
}
