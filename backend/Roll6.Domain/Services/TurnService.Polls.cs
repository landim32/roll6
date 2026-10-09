using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Notifications;
using Roll6.Domain.Realtime;
using Roll6.DTO.Chat;
using Roll6.DTO.Realtime;

namespace Roll6.Domain.Services;

/// <summary>
/// Polls in the chat (045): a conversation entry whose question is the description, with 2–12 options and one vote per
/// approved character (plus one for the master as "Mestre"), moved or withdrawn at any time, like WhatsApp's polls.
/// </summary>
public partial class TurnService
{
    public const string MASTER_VOTER = "Mestre";

    public async Task<ChatItemInfo> CreatePollAsync(long userId, long campaignId, ChatPollCreateInfo info)
    {
        var campaign = await GetReadableCampaignAsync(userId, campaignId);
        var (characterId, displayName, displayImage) = await SpeakerAsync(userId, campaign, info.CharacterId);
        var poll = Turn.Poll(campaign.CampaignId, campaign.CurrentMapId, campaign.CurrentTurn, userId, characterId,
            displayName, displayImage, info.Question);
        var options = ChatPollOption.CheckAll(info.Options);
        await ApplyReplyAsync(poll, info.ReplyToTurnId);

        Turn saved = poll;
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            saved = await _repository.InsertAsync(poll);
            await _chatPollRepository.InsertOptionsAsync(options.Select((text, i) => ChatPollOption.Create(saved.TurnId, i, text)));
        });

        var item = (await MapChatAsync(campaign, userId, new List<Turn> { saved })).Single();
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.CHAT_MESSAGE, campaign.CampaignId, userId, data: item));
        _queue.Enqueue(TableNotices.Message(campaign.CampaignId, userId, item));
        return item;
    }

    /// <summary>
    /// Puts the voter's single vote on an option (moving it from another one) or withdraws it (<c>optionId</c> null).
    /// The voter is one of the caller's approved characters, or the master with no character.
    /// </summary>
    public async Task<ChatItemInfo> VoteAsync(long userId, long turnId, ChatPollVoteInfo info)
    {
        var turn = await _repository.GetByIdAsync(turnId) ?? throw new KeyNotFoundException("Enquete não encontrada.");
        var campaign = await GetReadableCampaignAsync(userId, turn.CampaignId);
        if (turn.TurnType != TurnType.Poll)
            throw new DomainValidationException("optionId", "Esta mensagem não é uma enquete.");
        if (turn.IsDeleted)
            throw new DomainValidationException("optionId", "Esta enquete foi apagada.");

        if (info.CharacterId is long characterId)
        {
            var character = await _characterRepository.GetByIdAsync(characterId);
            var participation = await _campaignCharacterRepository.GetAsync(campaign.CampaignId, characterId);
            if (character == null || character.UserId != userId || participation?.Status != CampaignCharacterStatus.Approved)
                throw new UnauthorizedAccessException("Você só pode votar com um personagem seu aprovado na campanha.");
        }
        else if (campaign.UserId != userId)
        {
            throw new UnauthorizedAccessException("Escolha um personagem aprovado para votar.");
        }

        ChatPollVote? vote = null;
        if (info.OptionId is long optionId)
        {
            var option = await _chatPollRepository.GetOptionAsync(optionId);
            if (option == null || option.TurnId != turn.TurnId)
                throw new DomainValidationException("optionId", "Esta opção não é desta enquete.");
            vote = ChatPollVote.Create(turn.TurnId, option.ChatPollOptionId, userId, info.CharacterId);
        }
        await _chatPollRepository.SetVoteAsync(turn.TurnId, info.CharacterId, vote);
        return await PublishUpdatedAsync(campaign, userId, turn);
    }

    /// <summary>The polls of a chat page, with their options, votes and the voters' names and pictures.</summary>
    private async Task<Dictionary<long, ChatPollInfo>> LoadPollsAsync(List<Turn> page)
    {
        var ids = page.Where(t => t.TurnType == TurnType.Poll && !t.IsDeleted).Select(t => t.TurnId).ToList();
        if (ids.Count == 0)
            return new Dictionary<long, ChatPollInfo>();
        var options = await _chatPollRepository.ListOptionsByTurnsAsync(ids);
        var votes = await _chatPollRepository.ListVotesByTurnsAsync(ids);
        var characterIds = votes.Where(v => v.CharacterId.HasValue).Select(v => v.CharacterId!.Value).Distinct().ToList();
        var characters = characterIds.Count == 0 ? new Dictionary<long, Character>()
            : (await _characterRepository.ListByIdsAsync(characterIds)).ToDictionary(c => c.CharacterId);

        return page.Where(t => ids.Contains(t.TurnId)).ToDictionary(t => t.TurnId, t =>
        {
            var pollVotes = votes.Where(v => v.TurnId == t.TurnId).ToList();
            return new ChatPollInfo
            {
                Question = t.Description ?? string.Empty,
                TotalVotes = pollVotes.Count,
                Options = options.Where(o => o.TurnId == t.TurnId).Select(o =>
                {
                    var voters = pollVotes.Where(v => v.ChatPollOptionId == o.ChatPollOptionId).Select(v =>
                        v.CharacterId is long c
                            ? new ChatPollVoterInfo
                            {
                                CharacterId = c,
                                Name = characters.TryGetValue(c, out var character) ? character.Name : string.Empty,
                                ImageUrl = characters.TryGetValue(c, out var withImage) ? _imageStorage.GetUrl(withImage.Image) : null
                            }
                            : new ChatPollVoterInfo { Name = MASTER_VOTER }).ToList();
                    return new ChatPollOptionInfo { OptionId = o.ChatPollOptionId, Text = o.Text, Votes = voters.Count, Voters = voters };
                }).ToList()
            };
        });
    }
}
