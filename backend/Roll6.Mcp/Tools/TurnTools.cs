using System.ComponentModel;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using Roll6.DTO.Turn;

namespace Roll6.Mcp.Tools;

/// <summary>Turn entries (020). Mirrors TurnController; reading the turn and finishing it are campaign tools.</summary>
[McpServerToolType]
public static class TurnTools
{
    private const string ENTRY = """
        Returns: the entry { turnId, campaignId, mapId, turnNo, turnType (1 Movement, 2 Action, 3 ActionResult,
        4 CharacterUpdate, 5 Narration), characterId, npcId, mapNpcId, actorName, userId, userName, beforeX, beforeY,
        beforeLook, x, y, look, moved, description, changes, target, createdAt }. target (098, actions declared with
        "Agir sobre…") = { x, y, distance (hexes from the actor's piece), mapTokenId | null (empty hex), kind
        character|npc|object, kindLabel, side self|ally|enemy|neutral|object, sideLabel, name, characterId, mapNpcId,
        look, lookName, posture, postureLabel, status, currentLife, totalLife, currentEnergy, totalEnergy, text } — a
        snapshot of the piece as it was when the action was declared (never re-read); null without a target or on a
        whispered action you are not in.
        """;

    [McpServerTool(Name = "act_in_turn", Title = "Act in turn", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/turn/action")]
    [Description($$"""
        What it does: records an action (free text, e.g. "attacks the goblin with the sword") for a character or NPC
        occurrence in the current turn. Name the actor in ONE of two ways: its piece (mapTokenId — a character or NPC
        piece), or, for a character that has no piece on any map, the campaign and the character (campaignId +
        characterId; NPCs always act through their piece). With a piece it shows as a speech balloon over it; without one
        it shows only in the chat. Either way it turns the character's status green. A
        new action cancels the actor's previous valid action of the turn ("Ação cancelada"), in any mode (free mode
        included): an actor has one valid action per turn. Notifications: the master gets every action that is not his
        own; a character's first action of the turn, once half of the characters acted, tells each player still missing
        "Falta apenas Bruno e você" / "Falta só você".
        Who can use it: a player for his own approved character (by piece or by characterId) or the piece of an ally NPC
        he commands (its master character is his — update_campaign_npc); the master for any character of the campaign or
        any NPC piece.
        Objects can't act.
        "Agir sobre…" (098): with a piece as the actor, targetX + targetY name the hex the action is about — with a piece
        there, its data at this moment (name, kind, side, posture, status, PV/Fadiga, facing) and the distance in hexes
        are recorded with the action and shown in the chat, the summary and the turn data ("→ sobre …") to the master and
        the GM; an empty hex records only the hex and the distance. The own hex is "si mesmo".
        {{ENTRY}}
        Common errors: 403 not your piece or character / NPC by a player, 400 empty text (up to 2000 characters), object
        piece, or neither/both ways of naming the actor (key mapTokenId); 400 key target when the hex is outside the map,
        targetMapTokenId does not cover it, or a target comes with campaignId + characterId; 404 not found, 409 campaign
        not active.
        Related tools: list_map_tokens (mapTokenId, pieces and their hexes), list_campaign_characters (characterId), get_turn_state.
        """)]
    public static Task<CallToolResult> ActInTurn(
        Roll6ApiClient api,
        [Description("What the actor does, in plain text (required, up to 2000 characters). Example: \"Casts a fireball at the orcs\".")] string description,
        [Description(McpDocs.MAP_TOKEN_ID + " A character or NPC piece. Omit it to act by campaignId + characterId.")] long? mapTokenId = null,
        [Description("For a character without a piece: the campaign (together with characterId). Omit when giving mapTokenId.")] long? campaignId = null,
        [Description("For a character without a piece: the character approved in that campaign (together with campaignId).")] long? characterId = null,
        [Description("Optional: turnId of a chat entry this action answers (shown as a quote).")] long? replyToTurnId = null,
        [Description("Optional whisper (047): ids of characters approved in the campaign who may see it (not your own). Others don't get a whispered message at all; a whispered action shows them \"está sussurrando!\". The master always sees whispers.")] List<long>? whisperCharacterIds = null,
        [Description("Optional whisper (047): true to whisper to the master (not when you are the master).")] bool? whisperMaster = null,
        [Description("Optional \"Agir sobre…\" (098): column of the hex the action is about, with targetY; only with mapTokenId.")] int? targetX = null,
        [Description("Optional \"Agir sobre…\" (098): row of the hex the action is about, with targetX.")] int? targetY = null,
        [Description("Optional (098): the piece seen on that hex (it must cover it). Omitted: the piece covering the hex, or none.")] long? targetMapTokenId = null) =>
        api.SendAsync(HttpMethod.Post, "/api/turn/action",
            new TurnActInfo
            {
                MapTokenId = mapTokenId, CampaignId = campaignId, CharacterId = characterId, Description = description,
                ReplyToTurnId = replyToTurnId,
                WhisperCharacterIds = whisperCharacterIds, WhisperMaster = whisperMaster,
                Target = targetX is int tx && targetY is int ty ? new TurnTargetInsertInfo { X = tx, Y = ty, MapTokenId = targetMapTokenId } : null
            });

    [McpServerTool(Name = "get_turn_summary", Title = "Get turn summary", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/campaign/{id}/turn/summary")]
    [Description("""
        What it does: returns everything that happened in a turn as readable markdown (Portuguese), ready to paste in a chat
        or a campaign log: "## Ações" (moves with from/to, facing and movement points spent, actions in quotes, the master's
        results, and every change to characters/NPCs with who made it and the values before and after) and "## Posições"
        (where each character and NPC piece of the turn's map is and where it looks).
        Who can use it: the campaign master or a player with an approved character in the campaign.
        Returns: { campaignId, turnNo, markdown }. Without turnNo it is the turn in progress.
        Common errors: 400 turnNo below 1 or above the current turn, 403 no access to the campaign, 404 campaign not found.
        Related tools: get_turn_state, list_turn_entries, finish_turn.
        """)]
    public static Task<CallToolResult> GetTurnSummary(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId,
        [Description("Turn number (1 up to the current turn). Omit it for the turn in progress.")] int? turnNo = null) =>
        api.SendAsync(HttpMethod.Get, $"/api/campaign/{campaignId}/turn/summary", null, ("turnNo", turnNo));

    [McpServerTool(Name = "get_turn_data", Title = "Get turn data", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/campaign/{id}/turn/data")]
    [Description("""
        What it does: returns the whole table in ONE call, to decide what happened in a turn: every approved character
        (characterId, name, playerName, currentLife/totalLife, currentEnergy/totalEnergy — energy is the fatigue —,
        currentMove — the Deslocamento, how far the player may move it per turn in this campaign — and move — the
        character's permanent move —, status and,
        when it has a piece on the current map, x/y/look/lookName), every NPC occurrence on the current map (mapNpcId, name,
        current/total life and energy, status, x/y/look/lookName) and "actions": the "## Ações" markdown of the turn (moves,
        actions, results, changes, narration, with who made them; an action declared with "Agir sobre…" ends with
        "→ sobre <the piece or the hex, with its distance and data at declaration time>" — resolve it against that piece, by
        identity, not by name; the structured target is on the entries of get_turn_state / list_turn_entries).
        Who can use it: the campaign master or a player with an approved character in the campaign.
        Returns: { campaignId, turnNo, currentTurn, mapId, characters[], npcs[], actions }. Without turnNo it is the turn in
        progress (values are always the current ones).
        Common errors: 400 turnNo below 1 or above the current turn, 403 no access to the campaign, 404 campaign not found.
        Related tools: process_turn, get_participation (sheet and campaign notes), get_turn_summary.
        """)]
    public static Task<CallToolResult> GetTurnData(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId,
        [Description("Turn number (1 up to the current turn). Omit it for the turn in progress.")] int? turnNo = null) =>
        api.SendAsync(HttpMethod.Get, $"/api/campaign/{campaignId}/turn/data", null, ("turnNo", turnNo));

    [McpServerTool(Name = "process_turn", Title = "Process turn", ReadOnly = false, Idempotent = false, Destructive = true, OpenWorld = false)]
    [ApiOperation("POST", "/api/campaign/{id}/turn/process")]
    [Description($$"""
        What it does: saves the result of the turn in ONE call and FINISHES it (the campaign moves to the next turn). For each
        character (characterId) and NPC occurrence (mapNpcId) send only what changed: currentLife, currentEnergy (fatigue),
        status (or clearStatus: true), posture (1 standing, 2 down, 3 out of combat), x/y (together) and look; characters
        also take currentMove (the Deslocamento, 0 or more). Also send "narration": what happened in the turn (up to 10000
        characters). Everything is validated first — current values never above the totals, the whole shape of each moved
        piece inside the grid and on free hexes (checked after all moves, so two pieces may swap) — and saved together: if any item is invalid nothing
        changes and the turn does not advance. Every change is logged in the turn by the master (moves without the one-move
        limit). Campaign notes and sheets are not changed here (use update_participation). {{McpDocs.DESTRUCTIVE}}
        Who can use it: only the campaign master.
        Returns: { finishedTurn, turnNo (new turn in progress), data } where data is the turn data of the processed turn.
        Common errors: 400 with keys per item such as characters[0].currentLife, npcs[1].x, narration or batch (empty,
        repeated items), 403 not the master, 404 campaign not found.
        Related tools: get_turn_data, get_turn_summary, update_participation.
        """)]
    public static Task<CallToolResult> ProcessTurn(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId,
        [Description("Changes to characters: [{ characterId, currentLife?, currentEnergy?, currentMove?, status?, clearStatus?, posture?, x?, y?, look? }]; omit unchanged fields.")] List<TurnProcessCharacterInfo>? characters = null,
        [Description("Changes to NPC occurrences on the current map: [{ mapNpcId, currentLife?, currentEnergy?, currentMove?, status?, clearStatus?, posture?, x?, y?, look? }]; omit unchanged fields.")] List<TurnProcessNpcInfo>? npcs = null,
        [Description("What happened in the turn, in plain text or markdown (up to 10000 characters); stays in the turn log.")] string? narration = null) =>
        api.SendAsync(HttpMethod.Post, $"/api/campaign/{campaignId}/turn/process", new TurnProcessInfo
        {
            Characters = characters ?? new List<TurnProcessCharacterInfo>(),
            Npcs = npcs ?? new List<TurnProcessNpcInfo>(),
            Narration = narration
        });

    [McpServerTool(Name = "get_turn_history", Title = "Get turn history", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/campaign/{id}/turn/history")]
    [Description("""
        What it does: pages through the narrations of a campaign, newest first — one item per narration, so a turn that
        was narrated three times gives three items, and the turn in progress is included because the story is told
        while the turn is still open. Each item is one narration: turnId, turnNo (the turn it was written in, for
        ordering), finishedAt and "actions" — the narration as the summary renders it, "GM (name):" and the text,
        without the "## Ações" heading. Only narrations are listed: moves, speech, action results and character
        changes are left out; read them with get_turn_summary or get_turn_data, which keep the whole turn. Use it to
        read the story of the campaign, a few pages at a time.
        Who can use it: the campaign master or a player with an approved character in the campaign.
        Returns: { campaignId, currentTurn, items[], nextBefore }. Pass nextBefore as "before" to get older turns; null means
        turn 1 was reached. Without "before" it starts at the turn in progress.
        Common errors: 400 before below 1, 403 no access to the campaign, 404 campaign not found.
        Related tools: get_turn_data, get_turn_summary.
        """)]
    public static Task<CallToolResult> GetTurnHistory(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId,
        [Description("Only turns below this number (the previous page's nextBefore). Omit it for the newest finished turns.")] int? before = null,
        [Description("How many turns per page, 1 to 20 (default 5).")] int? limit = null) =>
        api.SendAsync(HttpMethod.Get, $"/api/campaign/{campaignId}/turn/history", null, ("before", before), ("limit", limit));

    [McpServerTool(Name = "get_turn_narration", Title = "Get turn narration", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/campaign/{id}/turn/narration")]
    [Description("""
        What it does: returns the narration of a campaign turn — the text stored when the turn was processed — as one
        markdown string. Several narration entries in the same turn are joined with a blank line, oldest first. Without
        turnNo it is the latest FINISHED turn (below the turn in progress) that has a narration; turns with none are skipped.
        Who can use it: the campaign master or a player with an approved character in the campaign.
        Returns: { turnNo, narration, finishedAt }. finishedAt is the time of the last narration entry, or null when that
        narration belongs to the turn in progress. When there is no narration the API answers 204 and this tool returns
        { ok: true }.
        Common errors: 400 turnNo below 1 or above the current turn, 403 no access to the campaign, 404 campaign not found.
        Related tools: get_turn_summary, get_turn_history, process_turn.
        """)]
    public static Task<CallToolResult> GetTurnNarration(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId,
        [Description("Turn number (1 up to the current turn). Omit it for the latest finished turn that has a narration.")] int? turnNo = null) =>
        api.SendAsync(HttpMethod.Get, $"/api/campaign/{campaignId}/turn/narration", null, ("turnNo", turnNo));

    [McpServerTool(Name = "reset_turn", Title = "Reset piece turn", ReadOnly = false, Idempotent = false, Destructive = true, OpenWorld = false)]
    [ApiOperation("POST", "/api/turn/reset")]
    [Description($$"""
        What it does: deletes the move and the action of a piece's character/NPC occurrence in the current turn (changes to
        its life/energy/status stay in the log) and moves the piece back to where it was before its move (if that hex is
        still free) — so it can move and act again. In free mode (set_campaign_free_mode) it only cancels the actions:
        no move is recorded there and the piece stays where it is. {{McpDocs.DESTRUCTIVE}}
        Who can use it: a player for his own approved character's piece or an ally NPC he commands; the master for any
        character or NPC piece.
        Returns: { removed (entries deleted), reverted (false when the former hex was taken and the piece stayed) }.
        Common errors: 403 not your piece, 400 object piece, 404 not found.
        Related tools: get_turn_state.
        """)]
    public static Task<CallToolResult> ResetTurn(
        Roll6ApiClient api,
        [Description(McpDocs.MAP_TOKEN_ID)] long mapTokenId) =>
        api.SendAsync(HttpMethod.Post, "/api/turn/reset", new TurnPieceInfo { MapTokenId = mapTokenId });

    [McpServerTool(Name = "create_turn_entry", Title = "Create turn entry", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/turn")]
    [Description($$"""
        What it does: writes a turn entry directly, in the turn in progress or in any earlier turn — the only way to
        record an ActionResult (turn type 3, e.g. "the goblin takes 4 damage") and the way to log turns played outside the
        table. Types: 1 Movement (before/after positions, optional moved), 2 Action and 3 ActionResult (description),
        4 CharacterUpdate (changes: [{ field, before, after }]) and 5 Narration (description up to 10000 characters, no
        actor). Types 1-4 need exactly one of characterId / npcId (mapNpcId only together with npcId), and the actor and
        the map must belong to the campaign. It only writes the log: pieces, characters and NPCs don't change and the
        one-move-per-turn rule doesn't apply.
        Who can use it: only the master.
        {{ENTRY}}
        Common errors: 403 not the master, 400 invalid type, turnNo outside 1..current turn, actor or map not in the
        campaign, narration with an actor, missing positions/changes, text too long.
        Related tools: get_turn_state, list_turn_entries, update_turn_entry, delete_turn_entry, set_current_turn.
        """)]
    public static Task<CallToolResult> CreateTurnEntry(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId,
        [Description("1 Movement, 2 Action, 3 ActionResult, 4 CharacterUpdate, 5 Narration.")] int turnType,
        [Description("Character the entry belongs to (characterId). Give this or npcId; none for a narration.")] long? characterId = null,
        [Description("Library NPC the entry belongs to (npcId). Give this or characterId; none for a narration.")] long? npcId = null,
        [Description("NPC occurrence on a map (mapNpcId), only together with npcId. Optional.")] long? mapNpcId = null,
        [Description("Text of an Action or ActionResult (up to 2000 characters) or of a Narration (up to 10000).")] string? description = null,
        [Description("Turn number, from 1 up to the current turn; omit for the turn in progress.")] int? turnNo = null,
        [Description("Map where it happened (mapId, a map of the campaign). Optional.")] long? mapId = null,
        [Description("Movement only: column before the move.")] int? beforeX = null,
        [Description("Movement only: row before the move.")] int? beforeY = null,
        [Description("Movement only: facing before the move (0-5).")] int? beforeLook = null,
        [Description("Movement only: column after the move.")] int? x = null,
        [Description("Movement only: row after the move.")] int? y = null,
        [Description("Movement only: facing after the move (0-5).")] int? look = null,
        [Description("Movement only: movement points spent (0 or more). Optional.")] int? moved = null,
        [Description("CharacterUpdate only (required there): the changed fields, e.g. [{ \"field\": \"currentLife\", \"before\": \"10\", \"after\": \"6\" }].")] List<TurnChangeInfo>? changes = null) =>
        api.SendAsync(HttpMethod.Post, "/api/turn", new TurnInsertInfo
        {
            CampaignId = campaignId, TurnType = turnType, CharacterId = characterId, NpcId = npcId, MapNpcId = mapNpcId,
            Description = description, TurnNo = turnNo, MapId = mapId, BeforeX = beforeX, BeforeY = beforeY,
            BeforeLook = beforeLook, X = x, Y = y, Look = look, Moved = moved, Changes = changes
        });

    [McpServerTool(Name = "update_turn_entry", Title = "Update turn entry", ReadOnly = false, Idempotent = true, Destructive = true, OpenWorld = false)]
    [ApiOperation("PUT", "/api/turn/{id}")]
    [Description($$"""
        What it does: fixes an entry of any turn — only the fields you send change (omitted = kept). Text for Action,
        ActionResult and Narration; positions, facings and moved for Movement; the whole changes list for CharacterUpdate;
        turnNo (1 up to the current turn) and mapId for any entry. Type, actor, author and creation date never change
        (delete and create again for that). It only rewrites the log: pieces, characters and NPCs don't change.
        {{McpDocs.DESTRUCTIVE}}
        Who can use it: only the master.
        {{ENTRY}}
        Common errors: 403 not the master, 404 entry not found, 400 field that doesn't apply to the entry's type, turnNo
        outside 1..current turn, map not in the campaign, empty text or changes, text too long.
        Related tools: list_turn_entries, get_turn_summary, create_turn_entry, delete_turn_entry.
        """)]
    public static Task<CallToolResult> UpdateTurnEntry(
        Roll6ApiClient api,
        [Description("Id of the entry (turnId from get_turn_state or list_turn_entries).")] long turnId,
        [Description("Moves the entry to this turn (1 up to the current turn). Optional.")] int? turnNo = null,
        [Description("Map where it happened (mapId, a map of the campaign). Optional.")] long? mapId = null,
        [Description("Action / ActionResult (up to 2000 characters) or Narration (up to 10000) text. Optional.")] string? description = null,
        [Description("Movement only: column before the move.")] int? beforeX = null,
        [Description("Movement only: row before the move.")] int? beforeY = null,
        [Description("Movement only: facing before the move (0-5).")] int? beforeLook = null,
        [Description("Movement only: column after the move.")] int? x = null,
        [Description("Movement only: row after the move.")] int? y = null,
        [Description("Movement only: facing after the move (0-5).")] int? look = null,
        [Description("Movement only: movement points spent (0 or more).")] int? moved = null,
        [Description("CharacterUpdate only: replaces the whole list, e.g. [{ \"field\": \"currentLife\", \"before\": \"10\", \"after\": \"6\" }].")] List<TurnChangeInfo>? changes = null) =>
        api.SendAsync(HttpMethod.Put, $"/api/turn/{turnId}", new TurnUpdateInfo
        {
            TurnNo = turnNo, MapId = mapId, Description = description, BeforeX = beforeX, BeforeY = beforeY, BeforeLook = beforeLook,
            X = x, Y = y, Look = look, Moved = moved, Changes = changes
        });

    [McpServerTool(Name = "delete_turn_entry", Title = "Delete turn entry", ReadOnly = false, Idempotent = false, Destructive = true, OpenWorld = false)]
    [ApiOperation("DELETE", "/api/turn/{id}")]
    [Description($$"""
        What it does: deletes one entry of any type from any turn. Nothing is rolled back: pieces don't move back (use
        reset_turn for the turn in progress) and character/NPC values stay.
        {{McpDocs.DESTRUCTIVE}}
        Who can use it: only the master.
        Returns: { ok: true }.
        Common errors: 403 not the master, 404 not found.
        Related tools: get_turn_state, list_turn_entries (turnId), update_turn_entry.
        """)]
    public static Task<CallToolResult> DeleteTurnEntry(
        Roll6ApiClient api,
        [Description("Id of the entry (turnId from get_turn_state or list_turn_entries).")] long turnId) =>
        api.SendAsync(HttpMethod.Delete, $"/api/turn/{turnId}");
}
