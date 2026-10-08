using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Validation;

namespace Roll6.Domain.Models;

/// <summary>
/// Participation of a character in a campaign. Transitions:
/// invite → Invited (Denied → Invited, RequestedAccess → Approved);
/// request → Approved (open campaign) or RequestedAccess (closed);
/// Invited → Approved/Denied by the character owner; RequestedAccess → Approved/Denied by the master.
/// Holds what belongs to the character in this campaign: current life/energy (totals live in <see cref="Character"/>),
/// the movement limit on this campaign's maps (Deslocamento, 037), the character status and the campaign sheet.
/// The owner or the master may change them.
/// </summary>
public class CampaignCharacter
{
    public long CampaignCharacterId { get; set; }
    public long CampaignId { get; set; }
    public long CharacterId { get; set; }
    public CampaignCharacterStatus Status { get; set; }
    public int CurrentLife { get; set; }
    public int CurrentEnergy { get; set; }

    /// <summary>
    /// Movement points a player may spend per turn with this character on the campaign's maps ("Deslocamento", 037):
    /// copied from <see cref="Character.Move"/> on joining, then changed by the owner or the master; it follows the
    /// character's move only while it still equals the old one. Never limits the master.
    /// </summary>
    public int CurrentMove { get; set; }

    /// <summary>Free-text condition in this campaign ("envenenado"); not the participation <see cref="Status"/>.</summary>
    public string? CharacterStatus { get; set; }

    /// <summary>
    /// The character's sheet in this campaign ("Ficha da Campanha"): copied from <see cref="Character.Sheet"/> when
    /// the participation is created or becomes approved, and from then on it evolves only here (032, reverting the
    /// campaign notes of 023). The character's own sheet never changes through campaign play.
    /// </summary>
    public string? Sheet { get; set; }

    /// <summary>
    /// Stored name ({guid}.{ext}) of this campaign's sheet file (image or PDF). Copied from
    /// <see cref="Character.SheetFile"/> when the participation is created or becomes approved; afterwards the two
    /// references are independent, because stored files are write-once and never overwritten (032).
    /// </summary>
    public string? SheetFile { get; set; }

    /// <summary>Standing, down or out of combat in this campaign (031); every piece of the character shows it.</summary>
    public Posture Posture { get; set; } = Posture.Standing;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    /// <summary>Access request, approved directly when <paramref name="autoApprove"/> (open campaign or the master's own character).</summary>
    public static CampaignCharacter RequestAccess(long campaignId, Character character, bool autoApprove)
    {
        return Create(campaignId, character,
            autoApprove ? CampaignCharacterStatus.Approved : CampaignCharacterStatus.RequestedAccess);
    }

    public static CampaignCharacter CreateInvite(long campaignId, Character character)
    {
        return Create(campaignId, character, CampaignCharacterStatus.Invited);
    }

    /// <summary>A character that already has a participation cannot request access again.</summary>
    public void EnsureCanRequestAgain()
    {
        throw new ConflictException(Status switch
        {
            CampaignCharacterStatus.Approved => "O personagem já participa desta campanha.",
            CampaignCharacterStatus.Invited => "O personagem foi convidado: aceite o convite.",
            CampaignCharacterStatus.RequestedAccess => "Já existe um pedido de acesso pendente para este personagem.",
            _ => "O acesso deste personagem foi recusado; aguarde um convite do mestre."
        });
    }

    public void Invite(Character character)
    {
        switch (Status)
        {
            case CampaignCharacterStatus.Denied:
                ChangeTo(CampaignCharacterStatus.Invited);
                break;
            case CampaignCharacterStatus.RequestedAccess:
                Join(character);
                break;
            case CampaignCharacterStatus.Invited:
                throw new ConflictException("O personagem já foi convidado.");
            default:
                throw new ConflictException("O personagem já participa desta campanha.");
        }
    }

    public void AcceptInvite(Character character)
    {
        EnsureStatus(CampaignCharacterStatus.Invited, "Não há convite pendente para aceitar.");
        Join(character);
    }

    public void DeclineInvite() => Transition(CampaignCharacterStatus.Invited, CampaignCharacterStatus.Denied, "Não há convite pendente para recusar.");

    public void ApproveRequest(Character character)
    {
        EnsureStatus(CampaignCharacterStatus.RequestedAccess, "Não há pedido de acesso pendente para aprovar.");
        Join(character);
    }

    public void DenyRequest() => Transition(CampaignCharacterStatus.RequestedAccess, CampaignCharacterStatus.Denied, "Não há pedido de acesso pendente para recusar.");

    /// <summary>
    /// What changes during play: current life/energy (never above the totals, may be negative; that does not change posture),
    /// the character status and the campaign notes. Only while approved.
    /// </summary>
    public void UpdatePlay(int currentLife, int currentEnergy, string? characterStatus, string? sheet, int totalLife, int totalEnergy)
    {
        if (Status != CampaignCharacterStatus.Approved)
            throw new ConflictException("Só personagens aprovados na campanha podem ter os dados da campanha alterados.");
        if (currentLife > totalLife)
            throw new DomainValidationException("currentLife", $"A vida atual não pode passar do total ({totalLife}).");
        if (currentEnergy > totalEnergy)
            throw new DomainValidationException("currentEnergy", $"A energia atual não pode passar do total ({totalEnergy}).");
        CharacterStatus = Guard.OptionalText(characterStatus, "characterStatus", 260);
        Sheet = Guard.OptionalText(sheet, "sheet", 20000);
        CurrentLife = currentLife;
        CurrentEnergy = currentEnergy;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Changes the posture; false when it already was that one. Only while approved.</summary>
    public bool ChangePosture(int posture)
    {
        if (Status != CampaignCharacterStatus.Approved)
            throw new ConflictException("Só personagens aprovados na campanha podem ter os dados da campanha alterados.");
        var value = Guard.ValidPosture(posture, "posture");
        if (value == Posture)
            return false;
        Posture = value;
        UpdatedAt = DateTime.UtcNow;
        return true;
    }

    /// <summary>Changes the movement limit in this campaign (037); false when it already was that one. Only while approved.</summary>
    public bool ChangeMove(int value)
    {
        if (Status != CampaignCharacterStatus.Approved)
            throw new ConflictException("Só personagens aprovados na campanha podem ter os dados da campanha alterados.");
        if (value < 0)
            throw new DomainValidationException("currentMove", "O deslocamento não pode ser negativo.");
        if (value == CurrentMove)
            return false;
        CurrentMove = value;
        UpdatedAt = DateTime.UtcNow;
        return true;
    }

    /// <summary>
    /// Changes this campaign's sheet file (032): a stored name from POST /api/document replaces it, an empty string
    /// removes it and null keeps the current one — this update is partial, unlike the character's. Only while approved;
    /// who may call it (owner or campaign master) is checked by the service.
    /// </summary>
    public void ChangeSheetFile(string? sheetFile)
    {
        if (Status != CampaignCharacterStatus.Approved)
            throw new ConflictException("Só personagens aprovados na campanha podem ter os dados da campanha alterados.");
        if (sheetFile is null)
            return;
        var value = Guard.SheetFileName(sheetFile, "sheetFile");
        if (value == SheetFile)
            return;
        SheetFile = value;
        UpdatedAt = DateTime.UtcNow;
    }

    private static CampaignCharacter Create(long campaignId, Character character, CampaignCharacterStatus status)
    {
        var now = DateTime.UtcNow;
        var participation = new CampaignCharacter
        {
            CampaignId = campaignId,
            CharacterId = character.CharacterId,
            Status = status,
            CreatedAt = now,
            UpdatedAt = now
        };
        participation.ResetFrom(character);
        return participation;
    }

    /// <summary>Entering the campaign: approved, starting over from the character (see <see cref="ResetFrom"/>).</summary>
    private void Join(Character character)
    {
        ResetFrom(character);
        ChangeTo(CampaignCharacterStatus.Approved);
    }

    /// <summary>
    /// Fresh start in the campaign (032 FR-003): current values at the character's totals and move, the campaign sheet and
    /// its file copied from the character, no status and standing. Done when the participation is created or
    /// becomes approved — the only copy there is, nothing re-syncs afterwards.
    /// </summary>
    private void ResetFrom(Character character)
    {
        CurrentLife = character.Life;
        CurrentEnergy = character.Energy;
        CurrentMove = character.Move;
        Sheet = character.Sheet;
        SheetFile = character.SheetFile;
        CharacterStatus = null;
        Posture = Posture.Standing;
    }

    private void EnsureStatus(CampaignCharacterStatus expected, string error)
    {
        if (Status != expected)
            throw new ConflictException(error);
    }

    private void Transition(CampaignCharacterStatus from, CampaignCharacterStatus to, string error)
    {
        EnsureStatus(from, error);
        ChangeTo(to);
    }

    private void ChangeTo(CampaignCharacterStatus status)
    {
        Status = status;
        UpdatedAt = DateTime.UtcNow;
    }
}
