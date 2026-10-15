using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Notifications;
using Roll6.Domain.Realtime;
using Roll6.DTO.Push;
using Roll6.DTO.Realtime;

namespace Roll6.Domain.Services;

/// <summary>
/// Notices of the turn and the chat (043): what each event hands to the notification queue, after its write succeeded,
/// and the poke. Delivery (who sees what, push or toast) is the notification worker's.
/// </summary>
public partial class TurnService
{
    /// <summary>A poke per person and campaign at most this often.</summary>
    public static readonly TimeSpan POKE_COOLDOWN = TimeSpan.FromMinutes(1);

    /// <summary>
    /// Builds a notice without ever failing the write that caused it (FR-015): the action/turn/change is already
    /// saved, and a notice is only a best-effort warning.
    /// </summary>
    private static async Task SafelyAsync(Func<Task> build)
    {
        try
        {
            await build();
        }
        catch
        {
            // A missed notice is acceptable; the chat stays the source of truth.
        }
    }

    /// <summary>
    /// After an action is saved (074): N2 to the master for every action that is not his — a character's, or an ally
    /// NPC's by its commander — and, when it is the character's first valid action of the turn, N3 to whoever is still
    /// missing once the majority acted. In any mode, free mode included.
    /// </summary>
    private Task NotifyActionAsync(Campaign campaign, long userId, long? characterId, long? mapNpcId, string? description,
        bool firstAction) =>
        SafelyAsync(() => NotifyActionCoreAsync(campaign, userId, characterId, mapNpcId, description, firstAction));

    private async Task NotifyActionCoreAsync(Campaign campaign, long userId, long? characterId, long? mapNpcId,
        string? description, bool firstAction)
    {
        if (userId != campaign.UserId)
        {
            var (name, image) = await ActorOfNoticeAsync(characterId, mapNpcId);
            if (name != null)
                _queue.Enqueue(TableNotices.Action(campaign.CampaignId, userId, campaign.UserId, name, description,
                    _imageStorage.GetUrl(image)));
        }
        // NPCs don't owe a play: only characters count for "Falta…".
        if (firstAction && characterId.HasValue)
            await NotifyPendingAsync(campaign, userId);
    }

    /// <summary>The name and picture a notice shows for the actor: the character's, or the instance's name and its NPC's picture.</summary>
    private async Task<(string? Name, string? Image)> ActorOfNoticeAsync(long? characterId, long? mapNpcId)
    {
        if (characterId is long id)
        {
            var character = await _characterRepository.GetByIdAsync(id);
            return (character?.Name, character?.Image);
        }
        if (mapNpcId is long instanceId && await _mapNpcRepository.GetByIdAsync(instanceId) is { } instance)
        {
            var npc = await _npcRepository.GetByIdAsync(instance.NpcId);
            return (instance.Name, npc?.Image);
        }
        return (null, null);
    }

    /// <summary>N3 (074): "Falta apenas Bruno e você" / "Falta só você" to each player still missing, once the majority acted.</summary>
    private async Task NotifyPendingAsync(Campaign campaign, long userId)
    {
        var approved = (await _campaignCharacterRepository.ListByCampaignAsync(campaign.CampaignId, approvedOnly: true))
            .Select(p => p.CharacterId).Distinct().ToList();
        if (approved.Count == 0)
            return;
        var acted = (await _repository.ListByCampaignTurnAsync(campaign.CampaignId, campaign.CurrentTurn))
            .Where(e => e.TurnType == TurnType.Action && e.CharacterId.HasValue)
            .Select(e => e.CharacterId!.Value)
            .ToHashSet();
        var owners = (await _characterRepository.ListByIdsAsync(approved)).ToDictionary(c => c.CharacterId, c => c.UserId);
        var names = (await _userRepository.ListByIdsAsync(owners.Values.Distinct()))
            .ToDictionary(u => u.UserId, u => NoticeTexts.FirstName(u.Name));
        var bodies = Pending.Reminders(approved, acted, owners, names);
        if (bodies.Count > 0)
            _queue.Enqueue(TableNotices.Pending(campaign.CampaignId, userId, bodies));
    }

    /// <summary>N4 to the players of the campaign.</summary>
    private Task NotifyTurnFinishedAsync(Campaign campaign, long userId, int finishedTurn) =>
        SafelyAsync(() => NotifyTurnFinishedCoreAsync(campaign, userId, finishedTurn));

    private async Task NotifyTurnFinishedCoreAsync(Campaign campaign, long userId, int finishedTurn)
    {
        var approved = await _campaignCharacterRepository.ListByCampaignAsync(campaign.CampaignId, approvedOnly: true);
        var characters = await _characterRepository.ListByIdsAsync(approved.Select(p => p.CharacterId).Distinct());
        var players = characters.Select(c => c.UserId).Where(u => u != userId).ToList();
        if (players.Count > 0)
            _queue.Enqueue(TableNotices.TurnFinished(campaign.CampaignId, userId, finishedTurn, players));
    }

    /// <summary>N5/N6 for a character whose PV or Fadiga changed in the campaign.</summary>
    private Task NotifyVitalsAsync(long campaignId, long userId, long characterId, IEnumerable<TurnChange> changes) =>
        SafelyAsync(() => NotifyVitalsCoreAsync(campaignId, userId, characterId, changes));

    private async Task NotifyVitalsCoreAsync(long campaignId, long userId, long characterId, IEnumerable<TurnChange> changes)
    {
        var character = await _characterRepository.GetByIdAsync(characterId);
        if (character == null)
            return;
        foreach (var notice in TableNotices.Vitals(campaignId, userId, character.UserId, character.Name, changes, character.Life, character.Energy))
            _queue.Enqueue(notice);
    }

    /// <summary>
    /// Pokes the players whose characters haven't acted in the turn (043, N7): a line in the chat ("Rodrigo cutucou Ana
    /// e Bruno") and a notice to each of them. When nobody else is missing, a player's poke goes to the master instead
    /// (074, N7b: "Ana cutucou o mestre"). Master or approved participant; at most once a minute per person.
    /// </summary>
    public async Task<PokeResultInfo> PokeAsync(long userId, long campaignId)
    {
        var campaign = await GetReadableCampaignAsync(userId, campaignId);
        campaign.EnsurePlayable(); // 049: the turn moves only while the campaign is active
        var approved = await _campaignCharacterRepository.ListByCampaignAsync(campaign.CampaignId, approvedOnly: true);
        var acted = (await _repository.ListByCampaignTurnAsync(campaign.CampaignId, campaign.CurrentTurn))
            .Where(e => e.TurnType == TurnType.Action && e.CharacterId.HasValue)
            .Select(e => e.CharacterId!.Value)
            .ToHashSet();
        var missing = await _characterRepository.ListByIdsAsync(approved.Select(p => p.CharacterId).Where(c => !acted.Contains(c)).Distinct());
        var pokedIds = missing.Select(c => c.UserId).Where(u => u != userId).Distinct().ToList();
        if (pokedIds.Count == 0)
            return campaign.UserId == userId ? new PokeResultInfo { Poked = 0 } : await PokeMasterAsync(campaign, userId);

        await EnsurePokeCooldownAsync(campaign, userId);

        var users = await _userRepository.ListByIdsAsync(pokedIds.Append(userId).Distinct());
        var poker = NoticeTexts.FirstName(users.FirstOrDefault(u => u.UserId == userId)?.Name);
        var names = users.Where(u => pokedIds.Contains(u.UserId))
            .OrderBy(u => u.Name, StringComparer.CurrentCulture)
            .Select(u => NoticeTexts.FirstName(u.Name))
            .ToList();
        var saved = await _repository.InsertAsync(Turn.Poke(campaign.CampaignId, campaign.CurrentMapId, campaign.CurrentTurn, userId,
            string.IsNullOrEmpty(poker) ? "Alguém" : poker, NoticeTexts.JoinNames(names)));
        var item = (await MapChatAsync(campaign, userId, new List<Turn> { saved })).Single();
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.CHAT_MESSAGE, campaign.CampaignId, userId, data: item));
        _queue.Enqueue(TableNotices.Poke(campaign.CampaignId, userId, string.IsNullOrEmpty(poker) ? "Alguém" : poker, pokedIds));
        return new PokeResultInfo { Poked = pokedIds.Count, Names = names, Item = item };
    }

    private async Task EnsurePokeCooldownAsync(Campaign campaign, long userId)
    {
        var last = await _repository.LastPokeAtAsync(campaign.CampaignId, userId);
        if (last.HasValue && DateTime.UtcNow - last.Value < POKE_COOLDOWN)
            throw new ConflictException("Aguarde um minuto para cutucar de novo.");
    }

    /// <summary>N7b (074): every character acted, so a player's poke asks the master to move on.</summary>
    private async Task<PokeResultInfo> PokeMasterAsync(Campaign campaign, long userId)
    {
        await EnsurePokeCooldownAsync(campaign, userId);
        var users = await _userRepository.ListByIdsAsync(new[] { userId });
        var poker = NoticeTexts.FirstName(users.FirstOrDefault(u => u.UserId == userId)?.Name);
        if (string.IsNullOrEmpty(poker))
            poker = "Alguém";
        var saved = await _repository.InsertAsync(Turn.Poke(campaign.CampaignId, campaign.CurrentMapId, campaign.CurrentTurn, userId,
            poker, NoticeTexts.MASTER));
        var item = (await MapChatAsync(campaign, userId, new List<Turn> { saved })).Single();
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.CHAT_MESSAGE, campaign.CampaignId, userId, data: item));
        _queue.Enqueue(TableNotices.PokeMaster(campaign.CampaignId, userId, poker, campaign.UserId));
        return new PokeResultInfo { Poked = 1, Master = true, Names = new List<string> { NoticeTexts.MASTER }, Item = item };
    }
}
