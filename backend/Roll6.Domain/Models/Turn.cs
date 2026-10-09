using System.Text.RegularExpressions;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Validation;

namespace Roll6.Domain.Models;

/// <summary>
/// One entry of a campaign turn (016): a move (before/after position and facing, movement points spent), an
/// action or an action result (text), or a character/NPC change (024, list of fields before/after). Belongs to
/// exactly one character or NPC; NPC entries made from the map keep the occurrence (<see cref="MapNpcId"/>)
/// because each piece acts on its own. <see cref="UserId"/> is who made it (the master or the character owner).
/// Since 041 the turn log and the chat are one timeline: the same table also keeps what people say (text, photo,
/// audio) and the "turn finished" dividers — see <see cref="TurnType"/> and <see cref="TurnTypes"/>.
/// </summary>
public class Turn
{
    public const int MAX_DESCRIPTION = 2000;

    /// <summary>A turn narration is longer than an action (027).</summary>
    public const int MAX_NARRATION = 10000;

    /// <summary>Longest chat message (041).</summary>
    public const int MAX_TEXT = 4000;

    public const int MAX_AUDIO_SECONDS = 120;

    /// <summary>Audio file names returned by the chat audio upload (041).</summary>
    private static readonly Regex AUDIO_FILE_NAME_REGEX = new(@"^[0-9a-f]{32}\.(webm|mp4|m4a|ogg)$", RegexOptions.Compiled);

    public long TurnId { get; set; }
    public long CampaignId { get; set; }
    public long? MapId { get; set; }
    public long? CharacterId { get; set; }
    public long? NpcId { get; set; }
    public long? MapNpcId { get; set; }
    public int TurnNo { get; set; }
    public TurnType TurnType { get; set; }
    public int? BeforeX { get; set; }
    public int? BeforeY { get; set; }
    public int? BeforeLook { get; set; }
    public int? X { get; set; }
    public int? Y { get; set; }
    public int? Look { get; set; }
    public string? Description { get; set; }

    /// <summary>Who made the entry (required, 024).</summary>
    public long UserId { get; set; }

    /// <summary>Movement points spent by a move (024).</summary>
    public int? Moved { get; set; }

    /// <summary>Fields changed by a CharacterUpdate (024).</summary>
    public List<TurnChange>? Changes { get; set; }

    public DateTime CreatedAt { get; set; }

    /// <summary>Chat (041): name shown for who spoke, as it was when sent (the character's or "Mestre (GM) — name").</summary>
    public string? DisplayName { get; set; }

    /// <summary>Chat (041): stored picture ({guid}.{ext}) of who spoke, as it was when sent.</summary>
    public string? DisplayImage { get; set; }

    /// <summary>Chat (041): the photo of an <see cref="TurnType.Image"/> message.</summary>
    public string? Image { get; set; }

    /// <summary>Chat (041): the recording of an <see cref="TurnType.Audio"/> message.</summary>
    public string? Audio { get; set; }

    public int? AudioSeconds { get; set; }

    /// <summary>Deleted from the chat (041): kept as "Mensagem apagada", ignored by every turn read.</summary>
    public DateTime? DeletedAt { get; set; }

    /// <summary>An action replaced by another one, reset or deleted (044): shown as "Ação cancelada", out of every turn rule.</summary>
    public DateTime? CancelledAt { get; set; }

    /// <summary>The entry this one answers (044); null when it isn't a reply.</summary>
    public long? ReplyToTurnId { get; set; }

    /// <summary>Chat: the faces of a <see cref="TurnType.Roll"/>, in order, comma separated ("5,3,6").</summary>
    public string? Dice { get; set; }

    /// <summary>The roll of the chat: three dice of six faces (GURPS 3d6).</summary>
    public const int ROLL_DICE = 3;
    public const int ROLL_SIDES = 6;

    /// <summary>Longest reason of a roll ("Ataque com espada").</summary>
    public const int MAX_ROLL_REASON = 260;

    // --- Chat (041) ---

    /// <summary>What someone says in text. <paramref name="characterId"/> null = the master speaking.</summary>
    public static Turn Text(long campaignId, long? mapId, int turnNo, long userId, long? characterId, string displayName,
        string? displayImage, string? text)
    {
        var turn = Speech(campaignId, mapId, turnNo, userId, characterId, displayName, displayImage, TurnType.Text);
        turn.Description = Guard.RequiredText(text, "text", MAX_TEXT);
        return turn;
    }

    public static Turn Photo(long campaignId, long? mapId, int turnNo, long userId, long? characterId, string displayName,
        string? displayImage, string? image, string? caption)
    {
        var turn = Speech(campaignId, mapId, turnNo, userId, characterId, displayName, displayImage, TurnType.Image);
        turn.Image = Guard.ImageFileName(image, "image")
            ?? throw new DomainValidationException("image", "Envie a foto.");
        turn.Description = Guard.OptionalText(caption, "text", MAX_TEXT);
        return turn;
    }

    public static Turn Recording(long campaignId, long? mapId, int turnNo, long userId, long? characterId, string displayName,
        string? displayImage, string? audio, int? seconds, string? caption)
    {
        var turn = Speech(campaignId, mapId, turnNo, userId, characterId, displayName, displayImage, TurnType.Audio);
        var fileName = Guard.OptionalText(audio, "audio", 260);
        if (fileName == null || !AUDIO_FILE_NAME_REGEX.IsMatch(fileName))
            throw new DomainValidationException("audio", "Áudio inválido. Use o fileName retornado pelo upload.");
        if (seconds is not (>= 1 and <= MAX_AUDIO_SECONDS))
            throw new DomainValidationException("audioSeconds", $"O áudio deve ter de 1 a {MAX_AUDIO_SECONDS} segundos.");
        turn.Audio = fileName;
        turn.AudioSeconds = seconds;
        turn.Description = Guard.OptionalText(caption, "text", MAX_TEXT);
        return turn;
    }

    /// <summary>The divider written where a turn ends (finish, process, moving the current turn forward).</summary>
    /// <summary>A dice roll in the chat, as a character or as the master; the faces come drawn by the server.</summary>
    public static Turn DiceRoll(long campaignId, long? mapId, int turnNo, long userId, long? characterId, string displayName,
        string? displayImage, IReadOnlyList<int> dice, string? reason)
    {
        if (dice.Count != ROLL_DICE || dice.Any(d => d is < 1 or > ROLL_SIDES))
            throw new DomainValidationException("dice", $"A jogada deve ter {ROLL_DICE} dados de 1 a {ROLL_SIDES}.");
        var turn = Speech(campaignId, mapId, turnNo, userId, characterId, displayName, displayImage, TurnType.Roll);
        turn.Dice = string.Join(',', dice);
        turn.Description = Guard.OptionalText(reason, "text", MAX_ROLL_REASON);
        return turn;
    }

    /// <summary>
    /// A poll in the chat (045), as a character or as the master: the question goes in the description; the options are
    /// <see cref="ChatPollOption"/> rows checked by <see cref="ChatPollOption.CheckAll"/>.
    /// </summary>
    public static Turn Poll(long campaignId, long? mapId, int turnNo, long userId, long? characterId, string displayName,
        string? displayImage, string? question)
    {
        var turn = Speech(campaignId, mapId, turnNo, userId, characterId, displayName, displayImage, TurnType.Poll);
        var text = question?.Trim();
        if (string.IsNullOrEmpty(text) || text.Length > ChatPollOption.MAX_QUESTION)
            throw new DomainValidationException("question", $"A pergunta deve ter de 1 a {ChatPollOption.MAX_QUESTION} caracteres.");
        turn.Description = text;
        return turn;
    }

    /// <summary>The faces of a roll; empty for anything else.</summary>
    public IReadOnlyList<int> DiceValues() =>
        string.IsNullOrEmpty(Dice) ? Array.Empty<int>() : Dice.Split(',').Select(int.Parse).ToArray();

    /// <summary>
    /// A poke in the chat (043): <c>DisplayName</c> = first name of who poked, <c>Description</c> = the poked first names
    /// ("Ana e Bruno"). Not a turn record and not deletable.
    /// </summary>
    public static Turn Poke(long campaignId, long? mapId, int turnNo, long userId, string displayName, string pokedNames)
    {
        if (turnNo < 1)
            throw new DomainValidationException("turnNo", "O turno deve ser maior que zero.");
        return new Turn
        {
            CampaignId = campaignId,
            MapId = mapId,
            TurnNo = turnNo,
            TurnType = TurnType.Poke,
            UserId = userId,
            DisplayName = Guard.RequiredText(displayName, "displayName", 260),
            Description = Guard.RequiredText(pokedNames, "description", MAX_DESCRIPTION),
            CreatedAt = DateTime.UtcNow
        };
    }

    public static Turn TurnFinished(long campaignId, long? mapId, int turnNo, long userId)
    {
        if (turnNo < 1)
            throw new DomainValidationException("turnNo", "O turno deve ser maior que zero.");
        return new Turn
        {
            CampaignId = campaignId,
            MapId = mapId,
            TurnNo = turnNo,
            TurnType = TurnType.TurnFinished,
            UserId = userId,
            CreatedAt = DateTime.UtcNow
        };
    }

    public bool IsLog => TurnTypes.IsLog(TurnType);

    public bool IsConversation => TurnTypes.IsConversation(TurnType);

    public bool IsDeleted => DeletedAt.HasValue;

    public bool IsCancelled => CancelledAt.HasValue;

    /// <summary>The action of the turn that counts (044): an Action neither deleted nor cancelled.</summary>
    public bool IsValidAction => TurnType == TurnType.Action && !IsDeleted && !IsCancelled;

    /// <summary>What can be answered and reacted to (044): what people say, actions and narrations.</summary>
    public bool CanReply => !IsDeleted && (IsConversation || TurnType is TurnType.Action or TurnType.Narration);

    /// <summary>Cancels a valid action (044). False when it was not one.</summary>
    public bool Cancel(DateTime now)
    {
        if (!IsValidAction)
            return false;
        CancelledAt = now;
        return true;
    }

    /// <summary>Makes this entry an answer to <paramref name="target"/> (044): same campaign and something one can answer.</summary>
    public void SetReply(Turn target)
    {
        if (target.CampaignId != CampaignId || !target.CanReply)
            throw new DomainValidationException("replyToTurnId", "Só é possível responder a mensagens, ações e narrações desta campanha.");
        ReplyToTurnId = target.TurnId;
    }

    /// <summary>A text message of a character becomes its action of the turn (044), keeping id, time, reply and reactions.</summary>
    public void ToAction(long? mapId)
    {
        if (TurnType != TurnType.Text || IsDeleted || CharacterId == null)
            throw new DomainValidationException("to", "Só mensagens de texto de um personagem podem virar ação.");
        var text = Description?.Trim() ?? string.Empty;
        if (text.Length == 0 || text.Length > MAX_DESCRIPTION)
            throw new DomainValidationException("to", $"A ação deve ter de 1 a {MAX_DESCRIPTION} caracteres.");
        TurnType = TurnType.Action;
        MapId = mapId ?? MapId;
        Description = text;
    }

    /// <summary>A valid action becomes a text message of its character (044), shown with the given name and picture.</summary>
    public void ToMessage(string displayName, string? displayImage)
    {
        if (!IsValidAction || CharacterId == null)
            throw new DomainValidationException("to", "Só a ação vigente de um personagem pode virar mensagem.");
        TurnType = TurnType.Text;
        DisplayName = Guard.RequiredText(displayName, "displayName", 260);
        DisplayImage = displayImage;
    }

    /// <summary>Who may delete it from the chat: the author their own message; the master any message and narrations.</summary>
    public bool CanBeDeletedBy(long userId, bool isMaster) =>
        // A roll can't be taken back by whoever made it: only the master removes one.
        (IsConversation && ((UserId == userId && TurnType != TurnType.Roll) || isMaster)) || (TurnType == TurnType.Narration && isMaster);

    /// <summary>
    /// Deletes it from the chat (041): text, photo, audio (author or master) and narrations (master). Moves, actions,
    /// results, changes and dividers leave only through the turn's own tools. False when it already was deleted.
    /// </summary>
    public bool Delete(long userId, bool isMaster)
    {
        // 044: deleting an action from the chat cancels it (the author/owner check is the service's).
        if (TurnType == TurnType.Action)
        {
            if (IsCancelled || IsDeleted)
                throw new DomainValidationException("type", "Esta ação já foi cancelada.");
            return Cancel(DateTime.UtcNow);
        }
        if (!IsConversation && TurnType != TurnType.Narration)
            throw new DomainValidationException("type", "Este registro do turno não pode ser apagado pelo chat.");
        if (!CanBeDeletedBy(userId, isMaster))
            throw new UnauthorizedAccessException("Só o autor ou o mestre podem apagar esta mensagem.");
        if (IsDeleted)
            return false;
        DeletedAt = DateTime.UtcNow;
        return true;
    }

    private static Turn Speech(long campaignId, long? mapId, int turnNo, long userId, long? characterId, string displayName,
        string? displayImage, TurnType type)
    {
        if (userId <= 0)
            throw new DomainValidationException("userId", "Informe quem fez o registro.");
        if (turnNo < 1)
            throw new DomainValidationException("turnNo", "O turno deve ser maior que zero.");
        return new Turn
        {
            CampaignId = campaignId,
            MapId = mapId,
            CharacterId = characterId,
            TurnNo = turnNo,
            TurnType = type,
            UserId = userId,
            DisplayName = Guard.RequiredText(displayName, "displayName", 260),
            DisplayImage = displayImage,
            CreatedAt = DateTime.UtcNow
        };
    }

    public static Turn Movement(long campaignId, long? mapId, long? characterId, long? npcId, long? mapNpcId, int turnNo,
        long userId, (int X, int Y, int Look) before, (int X, int Y, int Look) after, int? moved = null)
    {
        var turn = Create(campaignId, mapId, characterId, npcId, mapNpcId, turnNo, userId, TurnType.Movement);
        if (moved < 0)
            throw new DomainValidationException("moved", "Os pontos de movimento não podem ser negativos.");
        turn.Moved = moved;
        turn.BeforeX = before.X;
        turn.BeforeY = before.Y;
        turn.BeforeLook = CheckLook(before.Look, "beforeLook");
        turn.X = after.X;
        turn.Y = after.Y;
        turn.Look = CheckLook(after.Look, "look");
        return turn;
    }

    public static Turn Action(long campaignId, long? mapId, long? characterId, long? npcId, long? mapNpcId, int turnNo,
        long userId, string? description)
    {
        var turn = Create(campaignId, mapId, characterId, npcId, mapNpcId, turnNo, userId, TurnType.Action);
        turn.Description = RequiredText(description);
        return turn;
    }

    public static Turn ActionResult(long campaignId, long? mapId, long? characterId, long? npcId, long? mapNpcId, int turnNo,
        long userId, string? description)
    {
        var turn = Create(campaignId, mapId, characterId, npcId, mapNpcId, turnNo, userId, TurnType.ActionResult);
        turn.Description = RequiredText(description);
        return turn;
    }

    /// <summary>A change to a character/NPC during the turn (024); only built when something changed.</summary>
    public static Turn CharacterUpdate(long campaignId, long? mapId, long? characterId, long? npcId, long? mapNpcId, int turnNo,
        long userId, IReadOnlyCollection<TurnChange> changes)
    {
        CheckChanges(changes);
        var turn = Create(campaignId, mapId, characterId, npcId, mapNpcId, turnNo, userId, TurnType.CharacterUpdate);
        turn.Changes = changes.ToList();
        return turn;
    }

    /// <summary>What happened in the whole turn (027): written by the master when the turn is processed, no actor.</summary>
    public static Turn Narration(long campaignId, long? mapId, int turnNo, long userId, string? text)
    {
        if (userId <= 0)
            throw new DomainValidationException("userId", "Informe quem fez o registro.");
        if (turnNo < 1)
            throw new DomainValidationException("turnNo", "O turno deve ser maior que zero.");
        return new Turn
        {
            CampaignId = campaignId,
            MapId = mapId,
            TurnNo = turnNo,
            TurnType = TurnType.Narration,
            UserId = userId,
            Description = Guard.RequiredText(text, "narration", MAX_NARRATION),
            CreatedAt = DateTime.UtcNow
        };
    }

    /// <summary>Entries can only go to a turn that already started (030).</summary>
    public static void EnsureTurnInRange(int turnNo, int currentTurn)
    {
        if (turnNo < 1 || turnNo > currentTurn)
            throw new DomainValidationException("turnNo", $"O turno deve estar entre 1 e o turno atual ({currentTurn}).");
    }

    // --- Changes made by the master (030): type, actor, author and creation date never change. ---

    public void MoveToTurn(int turnNo, int currentTurn)
    {
        EnsureTurnInRange(turnNo, currentTurn);
        TurnNo = turnNo;
    }

    public void ChangeMap(long mapId)
    {
        MapId = mapId;
    }

    /// <summary>Text of an action, action result or narration.</summary>
    public void ChangeText(string? text)
    {
        Description = TurnType switch
        {
            TurnType.Action or TurnType.ActionResult => RequiredText(text),
            TurnType.Narration => Guard.RequiredText(text, "description", MAX_NARRATION),
            _ => throw NotForType("description")
        };
    }

    /// <summary>Positions, facings and points of a move; only the given values change.</summary>
    public void ChangeMovement(int? beforeX, int? beforeY, int? beforeLook, int? x, int? y, int? look, int? moved)
    {
        if (TurnType != TurnType.Movement)
        {
            var field = new (string Name, int? Value)[]
            {
                ("beforeX", beforeX), ("beforeY", beforeY), ("beforeLook", beforeLook), ("x", x), ("y", y), ("look", look), ("moved", moved)
            }.First(f => f.Value.HasValue).Name;
            throw NotForType(field);
        }
        if (moved < 0)
            throw new DomainValidationException("moved", "Os pontos de movimento não podem ser negativos.");
        if (beforeLook.HasValue) BeforeLook = CheckLook(beforeLook.Value, "beforeLook");
        if (look.HasValue) Look = CheckLook(look.Value, "look");
        if (beforeX.HasValue) BeforeX = beforeX;
        if (beforeY.HasValue) BeforeY = beforeY;
        if (x.HasValue) X = x;
        if (y.HasValue) Y = y;
        if (moved.HasValue) Moved = moved;
    }

    /// <summary>Replaces the fields listed by a character/NPC change.</summary>
    public void ChangeChanges(IReadOnlyCollection<TurnChange> changes)
    {
        if (TurnType != TurnType.CharacterUpdate)
            throw NotForType("changes");
        CheckChanges(changes);
        Changes = changes.ToList();
    }

    private static void CheckChanges(IReadOnlyCollection<TurnChange> changes)
    {
        if (changes.Count == 0)
            throw new DomainValidationException("changes", "Nenhuma alteração para registrar.");
        if (changes.Any(c => string.IsNullOrWhiteSpace(c.Field)))
            throw new DomainValidationException("changes", "Informe o campo de cada alteração.");
    }

    private static DomainValidationException NotForType(string field) =>
        new(field, "Este campo não vale para este tipo de registro.");

    private static Turn Create(long campaignId, long? mapId, long? characterId, long? npcId, long? mapNpcId, int turnNo,
        long userId, TurnType type)
    {
        if (userId <= 0)
            throw new DomainValidationException("userId", "Informe quem fez o registro.");
        if (characterId.HasValue == npcId.HasValue)
            throw new DomainValidationException("characterId", "Informe um personagem ou um NPC.");
        if (mapNpcId.HasValue && !npcId.HasValue)
            throw new DomainValidationException("mapNpcId", "A ocorrência só vale para NPCs.");
        if (turnNo < 1)
            throw new DomainValidationException("turnNo", "O turno deve ser maior que zero.");
        return new Turn
        {
            CampaignId = campaignId,
            MapId = mapId,
            CharacterId = characterId,
            NpcId = npcId,
            MapNpcId = mapNpcId,
            TurnNo = turnNo,
            TurnType = type,
            UserId = userId,
            CreatedAt = DateTime.UtcNow
        };
    }

    private static string RequiredText(string? description) =>
        Guard.RequiredText(description, "description", MAX_DESCRIPTION);

    private static int CheckLook(int look, string field)
    {
        if (look < 0 || look > MapToken.MAX_LOOK)
            throw new DomainValidationException(field, $"O sentido deve estar entre 0 e {MapToken.MAX_LOOK}.");
        return look;
    }
}
