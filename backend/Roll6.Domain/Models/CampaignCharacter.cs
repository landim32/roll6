using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;

namespace Roll6.Domain.Models;

/// <summary>
/// Participation of a character in a campaign. Transitions:
/// invite → Invited (Denied → Invited, RequestedAccess → Approved);
/// request → Approved (open campaign) or RequestedAccess (closed);
/// Invited → Approved/Denied by the character owner; RequestedAccess → Approved/Denied by the master.
/// Holds the character's current life/energy in this campaign (totals live in <see cref="Character"/>).
/// </summary>
public class CampaignCharacter
{
    public long CampaignCharacterId { get; set; }
    public long CampaignId { get; set; }
    public long CharacterId { get; set; }
    public CampaignCharacterStatus Status { get; set; }
    public int CurrentLife { get; set; }
    public int CurrentEnergy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    /// <summary>Access request, approved directly when <paramref name="autoApprove"/> (open campaign or the master's own character).</summary>
    public static CampaignCharacter RequestAccess(long campaignId, long characterId, bool autoApprove, int totalLife, int totalEnergy)
    {
        return Create(campaignId, characterId,
            autoApprove ? CampaignCharacterStatus.Approved : CampaignCharacterStatus.RequestedAccess, totalLife, totalEnergy);
    }

    public static CampaignCharacter CreateInvite(long campaignId, long characterId, int totalLife, int totalEnergy)
    {
        return Create(campaignId, characterId, CampaignCharacterStatus.Invited, totalLife, totalEnergy);
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

    public void Invite(int totalLife, int totalEnergy)
    {
        switch (Status)
        {
            case CampaignCharacterStatus.Denied:
                ChangeTo(CampaignCharacterStatus.Invited);
                break;
            case CampaignCharacterStatus.RequestedAccess:
                Join(totalLife, totalEnergy);
                break;
            case CampaignCharacterStatus.Invited:
                throw new ConflictException("O personagem já foi convidado.");
            default:
                throw new ConflictException("O personagem já participa desta campanha.");
        }
    }

    public void AcceptInvite(int totalLife, int totalEnergy)
    {
        EnsureStatus(CampaignCharacterStatus.Invited, "Não há convite pendente para aceitar.");
        Join(totalLife, totalEnergy);
    }

    public void DeclineInvite() => Transition(CampaignCharacterStatus.Invited, CampaignCharacterStatus.Denied, "Não há convite pendente para recusar.");

    public void ApproveRequest(int totalLife, int totalEnergy)
    {
        EnsureStatus(CampaignCharacterStatus.RequestedAccess, "Não há pedido de acesso pendente para aprovar.");
        Join(totalLife, totalEnergy);
    }

    public void DenyRequest() => Transition(CampaignCharacterStatus.RequestedAccess, CampaignCharacterStatus.Denied, "Não há pedido de acesso pendente para recusar.");

    /// <summary>Current life/energy in the campaign: only while approved, never above the totals, may be negative (fallen).</summary>
    public void SetVitals(int currentLife, int currentEnergy, int totalLife, int totalEnergy)
    {
        if (Status != CampaignCharacterStatus.Approved)
            throw new ConflictException("Só personagens aprovados na campanha têm vida e energia atuais.");
        if (currentLife > totalLife)
            throw new DomainValidationException("currentLife", $"A vida atual não pode passar do total ({totalLife}).");
        if (currentEnergy > totalEnergy)
            throw new DomainValidationException("currentEnergy", $"A energia atual não pode passar do total ({totalEnergy}).");
        CurrentLife = currentLife;
        CurrentEnergy = currentEnergy;
        UpdatedAt = DateTime.UtcNow;
    }

    private static CampaignCharacter Create(long campaignId, long characterId, CampaignCharacterStatus status, int totalLife, int totalEnergy)
    {
        var now = DateTime.UtcNow;
        return new CampaignCharacter
        {
            CampaignId = campaignId,
            CharacterId = characterId,
            Status = status,
            CurrentLife = totalLife,
            CurrentEnergy = totalEnergy,
            CreatedAt = now,
            UpdatedAt = now
        };
    }

    /// <summary>Entering the campaign (FR-012): approved, with current values reset to the character's totals.</summary>
    private void Join(int totalLife, int totalEnergy)
    {
        CurrentLife = totalLife;
        CurrentEnergy = totalEnergy;
        ChangeTo(CampaignCharacterStatus.Approved);
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
