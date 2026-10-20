using Roll6.Domain.Enums;
using Roll6.Domain.Models;
using Roll6.Domain.Realtime;
using Roll6.DTO.Chat;
using Roll6.DTO.Realtime;

namespace Roll6.Domain.Services;

/// <summary>
/// The chat's per-entry actions (044): replies, Curtir/Amei and converting a text into the character's action (and back);
/// plus the rule that a character has one valid action per turn — the previous one is cancelled, not deleted.
/// </summary>
public partial class TurnService
{
    /// <summary>Sets (like/love), switches or removes (null or the same kind) the caller's reaction.</summary>
    public async Task<ChatItemInfo> ReactAsync(long userId, long turnId, ChatReactInfo info)
    {
        var turn = await _repository.GetByIdAsync(turnId) ?? throw new KeyNotFoundException("Mensagem não encontrada.");
        var campaign = await GetReadableCampaignAsync(userId, turn.CampaignId);
        await EnsureVisibleAsync(campaign, userId, turn);
        if (!turn.CanReply)
            throw new Exceptions.DomainValidationException("kind", "Não é possível reagir a esta entrada.");
        var existing = await _chatReactionRepository.GetAsync(turnId, userId);
        if (string.IsNullOrWhiteSpace(info.Kind))
        {
            if (existing != null)
                await _chatReactionRepository.DeleteAsync(existing.ChatReactionId);
        }
        else
        {
            var kind = ChatReaction.Parse(info.Kind);
            if (existing == null)
                await _chatReactionRepository.InsertAsync(ChatReaction.Create(turnId, userId, kind));
            else if (existing.Kind == kind)
                await _chatReactionRepository.DeleteAsync(existing.ChatReactionId);
            else
            {
                existing.Kind = kind;
                await _chatReactionRepository.UpdateAsync(existing);
            }
        }
        return await PublishUpdatedAsync(campaign, userId, turn);
    }

    /// <summary>
    /// Text of a character → its action of the current turn (cancelling the previous valid one), or the valid action →
    /// text. The owner of the character or the master; the entry keeps id, time, reply and reactions.
    /// </summary>
    public async Task<ChatItemInfo> ConvertAsync(long userId, long turnId, ChatConvertInfo info)
    {
        var turn = await _repository.GetByIdAsync(turnId) ?? throw new KeyNotFoundException("Mensagem não encontrada.");
        var campaign = await GetReadableCampaignAsync(userId, turn.CampaignId);
        await EnsureVisibleAsync(campaign, userId, turn);
        campaign.EnsurePlayable(); // 049: the turn moves only while the campaign is active
        if (turn.TurnNo != campaign.CurrentTurn)
            throw new Exceptions.DomainValidationException("to", "Só entradas do turno atual podem ser convertidas.");
        if (turn.CharacterId is not long characterId)
            throw new Exceptions.DomainValidationException("to", "Só mensagens e ações de um personagem podem ser convertidas.");
        var character = await _characterRepository.GetByIdAsync(characterId)
            ?? throw new KeyNotFoundException("Personagem não encontrado.");
        if (character.UserId != userId && campaign.UserId != userId)
            throw new UnauthorizedAccessException("Só o dono do personagem ou o mestre podem converter.");
        var participation = await _campaignCharacterRepository.GetAsync(campaign.CampaignId, characterId);
        if (participation == null || participation.Status != CampaignCharacterStatus.Approved)
            throw new UnauthorizedAccessException("O personagem não está aprovado nesta campanha.");

        var to = info.To?.Trim().ToLowerInvariant();
        if (to == "action")
        {
            // 080: a character acts with or without a piece; the action is kept on the current map, if any.
            turn.ToAction(campaign.CurrentMapId);
            // 044/073: one valid action per character and turn, in any mode.
            var cancelled = await CancelValidActionsAsync(campaign, characterId, null, except: turn.TurnId);
            await _unitOfWork.ExecuteInTransactionAsync(async () =>
            {
                foreach (var previous in cancelled)
                    await _repository.UpdateAsync(previous);
                await _repository.UpdateAsync(turn);
            });
            foreach (var previous in cancelled)
                await PublishUpdatedAsync(campaign, userId, previous);
            await PublishTurnChangedAsync(campaign.CampaignId, userId);
            await NotifyActionAsync(campaign, userId, characterId, null, turn.Description, firstAction: cancelled.Count == 0);
            // 096: a message turned into the last missing action hands the turn to the GM.
            await CheckAsync(campaign.CampaignId, "action");
        }
        else if (to == "message")
        {
            turn.ToMessage(character.Name, character.Image);
            await _repository.UpdateAsync(turn);
            await PublishTurnChangedAsync(campaign.CampaignId, userId);
        }
        else
        {
            throw new Exceptions.DomainValidationException("to", "Converta para \"action\" ou \"message\".");
        }
        return await PublishUpdatedAsync(campaign, userId, turn);
    }

    /// <summary>The actor's valid actions of the current turn, cancelled in memory (the caller saves them).</summary>
    private async Task<List<Turn>> CancelValidActionsAsync(Campaign campaign, long? characterId, long? mapNpcId, long? except = null)
    {
        var now = DateTime.UtcNow;
        var actions = await _repository.ListValidActionsAsync(campaign.CampaignId, campaign.CurrentTurn, characterId, mapNpcId);
        return actions.Where(a => a.TurnId != except && a.Cancel(now)).ToList();
    }

    /// <summary>The reply target of a new entry, checked (044).</summary>
    private async Task ApplyReplyAsync(Turn entry, long? replyToTurnId)
    {
        if (replyToTurnId is not long id)
            return;
        var target = await _repository.GetByIdAsync(id)
            ?? throw new Exceptions.DomainValidationException("replyToTurnId", "A mensagem respondida não existe mais.");
        if (target.IsWhisper && target.CampaignId == entry.CampaignId
            && await _campaignRepository.GetByIdAsync(target.CampaignId) is { } campaign)
        {
            // 047: a whisper the author can't see can't be answered (it does not exist for them).
            var data = await LoadWhispersAsync(new[] { target });
            if (!data.CanSee(target, entry.UserId, campaign.UserId == entry.UserId))
                throw new Exceptions.DomainValidationException("replyToTurnId", "A mensagem respondida não existe mais.");
        }
        entry.SetReply(target);
    }

    /// <summary>Publishes an entry that changed in place (044) and returns it as the caller sees it.</summary>
    /// <summary>
    /// The master who also plays switches the voice of a message, photo, recording or roll he wrote (079): to one of his
    /// approved characters, or back to the master (characterId null). Any campaign status and any turn — it is
    /// conversation, never a turn record. A whisper can't be switched to one of its own targets.
    /// </summary>
    public async Task<ChatItemInfo> SetSpeakerAsync(long userId, long turnId, ChatSpeakerInfo info)
    {
        var turn = await _repository.GetByIdAsync(turnId) ?? throw new KeyNotFoundException("Mensagem não encontrada.");
        var campaign = await GetReadableCampaignAsync(userId, turn.CampaignId);
        await EnsureVisibleAsync(campaign, userId, turn);
        if (campaign.UserId != userId || turn.UserId != userId)
            throw new UnauthorizedAccessException("Só o mestre muda a voz das próprias mensagens.");
        if (turn.TurnType is not (TurnType.Text or TurnType.Image or TurnType.Audio or TurnType.Roll) || turn.IsDeleted)
            throw new Exceptions.DomainValidationException("characterId", "Só mensagens, fotos, áudios e rolagens mudam de voz.");
        if (turn.CharacterId == info.CharacterId)
            return (await MapChatAsync(campaign, userId, new List<Turn> { turn })).Single();

        var (characterId, name, image) = await SpeakerAsync(userId, campaign, info.CharacterId);
        if (characterId is long id && turn.IsWhisper
            && (await _whisperRepository.ListByTurnsAsync(new[] { turn.TurnId })).Any(t => t.CharacterId == id))
            throw new Exceptions.DomainValidationException("characterId", "Este sussurro é para esse personagem.");
        turn.SetSpeaker(characterId, name, image);
        await _repository.UpdateAsync(turn);
        return await PublishUpdatedAsync(campaign, userId, turn);
    }

    private async Task<ChatItemInfo> PublishUpdatedAsync(Campaign campaign, long userId, Turn turn)
    {
        var fresh = await _repository.GetByIdAsync(turn.TurnId) ?? turn;
        var item = (await MapChatAsync(campaign, userId, new List<Turn> { fresh })).Single();
        await PublishEntryAsync(campaign, userId, fresh, item, TableEventType.CHAT_UPDATED);
        return item;
    }
}
