namespace Roll6.Domain.Interfaces;

/// <summary>
/// 101: which turn each campaign's master said he is processing. In memory (one API instance, like the GM run state);
/// a restart forgets it.
/// </summary>
public interface ITurnProcessingRegistry
{
    /// <summary>Registers the turn; false when that same turn is already registered and live (nothing to announce).</summary>
    bool Start(long campaignId, int turnNo, long userId, DateTime now);

    /// <summary>Removes the notice; the turn it was live for (then a line is written), else null.</summary>
    int? Stop(long campaignId, int currentTurn, DateTime now);

    /// <summary>The live notice for the campaign's current turn and its expiry, else null (stale ones are dropped).</summary>
    (int TurnNo, DateTime Until)? Current(long campaignId, int currentTurn, DateTime now);

    void Clear(long campaignId);
}
