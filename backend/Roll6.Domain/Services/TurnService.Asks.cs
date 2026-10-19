using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.Domain.Notifications;
using Roll6.DTO.Chat;
using Roll6.DTO.Realtime;

namespace Roll6.Domain.Services;

/// <summary>
/// "Perguntar" (093): a question in the chat answered by the campaign master's local Claude through his Roll6.Console.
/// Questions and answers are conversation entries; a private question is a whisper to the master (only the author and
/// the master see it) and its answer a whisper to the question's speaker — the 047 audience does the rest everywhere.
/// One waiting question per participant (Q3 = A), two minutes to answer (Q2 = B), the master corrects answers (Q1 = B).
/// </summary>
public partial class TurnService : IAskService
{
    /// <summary>How long a question may wait for its answer before it fails (Q2 = B).</summary>
    public static readonly TimeSpan ASK_TIMEOUT = TimeSpan.FromMinutes(2);

    public const string ASK_OFFLINE = "O console do mestre não está conectado.";
    public const string ASK_WAITING = "Aguarde a resposta da sua pergunta.";

    public async Task<ChatItemInfo> AskAsync(long userId, long campaignId, ChatAskInfo info)
    {
        var campaign = await GetReadableCampaignAsync(userId, campaignId);
        var (characterId, displayName, displayImage) = await SpeakerAsync(userId, campaign, info.CharacterId);
        var question = Turn.Question(campaign.CampaignId, campaign.CurrentMapId, campaign.CurrentTurn, userId, characterId,
            displayName, displayImage, info.Text);
        if (!_askDispatcher.IsAgentConnected(campaign.UserId))
            throw new ConflictException(ASK_OFFLINE);
        if (await _repository.GetWaitingAskAsync(campaign.CampaignId, userId) != null)
            throw new ConflictException(ASK_WAITING);

        // Private: only the author and the master — a whisper to the master (none when the master asks: then only him).
        List<long?>? whisper = !info.Private ? null : campaign.UserId == userId ? new List<long?>() : new List<long?> { null };
        var saved = await SaveEntryAsync(question, whisper);
        var item = (await MapChatAsync(campaign, userId, new List<Turn> { saved })).Single();
        await PublishEntryAsync(campaign, userId, saved, item, TableEventType.CHAT_MESSAGE);
        _queue.Enqueue(await RestrictNoticeAsync(campaign, saved, TableNotices.Message(campaign.CampaignId, userId, item)));
        await _askDispatcher.EnqueueAsync(new AskJob(campaign.CampaignId, saved.TurnId, campaign.UserId, campaign.Name,
            TableNotices.Speaker(displayName), saved.Description ?? string.Empty));
        return item;
    }

    public async Task<AskStatusInfo> StatusAsync(long userId, long campaignId)
    {
        var campaign = await GetReadableCampaignAsync(userId, campaignId);
        var waiting = await _repository.GetWaitingAskAsync(campaign.CampaignId, userId);
        return new AskStatusInfo { Available = _askDispatcher.IsAgentConnected(campaign.UserId), WaitingTurnId = waiting?.TurnId };
    }

    public async Task CompleteAsync(long turnId, string text)
    {
        var question = await _repository.GetByIdAsync(turnId);
        if (question == null || question.TurnType != TurnType.Question || question.AskState != AskState.Waiting)
            return;
        var campaign = await _campaignRepository.GetByIdAsync(question.CampaignId);
        if (campaign == null)
            return;
        Turn answer;
        try
        {
            answer = Turn.Answer(question, campaign.UserId, text);
        }
        catch (DomainValidationException)
        {
            await FailAsync(turnId);
            return;
        }
        // The answer keeps the question's privacy: whispered to its speaker (the master always sees whispers).
        List<long?>? whisper = !question.IsWhisper ? null
            : question.CharacterId is long character ? new List<long?> { character } : new List<long?>();
        question.MarkAnswered();
        var saved = await SaveEntryAsync(answer, whisper, async () => await _repository.UpdateAsync(question));
        var answerItem = (await MapChatAsync(campaign, campaign.UserId, new List<Turn> { saved })).Single();
        await PublishEntryAsync(campaign, campaign.UserId, saved, answerItem, TableEventType.CHAT_MESSAGE);
        _queue.Enqueue(await RestrictNoticeAsync(campaign, saved, TableNotices.Message(campaign.CampaignId, campaign.UserId, answerItem)));
        await PublishQuestionAsync(campaign, question);
    }

    public async Task FailAsync(long turnId)
    {
        var question = await _repository.GetByIdAsync(turnId);
        if (question == null || !question.MarkFailed())
            return;
        var campaign = await _campaignRepository.GetByIdAsync(question.CampaignId);
        await _repository.UpdateAsync(question);
        if (campaign != null)
            await PublishQuestionAsync(campaign, question);
    }

    public async Task<List<long>> FailExpiredAsync(DateTime now)
    {
        var failed = new List<long>();
        foreach (var question in await _repository.ListWaitingAsksOlderThanAsync(now - ASK_TIMEOUT))
        {
            await FailAsync(question.TurnId);
            failed.Add(question.TurnId);
        }
        return failed;
    }

    public async Task<ChatItemInfo> EditAnswerAsync(long userId, long turnId, ChatAnswerEditInfo info)
    {
        var answer = await _repository.GetByIdAsync(turnId) ?? throw new KeyNotFoundException("Mensagem não encontrada.");
        var campaign = await GetReadableCampaignAsync(userId, answer.CampaignId);
        if (campaign.UserId != userId)
            throw new UnauthorizedAccessException("Só o mestre corrige as respostas do Claude.");
        answer.EditAnswer(info.Text, DateTime.UtcNow);
        var saved = await _repository.UpdateAsync(answer);
        var item = (await MapChatAsync(campaign, userId, new List<Turn> { saved })).Single();
        await PublishEntryAsync(campaign, userId, saved, item, TableEventType.CHAT_UPDATED);
        return item;
    }

    /// <summary>The question's new state reaches everyone who sees it.</summary>
    private async Task PublishQuestionAsync(Campaign campaign, Turn question)
    {
        var fresh = await _repository.GetByIdAsync(question.TurnId) ?? question;
        var item = (await MapChatAsync(campaign, fresh.UserId, new List<Turn> { fresh })).Single();
        await PublishEntryAsync(campaign, fresh.UserId, fresh, item, TableEventType.CHAT_UPDATED);
    }
}
