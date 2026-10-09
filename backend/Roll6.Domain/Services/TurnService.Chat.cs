using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.Domain.Realtime;
using Roll6.Domain.Turns;
using Roll6.DTO.Chat;
using Roll6.DTO.Realtime;

namespace Roll6.Domain.Services;

/// <summary>
/// The campaign chat (041). The turn log and the chat are one timeline: the same entries hold what people say (text,
/// photo, audio), every turn record (move, action, result, change, narration) and the end-of-turn dividers. The chat
/// reads all of it; every turn rule and turn read keeps looking only at the turn records (<see cref="TurnTypes.LOG"/>).
/// </summary>
public partial class TurnService : IChatService
{
    public const int CHAT_PAGE_DEFAULT = 50;
    public const int CHAT_PAGE_MAX = 100;

    /// <summary>"99+": the unread count stops here.</summary>
    public const int UNREAD_CAP = 100;

    public const long MAX_AUDIO_BYTES = 5 * 1024 * 1024;

    public async Task<ChatPageInfo> ListAsync(long userId, long campaignId, string? before, string? after, int? limit)
    {
        var campaign = await GetReadableCampaignAsync(userId, campaignId);
        var size = Math.Clamp(limit ?? CHAT_PAGE_DEFAULT, 1, CHAT_PAGE_MAX);
        var afterCursor = ParseCursor(after, "after");
        var beforeCursor = afterCursor == null ? ParseCursor(before, "before") : null;

        var page = await _repository.ListChatPageAsync(campaignId, beforeCursor, afterCursor, size + 1);
        var hasMore = page.Count > size;
        if (hasMore)
        {
            // One more than asked tells whether there is more; it is the farthest from the cursor.
            if (afterCursor != null) page.RemoveAt(page.Count - 1);
            else page.RemoveAt(0);
        }

        var read = await _chatReadRepository.GetAsync(campaignId, userId);
        var firstUnread = await _repository.FirstUnreadAsync(campaignId, userId, read?.LastReadAt);
        return new ChatPageInfo
        {
            Items = await MapChatAsync(campaign, userId, page),
            HasMore = hasMore,
            UnreadCount = await _repository.CountUnreadAsync(campaignId, userId, read?.LastReadAt, UNREAD_CAP),
            FirstUnreadCursor = firstUnread == null ? null : CursorOf(firstUnread)
        };
    }

    public async Task<ChatItemInfo> SendAsync(long userId, long campaignId, ChatSendInfo info)
    {
        var campaign = await GetReadableCampaignAsync(userId, campaignId);
        var (characterId, displayName, displayImage) = await SpeakerAsync(userId, campaign, info.CharacterId);

        Turn message;
        if (!string.IsNullOrWhiteSpace(info.Audio))
            message = Turn.Recording(campaign.CampaignId, campaign.CurrentMapId, campaign.CurrentTurn, userId, characterId,
                displayName, displayImage, info.Audio, info.AudioSeconds, info.Text);
        else if (!string.IsNullOrWhiteSpace(info.Image))
            message = Turn.Photo(campaign.CampaignId, campaign.CurrentMapId, campaign.CurrentTurn, userId, characterId,
                displayName, displayImage, info.Image, info.Text);
        else
            message = Turn.Text(campaign.CampaignId, campaign.CurrentMapId, campaign.CurrentTurn, userId, characterId,
                displayName, displayImage, info.Text);

        var saved = await _repository.InsertAsync(message);
        var item = (await MapChatAsync(campaign, userId, new List<Turn> { saved })).Single();
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.CHAT_MESSAGE, campaign.CampaignId, userId, data: item));
        return item;
    }

    public async Task<ChatItemInfo> RollAsync(long userId, long campaignId, ChatRollInfo info)
    {
        var campaign = await GetReadableCampaignAsync(userId, campaignId);
        var (characterId, displayName, displayImage) = await SpeakerAsync(userId, campaign, info.CharacterId);
        // Drawn here, never by the client, so everyone sees the same fair roll.
        var dice = Enumerable.Range(0, Turn.ROLL_DICE)
            .Select(_ => System.Security.Cryptography.RandomNumberGenerator.GetInt32(1, Turn.ROLL_SIDES + 1)).ToArray();
        var roll = Turn.DiceRoll(campaign.CampaignId, campaign.CurrentMapId, campaign.CurrentTurn, userId, characterId,
            displayName, displayImage, dice, info.Text);
        var saved = await _repository.InsertAsync(roll);
        var item = (await MapChatAsync(campaign, userId, new List<Turn> { saved })).Single();
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.CHAT_MESSAGE, campaign.CampaignId, userId, data: item));
        return item;
    }

    public async Task DeleteMessageAsync(long userId, long turnId)
    {
        var turn = await _repository.GetByIdAsync(turnId)
            ?? throw new KeyNotFoundException("Mensagem não encontrada.");
        var campaign = await GetReadableCampaignAsync(userId, turn.CampaignId);
        if (!turn.Delete(userId, campaign.UserId == userId))
            return;
        await _repository.UpdateAsync(turn);
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.CHAT_DELETED, campaign.CampaignId, userId,
            data: new { itemKey = KeyOf(turn) }));
        // A deleted narration leaves the turn's reads too (summary, narration, history).
        if (turn.TurnType == TurnType.Narration)
            await PublishTurnChangedAsync(campaign.CampaignId, userId);
    }

    public async Task MarkReadAsync(long userId, long campaignId, string until)
    {
        await GetReadableCampaignAsync(userId, campaignId);
        var cursor = ParseCursor(until, "until")
            ?? throw new DomainValidationException("until", "Informe até onde foi lido.");
        var read = await _chatReadRepository.GetAsync(campaignId, userId);
        if (read == null)
            await _chatReadRepository.InsertAsync(ChatRead.Create(campaignId, userId, cursor.At));
        else if (read.MoveTo(cursor.At))
            await _chatReadRepository.UpdateAsync(read);
    }

    public async Task<ChatAudioUploadInfo> UploadAudioAsync(Stream content, long length)
    {
        if (length <= 0)
            throw new DomainValidationException("file", "Envie o áudio.");
        if (length > MAX_AUDIO_BYTES)
            throw new DomainValidationException("file", "O áudio deve ter no máximo 5 MB.");
        using var buffer = new MemoryStream();
        await content.CopyToAsync(buffer);
        if (buffer.Length > MAX_AUDIO_BYTES)
            throw new DomainValidationException("file", "O áudio deve ter no máximo 5 MB.");
        var (contentType, extension) = AudioFormat(buffer.GetBuffer().AsSpan(0, (int)Math.Min(buffer.Length, 12)))
            ?? throw new DomainValidationException("file", "Formato de áudio não suportado. Use WebM, MP4 ou Ogg.");
        buffer.Position = 0;
        var fileName = await _imageStorage.UploadAsync(buffer, contentType, extension);
        return new ChatAudioUploadInfo { FileName = fileName, Url = _imageStorage.GetUrl(fileName), ContentType = contentType };
    }

    /// <summary>WebM (Chrome/Android), MP4/M4A (Safari/iOS) or Ogg by their signature; null for anything else.</summary>
    public static (string ContentType, string Extension)? AudioFormat(ReadOnlySpan<byte> head)
    {
        if (head.Length >= 4 && head[0] == 0x1A && head[1] == 0x45 && head[2] == 0xDF && head[3] == 0xA3)
            return ("audio/webm", "webm");
        if (head.Length >= 8 && head[4] == (byte)'f' && head[5] == (byte)'t' && head[6] == (byte)'y' && head[7] == (byte)'p')
            return ("audio/mp4", "mp4");
        if (head.Length >= 4 && head[0] == (byte)'O' && head[1] == (byte)'g' && head[2] == (byte)'g' && head[3] == (byte)'S')
            return ("audio/ogg", "ogg");
        return null;
    }

    /// <summary>
    /// Who speaks: one of the sender's characters approved in the campaign, or — with no character — the master. Name
    /// and picture are kept as they are now, so old messages don't change when the character does.
    /// </summary>
    private async Task<(long? CharacterId, string Name, string? Image)> SpeakerAsync(long userId, Campaign campaign, long? characterId)
    {
        if (characterId is not long id)
        {
            if (campaign.UserId != userId)
                throw new UnauthorizedAccessException("Escolha um personagem aprovado para falar.");
            var master = await _userRepository.GetByIdAsync(userId);
            return (null, $"Mestre (GM) — {master?.Name}", null);
        }
        var participation = await _campaignCharacterRepository.GetAsync(campaign.CampaignId, id);
        var character = await _characterRepository.GetByIdAsync(id);
        if (participation?.Status != CampaignCharacterStatus.Approved || character == null || character.UserId != userId)
            throw new UnauthorizedAccessException("Você só pode falar como um personagem seu aprovado na campanha.");
        return (character.CharacterId, character.Name, character.Image);
    }

    /// <summary>
    /// Chat items of a page. Turn records get the summary's labels and text — the movement points spent in the turn
    /// need every turn record of those turns, so they are read whole — plus the pictures of their characters/NPCs.
    /// </summary>
    private async Task<List<ChatItemInfo>> MapChatAsync(Campaign campaign, long userId, List<Turn> page)
    {
        if (page.Count == 0)
            return new List<ChatItemInfo>();

        var logTurns = page.Where(t => t.IsLog && !t.IsDeleted).Select(t => t.TurnNo).Distinct().ToList();
        var logs = logTurns.Count == 0 ? new List<Turn>() : await _repository.ListLogByTurnsAsync(campaign.CampaignId, logTurns);
        var names = await LoadNamesAsync(campaign, logs.Concat(page).ToList(), Array.Empty<long>(), Array.Empty<long>());
        var lines = logs.Zip(BuildLines(logs, names)).ToDictionary(p => p.First.TurnId, p => p.Second);
        var npcIds = page.Where(t => t.NpcId.HasValue).Select(t => t.NpcId!.Value).Distinct().ToList();
        var npcImages = npcIds.Count == 0 ? new Dictionary<long, string?>()
            : (await _npcRepository.ListByIdsAsync(npcIds)).ToDictionary(n => n.NpcId, n => n.Image);
        var isMaster = campaign.UserId == userId;

        return page.Select(t =>
        {
            var item = new ChatItemInfo
            {
                Key = KeyOf(t),
                Cursor = CursorOf(t),
                Kind = KindOf(t.TurnType),
                TurnId = t.TurnId,
                CampaignId = t.CampaignId,
                TurnNo = t.TurnNo,
                CreatedAt = t.CreatedAt,
                UserId = t.UserId,
                MapId = t.MapId,
                CharacterId = t.CharacterId,
                NpcId = t.NpcId,
                MapNpcId = t.MapNpcId,
                Deleted = t.IsDeleted,
                CanDelete = !t.IsDeleted && t.CanBeDeletedBy(userId, isMaster)
            };
            if (t.IsConversation)
            {
                item.DisplayName = t.DisplayName ?? string.Empty;
                item.DisplayImageUrl = _imageStorage.GetUrl(t.DisplayImage);
                if (!t.IsDeleted)
                {
                    item.Text = t.Description;
                    item.ImageUrl = _imageStorage.GetUrl(t.Image);
                    item.AudioUrl = _imageStorage.GetUrl(t.Audio);
                    item.AudioSeconds = t.AudioSeconds;
                    item.AudioType = AudioTypeOf(t.Audio);
                    if (t.TurnType == TurnType.Roll)
                        item.Dice = t.DiceValues().ToList();
                }
            }
            else if (t.TurnType == TurnType.TurnFinished)
            {
                item.Text = $"Turno {t.TurnNo} finalizado";
            }
            else
            {
                FillLogItem(item, t, lines.GetValueOrDefault(t.TurnId), names, npcImages);
            }
            return item;
        }).ToList();
    }

    private void FillLogItem(ChatItemInfo item, Turn t, SummaryLine? line, TurnNames names, Dictionary<long, string?> npcImages)
    {
        if (t.TurnType == TurnType.Narration)
        {
            item.DisplayName = names.AuthorLabel(t) ?? "GM";
            if (!t.IsDeleted)
                item.Text = t.Description;
            return;
        }
        item.DisplayName = t.CharacterId is long characterId ? names.CharacterLabel(characterId) : names.NpcLabel(t.MapNpcId, t.NpcId);
        item.DisplayImageUrl = t.CharacterId is long c && names.Characters.TryGetValue(c, out var character)
            ? _imageStorage.GetUrl(character.Image)
            : t.NpcId is long n ? _imageStorage.GetUrl(npcImages.GetValueOrDefault(n)) : null;
        item.AuthorLabel = line?.Author;
        item.Text = line == null ? null : TurnSummary.Line(line);
        item.Description = t.TurnType is TurnType.Action or TurnType.ActionResult ? t.Description : null;
        if (t is { BeforeX: int bx, BeforeY: int by, BeforeLook: int bl })
            item.Before = new ChatPointInfo { X = bx, Y = by, Look = bl, LookName = TurnSummary.Direction(bl) };
        if (t is { X: int x, Y: int y, Look: int l })
            item.After = new ChatPointInfo { X = x, Y = y, Look = l, LookName = TurnSummary.Direction(l) };
        item.Moved = t.Moved;
        item.MovedTotal = line?.Moved != null ? line.MovedTotal : null;
        item.Changes = t.Changes?.Select(c => new ChatChangeInfo
        {
            Field = c.Field,
            Label = TurnSummary.FieldLabel(c.Field, !t.CharacterId.HasValue),
            Before = TurnSummary.FieldValue(c.Field, c.Before),
            After = TurnSummary.FieldValue(c.Field, c.After)
        }).ToList();
    }

    private static string KeyOf(Turn t) => $"t{t.TurnId}";

    private static string CursorOf(Turn t) => $"{t.CreatedAt.Ticks}_{t.TurnId}";

    /// <summary>"{ticks}_{turnId}" → (created_at, id); null when absent, 400 when malformed.</summary>
    private static (DateTime At, long Id)? ParseCursor(string? cursor, string field)
    {
        if (string.IsNullOrWhiteSpace(cursor))
            return null;
        var parts = cursor.Split('_');
        if (parts.Length != 2 || !long.TryParse(parts[0], out var ticks) || !long.TryParse(parts[1], out var id)
            || ticks < DateTime.MinValue.Ticks || ticks > DateTime.MaxValue.Ticks)
            throw new DomainValidationException(field, "Posição do chat inválida.");
        return (new DateTime(ticks, DateTimeKind.Unspecified), id);
    }

    private static string KindOf(TurnType type) => type switch
    {
        TurnType.Movement => "movement",
        TurnType.Action => "action",
        TurnType.ActionResult => "actionResult",
        TurnType.CharacterUpdate => "characterUpdate",
        TurnType.Narration => "narration",
        TurnType.Text => "text",
        TurnType.Image => "image",
        TurnType.Audio => "audio",
        TurnType.TurnFinished => "turnFinished",
        TurnType.Roll => "roll",
        _ => type.ToString()
    };

    private static string? AudioTypeOf(string? fileName) => Path.GetExtension(fileName ?? string.Empty) switch
    {
        ".webm" => "audio/webm",
        ".mp4" or ".m4a" => "audio/mp4",
        ".ogg" => "audio/ogg",
        _ => null
    };
}
