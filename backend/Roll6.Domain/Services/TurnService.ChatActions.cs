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
            if (campaign.CurrentMapId is not long mapId || (await _mapTokenRepository.ListByMapAsync(mapId))
                    .All(p => p.CampaignCharacterId != participation.CampaignCharacterId))
                throw new Exceptions.DomainValidationException("to", "Coloque o personagem no mapa aberto para agir.");
            turn.ToAction(mapId);
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
            await NotifyActionAsync(campaign, userId, characterId, turn.Description);
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
    private async Task<ChatItemInfo> PublishUpdatedAsync(Campaign campaign, long userId, Turn turn)
    {
        var fresh = await _repository.GetByIdAsync(turn.TurnId) ?? turn;
        var item = (await MapChatAsync(campaign, userId, new List<Turn> { fresh })).Single();
        await PublishEntryAsync(campaign, userId, fresh, item, TableEventType.CHAT_UPDATED);
        return item;
    }
}
