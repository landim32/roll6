namespace Roll6.DTO.Realtime;

/// <summary>Kinds of real-time table events (017); mirrored by TABLE_EVENT in the frontend.</summary>
public static class TableEventType
{
    /// <summary>A piece was created, moved or changed; data = MapTokenInfo.</summary>
    public const string MAP_TOKEN_UPSERTED = "mapToken.upserted";
    /// <summary>A piece was deleted; data = { mapTokenId }.</summary>
    public const string MAP_TOKEN_DELETED = "mapToken.deleted";
    /// <summary>Pieces of the map (or of every map when mapId is null) must be reloaded.</summary>
    public const string MAP_TOKENS_CHANGED = "mapTokens.changed";
    /// <summary>Party (approved characters and their campaign data) must be reloaded.</summary>
    public const string PARTY_CHANGED = "party.changed";
    /// <summary>NPCs of the campaign must be reloaded.</summary>
    public const string CAMPAIGN_NPCS_CHANGED = "campaignNpcs.changed";
    /// <summary>Entries of the turn in progress changed.</summary>
    public const string TURN_CHANGED = "turn.changed";
    /// <summary>The turn was finished; data = { finishedTurn, turnNo }.</summary>
    public const string TURN_FINISHED = "turn.finished";
    /// <summary>A map model was saved (image, layout, grid); data = { mapModelId }.</summary>
    public const string MAP_SAVED = "map.saved";
    /// <summary>A campaign map was added or changed; data = MapInfo.</summary>
    public const string MAPS_CHANGED = "maps.changed";
    /// <summary>A campaign map was deleted.</summary>
    public const string MAP_DELETED = "map.deleted";
    /// <summary>The master opened another campaign map (players follow).</summary>
    public const string MAP_CURRENT = "map.current";
    /// <summary>Campaign renamed or opened/closed; data = CampaignInfo.</summary>
    public const string CAMPAIGN_CHANGED = "campaign.changed";
    /// <summary>The campaign was deleted.</summary>
    public const string CAMPAIGN_DELETED = "campaign.deleted";

    /// <summary>A chat message or an end-of-turn divider was saved (041); data = ChatItemInfo.</summary>
    public const string CHAT_MESSAGE = "chat.message";

    /// <summary>A chat message or narration was deleted from the chat (041); data = { itemKey }.</summary>
    public const string CHAT_DELETED = "chat.deleted";
}
