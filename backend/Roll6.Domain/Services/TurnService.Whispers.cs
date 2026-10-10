using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Notifications;
using Roll6.Domain.Realtime;
using Roll6.Domain.Whispers;
using Roll6.DTO.Chat;
using Roll6.DTO.Realtime;

namespace Roll6.Domain.Services;

/// <summary>
/// Whispers (047): a message, photo, audio, roll or action seen whole only by its author, the master and the current
/// owners of its target characters. Everyone else doesn't get a whispered message at all and gets a whispered action
/// with its text replaced by "está sussurrando!" — in every read (chat, turn state, summary, data) and every realtime
/// send. The filtering happens here, on the server: nothing the reader may not see leaves it.
/// </summary>
public partial class TurnService
{
    /// <summary>The whispers among some entries: their targets and the target characters (for owners, names, pictures).</summary>
    private sealed class WhisperData
    {
        public static readonly WhisperData Empty = new();
        public Dictionary<long, List<TurnWhisperTarget>> Targets { get; } = new();
        public Dictionary<long, Character> Characters { get; } = new();
        /// <summary>Whispered actions masked for the reader.</summary>
        public HashSet<long> Masked { get; } = new();

        public IEnumerable<long> OwnersOf(long turnId) =>
            Targets.GetValueOrDefault(turnId, new List<TurnWhisperTarget>())
                .Where(w => w.CharacterId.HasValue && Characters.ContainsKey(w.CharacterId.Value))
                .Select(w => Characters[w.CharacterId!.Value].UserId);

        public bool CanSee(Turn turn, long viewerId, bool viewerIsMaster) =>
            WhisperAudience.CanSee(turn.IsWhisper, turn.UserId, OwnersOf(turn.TurnId), viewerId, viewerIsMaster);
    }

    /// <summary>
    /// The targets of a new entry: null = public. Each character must be approved in the campaign and not the speaker's
    /// own; the master can't whisper to himself; at least one target.
    /// </summary>
    private async Task<List<long?>?> ResolveWhisperAsync(Campaign campaign, long userId, long? speakerCharacterId,
        IReadOnlyCollection<long>? characterIds, bool? toMaster)
    {
        var ids = (characterIds ?? Array.Empty<long>()).Distinct().ToList();
        var master = toMaster == true;
        if (ids.Count == 0 && !master)
            return null;
        if (master && campaign.UserId == userId)
            throw new DomainValidationException("whisper", "O mestre não sussurra para si mesmo.");
        if (speakerCharacterId is long own && ids.Contains(own))
            throw new DomainValidationException("whisper", "Não é possível sussurrar para o próprio personagem.");
        foreach (var id in ids)
        {
            var participation = await _campaignCharacterRepository.GetAsync(campaign.CampaignId, id);
            if (participation?.Status != CampaignCharacterStatus.Approved)
                throw new DomainValidationException("whisper", "Só é possível sussurrar para personagens aprovados na campanha.");
        }
        var targets = ids.Select(id => (long?)id).ToList();
        if (master) targets.Add(null);
        return targets;
    }

    /// <summary>Saves a new entry and, when whispered, its targets in the same transaction.</summary>
    private async Task<Turn> SaveEntryAsync(Turn entry, List<long?>? whisper, Func<Task>? alsoInTransaction = null)
    {
        if (whisper != null)
            entry.MarkWhisper();
        var saved = entry;
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            if (alsoInTransaction != null)
                await alsoInTransaction();
            saved = await _repository.InsertAsync(entry);
            if (whisper != null)
                await _whisperRepository.InsertAsync(whisper.Select(c => TurnWhisperTarget.Create(saved.TurnId, c)));
        });
        return saved;
    }

    private async Task<WhisperData> LoadWhispersAsync(IEnumerable<Turn> entries)
    {
        var whispers = entries.Where(t => t.IsWhisper).Select(t => t.TurnId).Distinct().ToList();
        if (whispers.Count == 0)
            return WhisperData.Empty;
        var data = new WhisperData();
        foreach (var target in await _whisperRepository.ListByTurnsAsync(whispers))
        {
            if (!data.Targets.TryGetValue(target.TurnId, out var list))
                data.Targets[target.TurnId] = list = new List<TurnWhisperTarget>();
            list.Add(target);
        }
        var characterIds = data.Targets.Values.SelectMany(l => l).Where(w => w.CharacterId.HasValue)
            .Select(w => w.CharacterId!.Value).Distinct().ToList();
        if (characterIds.Count > 0)
            foreach (var character in await _characterRepository.ListByIdsAsync(characterIds))
                data.Characters[character.CharacterId] = character;
        return data;
    }

    /// <summary>
    /// Masks, in memory, the whispered actions the viewer is not in (their description becomes "está sussurrando!").
    /// Only for entries read to be shown — never saved afterwards.
    /// </summary>
    private async Task<WhisperData> MaskForViewerAsync(Campaign campaign, long viewerId, IEnumerable<Turn> entries)
    {
        var list = entries.ToList();
        var data = await LoadWhispersAsync(list);
        if (data == WhisperData.Empty)
            return data;
        var isMaster = campaign.UserId == viewerId;
        foreach (var entry in list.Where(t => t.IsWhisper && t.TurnType == TurnType.Action && !data.CanSee(t, viewerId, isMaster)))
        {
            entry.Description = WhisperAudience.MASKED_TEXT;
            data.Masked.Add(entry.TurnId);
        }
        return data;
    }

    /// <summary>A whisper the viewer may not see is, for them, an entry that does not exist.</summary>
    private async Task EnsureVisibleAsync(Campaign campaign, long viewerId, Turn turn)
    {
        if (!turn.IsWhisper)
            return;
        var data = await LoadWhispersAsync(new[] { turn });
        if (!data.CanSee(turn, viewerId, campaign.UserId == viewerId))
            throw new KeyNotFoundException("Mensagem não encontrada.");
    }

    private ChatWhisperInfo? WhisperInfoOf(Turn turn, WhisperData data)
    {
        if (!turn.IsWhisper || data.Masked.Contains(turn.TurnId))
            return null;
        var targets = data.Targets.GetValueOrDefault(turn.TurnId, new List<TurnWhisperTarget>());
        return new ChatWhisperInfo
        {
            Master = targets.Any(w => w.CharacterId == null),
            Recipients = targets.Select(w => w.CharacterId is long c && data.Characters.TryGetValue(c, out var character)
                ? new ChatPollVoterInfo { CharacterId = c, Name = character.Name, ImageUrl = _imageStorage.GetUrl(character.Image) }
                : new ChatPollVoterInfo { CharacterId = null, Name = MASTER_VOTER }).ToList()
        };
    }

    /// <summary>The users who see a whisper whole: author, master and the owners of its targets.</summary>
    private async Task<(HashSet<long> Audience, WhisperData Data)> AudienceOfAsync(Campaign campaign, Turn turn)
    {
        var data = await LoadWhispersAsync(new[] { turn });
        return (WhisperAudience.Audience(turn.UserId, campaign.UserId, data.OwnersOf(turn.TurnId)), data);
    }

    /// <summary>
    /// Publishes a chat event of an entry: to the whole table, or — for a whisper — whole to its audience and, for a
    /// whispered action, masked to everyone else (a whispered message goes to nobody else).
    /// </summary>
    private async Task PublishEntryAsync(Campaign campaign, long actorUserId, Turn turn, ChatItemInfo item, string type)
    {
        var full = TableEvents.Create(type, campaign.CampaignId, actorUserId, data: item);
        if (!turn.IsWhisper)
        {
            await _notifier.PublishAsync(full);
            return;
        }
        var (audience, _) = await AudienceOfAsync(campaign, turn);
        TableEventInfo? others = null;
        if (turn.TurnType == TurnType.Action)
        {
            // Mapped for nobody in particular (user 0): the masked item everyone outside the whisper gets.
            var fresh = await _repository.GetByIdAsync(turn.TurnId) ?? turn;
            var masked = (await MapChatAsync(campaign, 0, new List<Turn> { fresh })).Single();
            others = TableEvents.Create(type, campaign.CampaignId, actorUserId, data: masked);
        }
        await _notifier.PublishSplitAsync(full, audience, others);
    }

    /// <summary>N1 of a whispered message goes only to its targets (the master only when targeted).</summary>
    private async Task<TableNotice> RestrictNoticeAsync(Campaign campaign, Turn turn, TableNotice notice)
    {
        if (!turn.IsWhisper)
            return notice;
        var data = await LoadWhispersAsync(new[] { turn });
        var masterTargeted = data.Targets.GetValueOrDefault(turn.TurnId, new List<TurnWhisperTarget>()).Any(w => w.CharacterId == null);
        return notice with
        {
            TargetUserIds = WhisperAudience.NoticeTargets(turn.UserId, campaign.UserId, masterTargeted, data.OwnersOf(turn.TurnId))
        };
    }
}
