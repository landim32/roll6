using Roll6.Domain.Models;
using Roll6.DTO.Chat;

namespace Roll6.Domain.Notifications;

/// <summary>Builds the notices of the catalog N1–N7 (043). Pure: the services pass the data they already have.</summary>
public static class TableNotices
{
    private const string MASTER_PREFIX = "Mestre (GM) — ";

    /// <summary>"Mestre (GM) — Rodrigo Landim" → "Mestre (GM) — Rodrigo"; a character's name stays whole.</summary>
    public static string Speaker(string displayName) => displayName.StartsWith(MASTER_PREFIX, StringComparison.Ordinal)
        ? MASTER_PREFIX + NoticeTexts.FirstName(displayName[MASTER_PREFIX.Length..])
        : displayName;

    /// <summary>N1 from a chat item (text, photo, audio, roll).</summary>
    public static TableNotice Message(long campaignId, long actorUserId, ChatItemInfo item)
    {
        var body = item.Kind switch
        {
            "image" => NoticeTexts.PHOTO,
            "audio" => NoticeTexts.AUDIO,
            "roll" => NoticeTexts.Roll(item.Dice?.Sum() ?? 0),
            "poll" => "Enquete: " + NoticeTexts.Excerpt(item.Text),
            "question" => "Pergunta: " + NoticeTexts.Excerpt(item.Text),
            "answer" => "Resposta: " + NoticeTexts.Excerpt(item.Text),
            _ => NoticeTexts.Excerpt(item.Text)
        };
        return new TableNotice
        {
            Kind = NoticeKind.Message,
            CampaignId = campaignId,
            ActorUserId = actorUserId,
            Speaker = Speaker(item.DisplayName),
            Body = body,
            IconUrl = item.DisplayImageUrl
        };
    }

    /// <summary>N1 for a narration of the master.</summary>
    public static TableNotice Narration(long campaignId, long actorUserId, string? text) => new()
    {
        Kind = NoticeKind.Message,
        CampaignId = campaignId,
        ActorUserId = actorUserId,
        Body = NoticeTexts.Narration(text)
    };

    /// <summary>N2: a character's action, to the master only.</summary>
    public static TableNotice Action(long campaignId, long actorUserId, long masterUserId, string characterName, string? description,
        string? iconUrl) => new()
    {
        Kind = NoticeKind.Action,
        CampaignId = campaignId,
        ActorUserId = actorUserId,
        Speaker = characterName,
        Body = NoticeTexts.Excerpt(description),
        IconUrl = iconUrl,
        TargetUserIds = new[] { masterUserId }
    };

    /// <summary>N3 (074): each pending player gets its own body (<see cref="Notifications.Pending.Reminders"/>).</summary>
    public static TableNotice Pending(long campaignId, long actorUserId, IReadOnlyDictionary<long, string> bodiesByUser) => new()
    {
        Kind = NoticeKind.Pending,
        CampaignId = campaignId,
        ActorUserId = actorUserId,
        Body = NoticeTexts.Pending(Array.Empty<string>()),
        BodyByUser = bodiesByUser,
        TargetUserIds = bodiesByUser.Keys.ToList()
    };

    /// <summary>N4: "Turno N terminado. Pode agir novamente" to the players.</summary>
    public static TableNotice TurnFinished(long campaignId, long actorUserId, int finishedTurn, IEnumerable<long> players) => new()
    {
        Kind = NoticeKind.TurnFinished,
        CampaignId = campaignId,
        ActorUserId = actorUserId,
        Body = NoticeTexts.TurnFinished(finishedTurn),
        TargetUserIds = players.Distinct().ToList()
    };

    /// <summary>N5/N6 from the changes of a character in a campaign: PV and Fadiga, to the owner (not when he changed them).</summary>
    public static IEnumerable<TableNotice> Vitals(long campaignId, long actorUserId, long ownerUserId, string characterName,
        IEnumerable<TurnChange> changes, int totalLife, int totalEnergy)
    {
        if (ownerUserId == actorUserId)
            yield break;
        foreach (var change in changes)
        {
            if (!int.TryParse(change.After, out var current))
                continue;
            if (change.Field == "currentLife")
                yield return Personal(NoticeKind.Life, NoticeTexts.Life(current, totalLife));
            else if (change.Field == "currentEnergy")
                yield return Personal(NoticeKind.Fatigue, NoticeTexts.Fatigue(current, totalEnergy));
        }

        TableNotice Personal(NoticeKind kind, string body) => new()
        {
            Kind = kind,
            CampaignId = campaignId,
            ActorUserId = actorUserId,
            Speaker = characterName,
            Body = body,
            TargetUserIds = new[] { ownerUserId }
        };
    }

    /// <summary>N7b (074): a player pokes the master when everyone already acted.</summary>
    public static TableNotice PokeMaster(long campaignId, long actorUserId, string pokerFirstName, long masterUserId) => new()
    {
        Kind = NoticeKind.PokeMaster,
        CampaignId = campaignId,
        ActorUserId = actorUserId,
        Body = NoticeTexts.PokeMaster(pokerFirstName),
        TargetUserIds = new[] { masterUserId }
    };

    /// <summary>
    /// N9 (096): a GM run ended with the turn still open — the master only. The actor is nobody (0): the master is the
    /// one to tell, and an actor is never notified.
    /// </summary>
    public static TableNotice Gm(long campaignId, long masterUserId, int turnNo, string reason) => new()
    {
        Kind = NoticeKind.Gm,
        CampaignId = campaignId,
        ActorUserId = 0,
        Speaker = "Modo GM",
        Body = NoticeTexts.Gm(turnNo, reason),
        TargetUserIds = new[] { masterUserId }
    };

    /// <summary>N7: "Rodrigo está cutucando você".</summary>
    public static TableNotice Poke(long campaignId, long actorUserId, string pokerFirstName, IEnumerable<long> poked) => new()
    {
        Kind = NoticeKind.Poke,
        CampaignId = campaignId,
        ActorUserId = actorUserId,
        Body = NoticeTexts.Poke(pokerFirstName),
        TargetUserIds = poked.Distinct().ToList()
    };
}
