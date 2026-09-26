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
/// the character status and the campaign's copy of the sheet. The owner or the master may change them.
/// </summary>
public class CampaignCharacter
{
    public long CampaignCharacterId { get; set; }
    public long CampaignId { get; set; }
    public long CharacterId { get; set; }
    public CampaignCharacterStatus Status { get; set; }
    public int CurrentLife { get; set; }
    public int CurrentEnergy { get; set; }

    /// <summary>Free-text condition in this campaign ("envenenado"); not the participation <see cref="Status"/>.</summary>
    public string? CharacterStatus { get; set; }

    /// <summary>The campaign's sheet: a copy of the character's sheet taken when joining, independent afterwards.</summary>
    public string? Sheet { get; set; }
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
    /// What changes during play: current life/energy (never above the totals, may be negative = fallen),
    /// the character status and the campaign sheet. Only while approved.
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
    /// Fresh start in the campaign (010 FR-003): current values at the character's totals, a copy of its sheet
    /// and no status. Done when the participation is created or becomes approved.
    /// </summary>
    private void ResetFrom(Character character)
    {
        CurrentLife = character.Life;
        CurrentEnergy = character.Energy;
        Sheet = character.Sheet;
        CharacterStatus = null;
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
