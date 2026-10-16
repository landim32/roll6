namespace Roll6.Domain.Enums;

public enum MapStatus
{
    Active = 1,
    Archived = 2,
    Deleted = 3,

    /// <summary>
    /// "Atual" (078): the map the players follow. At most one per campaign (unique partial index), set only by
    /// <c>CampaignService.SetCurrentMapAsync</c>, which keeps <c>campaigns.current_map_id</c> pointing at it.
    /// </summary>
    Current = 4
}
