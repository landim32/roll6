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

    /// <summary>N2 to the master and, when this action makes the majority, N3 to who still has to act.</summary>
    private Task NotifyActionAsync(Campaign campaign, long userId, long? characterId, string? description) =>
        SafelyAsync(() => NotifyActionCoreAsync(campaign, userId, characterId, description));

    private async Task NotifyActionCoreAsync(Campaign campaign, long userId, long? characterId, string? description)
    {
        if (characterId is not long id)
            return;
        var character = await _characterRepository.GetByIdAsync(id);
        if (character == null)
            return;
        _queue.Enqueue(TableNotices.Action(campaign.CampaignId, userId, campaign.UserId, character.Name, description,
            _imageStorage.GetUrl(character.Image)));
        await NotifyMajorityAsync(campaign, userId, id);
    }

    private async Task NotifyMajorityAsync(Campaign campaign, long userId, long actedCharacterId)
    {
        if (campaign.MajorityNotifiedTurn == campaign.CurrentTurn)
            return;
        var approved = (await _campaignCharacterRepository.ListByCampaignAsync(campaign.CampaignId, approvedOnly: true))
            .Select(p => p.CharacterId).ToHashSet();
        var actions = (await _repository.ListByCampaignTurnAsync(campaign.CampaignId, campaign.CurrentTurn))
            .Where(e => e.TurnType == TurnType.Action && e.CharacterId is long c && approved.Contains(c))
            .ToList();
        var acted = actions.Select(e => e.CharacterId!.Value).ToHashSet();
        var after = acted.Count;
        // Acting again doesn't change the count; the first action of this character does.
        var before = actions.Count(e => e.CharacterId == actedCharacterId) > 1 ? after : after - 1;
        if (!Majority.Crossed(approved.Count, before, after))
            return;
        // Once per turn, even with two actions arriving together.
        if (!await _campaignRepository.TrySetMajorityNotifiedAsync(campaign.CampaignId, campaign.CurrentTurn))
            return;
        var missing = await _characterRepository.ListByIdsAsync(approved.Where(c => !acted.Contains(c)));
        var owners = missing.Select(c => c.UserId).Distinct().ToList();
        var names = (await _userRepository.ListByIdsAsync(owners))
            .OrderBy(u => u.Name, StringComparer.CurrentCulture)
            .ToDictionary(u => u.UserId, u => NoticeTexts.FirstName(u.Name));
        if (names.Count > 0)
            _queue.Enqueue(TableNotices.Majority(campaign.CampaignId, userId, names));
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
    /// e Bruno") and a notice to each of them. Master or approved participant; at most once a minute per person.
    /// </summary>
    public async Task<PokeResultInfo> PokeAsync(long userId, long campaignId)
    {
        var campaign = await GetReadableCampaignAsync(userId, campaignId);
        var approved = await _campaignCharacterRepository.ListByCampaignAsync(campaign.CampaignId, approvedOnly: true);
        var acted = (await _repository.ListByCampaignTurnAsync(campaign.CampaignId, campaign.CurrentTurn))
            .Where(e => e.TurnType == TurnType.Action && e.CharacterId.HasValue)
            .Select(e => e.CharacterId!.Value)
            .ToHashSet();
        var missing = await _characterRepository.ListByIdsAsync(approved.Select(p => p.CharacterId).Where(c => !acted.Contains(c)).Distinct());
        var pokedIds = missing.Select(c => c.UserId).Where(u => u != userId).Distinct().ToList();
        if (pokedIds.Count == 0)
            return new PokeResultInfo { Poked = 0 };

        var last = await _repository.LastPokeAtAsync(campaign.CampaignId, userId);
        if (last.HasValue && DateTime.UtcNow - last.Value < POKE_COOLDOWN)
            throw new ConflictException("Aguarde um minuto para cutucar de novo.");

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
}
