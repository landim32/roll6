using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Realtime;
using Roll6.DTO.Realtime;
using Roll6.DTO.Turn;

namespace Roll6.Domain.Services;

/// <summary>
/// "Ação repetida" (099): an actor's standing order, kept on its participation (characters) or its instance (NPCs) and
/// applied as its action at the start of every turn until it is removed, replaced by another action or cleared by whoever
/// processes the turn. Setting it while the actor has no valid action in the turn records it now (Q2 = A).
/// </summary>
public partial class TurnService
{
    /// <summary>The row that holds an actor's repetition: its participation or its NPC instance.</summary>
    private sealed record RepeatHolder(CampaignCharacter? Participation, MapNpc? Instance)
    {
        public string? Text => Participation?.RepeatedAction ?? Instance?.RepeatedAction;
        public bool Clear() => Participation?.ClearRepeatedAction() ?? Instance?.ClearRepeatedAction() ?? false;
        public bool Set(string? text, long userId) =>
            Participation?.SetRepeatedAction(text, userId) ?? Instance!.SetRepeatedAction(text, userId);
    }

    private async Task<RepeatHolder?> LoadRepeatHolderAsync(Campaign campaign, long? characterId, long? mapNpcId)
    {
        if (characterId is long c)
            return await _campaignCharacterRepository.GetAsync(campaign.CampaignId, c) is { } participation
                ? new RepeatHolder(participation, null) : null;
        if (mapNpcId is long m)
            return await _mapNpcRepository.GetByIdAsync(m) is { } instance ? new RepeatHolder(null, instance) : null;
        return null;
    }

    private Task SaveRepeatHolderAsync(RepeatHolder holder) =>
        holder.Participation != null
            ? _campaignCharacterRepository.UpdateAsync(holder.Participation)
            : _mapNpcRepository.UpdateAsync(holder.Instance!);

    /// <summary>
    /// 099: the actor's repetition when declaring another action clears it (FR-006); null when there was none. The caller
    /// saves it inside its own transaction.
    /// </summary>
    private async Task<RepeatHolder?> RepeatToClearAsync(Campaign campaign, long? characterId, long? mapNpcId)
    {
        var holder = await LoadRepeatHolderAsync(campaign, characterId, mapNpcId);
        return holder != null && holder.Clear() ? holder : null;
    }

    private async Task PublishRepeatChangedAsync(long campaignId, long userId)
    {
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.PARTY_CHANGED, campaignId, userId));
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.MAP_TOKENS_CHANGED, campaignId, userId));
    }

    public async Task<TurnRepeatResultInfo> SetRepeatedAsync(long userId, TurnRepeatInfo info)
    {
        Campaign campaign;
        long? mapId;
        (long? CharacterId, long? NpcId, long? MapNpcId) actor;
        if (info.MapTokenId is long mapTokenId && info.CampaignId == null && info.CharacterId == null)
        {
            var (piece, map, pieceCampaign) = await GetPieceAsync(mapTokenId);
            campaign = pieceCampaign;
            actor = await ResolveActorAsync(userId, piece, campaign);
            mapId = map.MapId;
        }
        else if (info.MapTokenId == null && info.CampaignId is long campaignId && info.CharacterId is long characterId)
        {
            campaign = await _campaignRepository.GetByIdAsync(campaignId)
                ?? throw new KeyNotFoundException("Campanha não encontrada.");
            actor = await ResolveCharacterActorAsync(userId, campaign, characterId);
            mapId = campaign.CurrentMapId;
        }
        else
            throw new DomainValidationException("mapTokenId",
                "Informe a peça (mapTokenId) ou a campanha e o personagem (campaignId e characterId).");

        var holder = await LoadRepeatHolderAsync(campaign, actor.CharacterId, actor.MapNpcId)
            ?? throw new KeyNotFoundException("Participação não encontrada.");

        // Removing works in any campaign status; setting moves the turn like an action.
        if (string.IsNullOrWhiteSpace(info.Description))
        {
            if (holder.Clear())
            {
                await SaveRepeatHolderAsync(holder);
                await PublishRepeatChangedAsync(campaign.CampaignId, userId);
            }
            return new TurnRepeatResultInfo { Active = false };
        }

        campaign.EnsurePlayable();
        holder.Set(info.Description, userId);
        var current = await _repository.ListValidActionsAsync(campaign.CampaignId, campaign.CurrentTurn,
            actor.CharacterId, actor.CharacterId.HasValue ? null : actor.MapNpcId);

        // Q2 = A: the actor had not acted in this turn — the repetition is its action right away (a declaration).
        Turn? applied = null;
        if (current.Count == 0)
            applied = Turn.Action(campaign.CampaignId, mapId, actor.CharacterId, actor.NpcId, actor.MapNpcId,
                campaign.CurrentTurn, userId, holder.Text, null, RepeatSource.Declared);
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await SaveRepeatHolderAsync(holder);
            if (applied != null)
                applied = await _repository.InsertAsync(applied);
        });

        await PublishRepeatChangedAsync(campaign.CampaignId, userId);
        TurnInfo? appliedInfo = null;
        if (applied != null)
        {
            appliedInfo = (await MapToDtoAsync(new List<Turn> { applied }, await LoadWhispersAsync(new[] { applied }))).Single();
            await PublishTurnChangedAsync(campaign.CampaignId, userId);
            await NotifyActionAsync(campaign, userId, actor.CharacterId, actor.MapNpcId, holder.Text, firstAction: true);
            await CheckAsync(campaign.CampaignId, "repeat");
        }
        return new TurnRepeatResultInfo { Active = true, Description = holder.Text, Applied = appliedInfo };
    }

    /// <summary>
    /// 099: the actions every active repetition of the campaign adds to the turn that just started (call after
    /// <see cref="Campaign.AdvanceTurn"/>, insert inside the same transaction). Characters act on the campaign's current
    /// map (or none); NPC instances on their own map. Authored by whoever set the repetition (else
    /// <paramref name="fallbackUserId"/>). No notices: an automatic action is not news.
    /// </summary>
    private async Task<List<Turn>> RepeatedActionsAsync(Campaign campaign, long fallbackUserId,
        IReadOnlySet<long>? clearedParticipations = null, IReadOnlySet<long>? clearedInstances = null)
    {
        var turns = new List<Turn>();
        foreach (var participation in await _campaignCharacterRepository.ListRepeatingAsync(campaign.CampaignId) ?? new())
        {
            if (clearedParticipations?.Contains(participation.CampaignCharacterId) == true)
                continue;
            turns.Add(Turn.Action(campaign.CampaignId, campaign.CurrentMapId, participation.CharacterId, null, null,
                campaign.CurrentTurn, participation.RepeatedActionUserId ?? fallbackUserId, participation.RepeatedAction,
                null, RepeatSource.TurnStart));
        }
        foreach (var instance in await _mapNpcRepository.ListRepeatingAsync(campaign.CampaignId) ?? new())
        {
            if (clearedInstances?.Contains(instance.MapNpcId) == true)
                continue;
            turns.Add(Turn.Action(campaign.CampaignId, instance.MapId, null, instance.NpcId, instance.MapNpcId,
                campaign.CurrentTurn, instance.RepeatedActionUserId ?? fallbackUserId, instance.RepeatedAction,
                null, RepeatSource.TurnStart));
        }
        return turns;
    }
}
