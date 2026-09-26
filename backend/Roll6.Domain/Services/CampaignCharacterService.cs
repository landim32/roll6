using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.DTO.CampaignCharacter;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Domain.Services;

/// <summary>
/// Permissions around campaign participation; the status rules live in <see cref="CampaignCharacter"/>.
/// Master = campaign owner; player = character owner.
/// </summary>
public class CampaignCharacterService : ICampaignCharacterService
{
    private readonly ICampaignCharacterRepository<CampaignCharacter> _repository;
    private readonly ICampaignRepository<Campaign> _campaignRepository;
    private readonly ICharacterRepository<Character> _characterRepository;
    private readonly IUserRepository<User> _userRepository;
    private readonly IImageStorageAppService _imageStorage;

    public CampaignCharacterService(
        ICampaignCharacterRepository<CampaignCharacter> repository,
        ICampaignRepository<Campaign> campaignRepository,
        ICharacterRepository<Character> characterRepository,
        IUserRepository<User> userRepository,
        IImageStorageAppService imageStorage)
    {
        _repository = repository;
        _campaignRepository = campaignRepository;
        _characterRepository = characterRepository;
        _userRepository = userRepository;
        _imageStorage = imageStorage;
    }

    public async Task<CampaignCharacterInfo> RequestAccessAsync(long userId, CampaignCharacterRequestInfo info)
    {
        var campaign = await GetCampaignAsync(info.CampaignId);
        var character = await GetCharacterAsync(info.CharacterId);
        EnsureCharacterOwner(userId, character);

        var existing = await _repository.GetAsync(campaign.CampaignId, character.CharacterId);
        existing?.EnsureCanRequestAgain();

        // The master's own characters join directly, like in an open campaign.
        var participation = CampaignCharacter.RequestAccess(campaign.CampaignId, character,
            autoApprove: campaign.Open || campaign.UserId == userId);
        return (await MapToDtoAsync(new[] { await _repository.InsertAsync(participation) })).Single();
    }

    public async Task<CampaignCharacterInfo> ApproveRequestAsync(long userId, long campaignCharacterId)
    {
        var participation = await GetParticipationAsync(campaignCharacterId);
        EnsureMaster(userId, await GetCampaignAsync(participation.CampaignId));
        var character = await GetCharacterAsync(participation.CharacterId);
        participation.ApproveRequest(character);
        return await SaveAsync(participation);
    }

    public async Task<CampaignCharacterInfo> DenyRequestAsync(long userId, long campaignCharacterId)
    {
        var participation = await GetParticipationAsync(campaignCharacterId);
        EnsureMaster(userId, await GetCampaignAsync(participation.CampaignId));
        participation.DenyRequest();
        return await SaveAsync(participation);
    }

    public async Task<CampaignCharacterInfo> InviteAsync(long userId, CampaignCharacterRequestInfo info)
    {
        var campaign = await GetCampaignAsync(info.CampaignId);
        EnsureMaster(userId, campaign);
        var character = await GetCharacterAsync(info.CharacterId);

        var existing = await _repository.GetAsync(campaign.CampaignId, character.CharacterId);
        if (existing == null)
        {
            var invite = CampaignCharacter.CreateInvite(campaign.CampaignId, character);
            return (await MapToDtoAsync(new[] { await _repository.InsertAsync(invite) })).Single();
        }

        existing.Invite(character);
        return await SaveAsync(existing);
    }

    public async Task<CampaignCharacterInfo> AcceptInviteAsync(long userId, long campaignCharacterId)
    {
        var participation = await GetParticipationAsync(campaignCharacterId);
        var character = await GetCharacterAsync(participation.CharacterId);
        EnsureCharacterOwner(userId, character);
        participation.AcceptInvite(character);
        return await SaveAsync(participation);
    }

    public async Task<CampaignCharacterInfo> DeclineInviteAsync(long userId, long campaignCharacterId)
    {
        var participation = await GetParticipationAsync(campaignCharacterId);
        EnsureCharacterOwner(userId, await GetCharacterAsync(participation.CharacterId));
        participation.DeclineInvite();
        return await SaveAsync(participation);
    }

    public async Task<List<CampaignCharacterInfo>> ListInvitesAsync(long userId)
    {
        return await MapToDtoAsync(await _repository.ListInvitesByUserAsync(userId));
    }

    public async Task<List<CampaignCharacterInfo>> ListByCampaignAsync(long userId, long campaignId)
    {
        var campaign = await GetCampaignAsync(campaignId);
        if (campaign.UserId == userId)
            return await MapToDtoAsync(await _repository.ListByCampaignAsync(campaignId, approvedOnly: false));

        if (await _repository.HasApprovedCharacterAsync(campaignId, userId))
            return await MapToDtoAsync(await _repository.ListByCampaignAsync(campaignId, approvedOnly: true));

        throw new UnauthorizedAccessException("Apenas o mestre ou participantes aprovados podem ver os personagens da campanha.");
    }

    /// <summary>The participation with its sheet: the master, the character owner or any approved participant.</summary>
    public async Task<CampaignCharacterDetailInfo> GetByIdAsync(long userId, long campaignCharacterId)
    {
        var participation = await GetParticipationAsync(campaignCharacterId);
        var campaign = await GetCampaignAsync(participation.CampaignId);
        var character = await GetCharacterAsync(participation.CharacterId);
        if (character.UserId != userId && campaign.UserId != userId
            && !await _repository.HasApprovedCharacterAsync(campaign.CampaignId, userId))
            throw new UnauthorizedAccessException("Apenas o mestre ou participantes aprovados podem ver este personagem.");
        return await MapToDetailAsync(participation);
    }

    /// <summary>Current life/energy, status and campaign sheet; the character owner or the campaign master (010 FR-007).</summary>
    public async Task<CampaignCharacterDetailInfo> UpdateAsync(long userId, long campaignCharacterId, CampaignCharacterUpdateInfo info)
    {
        var participation = await GetParticipationAsync(campaignCharacterId);
        var campaign = await GetCampaignAsync(participation.CampaignId);
        var character = await GetCharacterAsync(participation.CharacterId);
        if (character.UserId != userId && campaign.UserId != userId)
            throw new UnauthorizedAccessException("Apenas o dono do personagem ou o mestre da campanha podem alterar os dados na campanha.");

        participation.UpdatePlay(info.CurrentLife, info.CurrentEnergy, info.CharacterStatus, info.Sheet, character.Life, character.Energy);
        return await MapToDetailAsync(await _repository.UpdateAsync(participation));
    }

    public async Task<List<CampaignCharacterInfo>> ListMineAsync(long userId, long campaignId)
    {
        var campaign = await GetCampaignAsync(campaignId);
        return await MapToDtoAsync(await _repository.ListByCampaignAndUserAsync(campaign.CampaignId, userId));
    }

    /// <summary>Removes the character from the campaign only (the character itself is kept). Master only.</summary>
    public async Task RemoveAsync(long userId, long campaignCharacterId)
    {
        var participation = await GetParticipationAsync(campaignCharacterId);
        EnsureMaster(userId, await GetCampaignAsync(participation.CampaignId));
        await _repository.DeleteAsync(participation.CampaignCharacterId);
    }

    private async Task<CampaignCharacterInfo> SaveAsync(CampaignCharacter participation)
    {
        return (await MapToDtoAsync(new[] { await _repository.UpdateAsync(participation) })).Single();
    }

    private async Task<CampaignCharacterDetailInfo> MapToDetailAsync(CampaignCharacter participation)
    {
        var info = (await MapToDtoAsync(new[] { participation })).Single();
        return new CampaignCharacterDetailInfo
        {
            CampaignCharacterId = info.CampaignCharacterId,
            CampaignId = info.CampaignId,
            CampaignName = info.CampaignName,
            CampaignOwnerName = info.CampaignOwnerName,
            CharacterId = info.CharacterId,
            CharacterName = info.CharacterName,
            CharacterImageUrl = info.CharacterImageUrl,
            CharacterOwnerId = info.CharacterOwnerId,
            CharacterOwnerName = info.CharacterOwnerName,
            Status = info.Status,
            CurrentLife = info.CurrentLife,
            CurrentEnergy = info.CurrentEnergy,
            TotalLife = info.TotalLife,
            TotalEnergy = info.TotalEnergy,
            CharacterMove = info.CharacterMove,
            CharacterStatus = info.CharacterStatus,
            CreatedAt = info.CreatedAt,
            UpdatedAt = info.UpdatedAt,
            Sheet = participation.Sheet
        };
    }

    private async Task<Campaign> GetCampaignAsync(long campaignId)
    {
        return await _campaignRepository.GetByIdAsync(campaignId)
            ?? throw new KeyNotFoundException("Campanha não encontrada.");
    }

    private async Task<Character> GetCharacterAsync(long characterId)
    {
        return await _characterRepository.GetByIdAsync(characterId)
            ?? throw new KeyNotFoundException("Personagem não encontrado.");
    }

    private async Task<CampaignCharacter> GetParticipationAsync(long campaignCharacterId)
    {
        return await _repository.GetByIdAsync(campaignCharacterId)
            ?? throw new KeyNotFoundException("Participação não encontrada.");
    }

    private static void EnsureMaster(long userId, Campaign campaign)
    {
        if (campaign.UserId != userId)
            throw new UnauthorizedAccessException("Apenas o mestre da campanha pode fazer isso.");
    }

    private static void EnsureCharacterOwner(long userId, Character character)
    {
        if (character.UserId != userId)
            throw new UnauthorizedAccessException("Apenas o dono do personagem pode fazer isso.");
    }

    /// <summary>Loads campaigns, characters and user names in batch (one query each) to fill the DTOs.</summary>
    private async Task<List<CampaignCharacterInfo>> MapToDtoAsync(IReadOnlyCollection<CampaignCharacter> participations)
    {
        if (participations.Count == 0)
            return new List<CampaignCharacterInfo>();

        var campaigns = (await _campaignRepository.ListByIdsAsync(participations.Select(p => p.CampaignId)))
            .ToDictionary(c => c.CampaignId);
        var characters = (await _characterRepository.ListByIdsAsync(participations.Select(p => p.CharacterId)))
            .ToDictionary(c => c.CharacterId);
        var userIds = campaigns.Values.Select(c => c.UserId).Concat(characters.Values.Select(c => c.UserId));
        var users = (await _userRepository.ListByIdsAsync(userIds)).ToDictionary(u => u.UserId, u => u.Name);

        return participations.Select(p =>
        {
            var campaign = campaigns.GetValueOrDefault(p.CampaignId);
            var character = characters.GetValueOrDefault(p.CharacterId);
            return new CampaignCharacterInfo
            {
                CampaignCharacterId = p.CampaignCharacterId,
                CampaignId = p.CampaignId,
                CampaignName = campaign?.Name ?? string.Empty,
                CampaignOwnerName = campaign != null ? users.GetValueOrDefault(campaign.UserId, string.Empty) : string.Empty,
                CharacterId = p.CharacterId,
                CharacterName = character?.Name ?? string.Empty,
                CharacterImageUrl = _imageStorage.GetUrl(character?.Image),
                CharacterOwnerId = character?.UserId ?? 0,
                CharacterOwnerName = character != null ? users.GetValueOrDefault(character.UserId, string.Empty) : string.Empty,
                Status = (int)p.Status,
                CurrentLife = p.CurrentLife,
                CurrentEnergy = p.CurrentEnergy,
                TotalLife = character?.Life ?? 0,
                TotalEnergy = character?.Energy ?? 0,
                CharacterMove = character?.Move ?? 0,
                CharacterStatus = p.CharacterStatus,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt
            };
        }).ToList();
    }
}
