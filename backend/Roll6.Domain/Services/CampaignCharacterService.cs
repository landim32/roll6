using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.Domain.Realtime;
using Roll6.DTO.CampaignCharacter;
using Roll6.DTO.Realtime;
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
    private readonly IMapTokenRepository<MapToken> _mapTokenRepository;
    private readonly ITokenRepository<Token> _tokenRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IImageStorageAppService _imageStorage;
    private readonly ITurnRepository<Turn> _turnRepository;
    private readonly IRealtimeNotifier _notifier;

    public CampaignCharacterService(
        ICampaignCharacterRepository<CampaignCharacter> repository,
        ICampaignRepository<Campaign> campaignRepository,
        ICharacterRepository<Character> characterRepository,
        IUserRepository<User> userRepository,
        IMapTokenRepository<MapToken> mapTokenRepository,
        ITokenRepository<Token> tokenRepository,
        IUnitOfWork unitOfWork,
        IImageStorageAppService imageStorage,
        ITurnRepository<Turn> turnRepository,
        IRealtimeNotifier notifier)
    {
        _notifier = notifier;
        _turnRepository = turnRepository;
        _mapTokenRepository = mapTokenRepository;
        _tokenRepository = tokenRepository;
        _unitOfWork = unitOfWork;
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
        var result = (await MapToDtoAsync(new[] { await _repository.InsertAsync(participation) })).Single();
        await PublishPartyAsync(campaign.CampaignId, userId);
        return result;
    }

    public async Task<CampaignCharacterInfo> ApproveRequestAsync(long userId, long campaignCharacterId)
    {
        var participation = await GetParticipationAsync(campaignCharacterId);
        EnsureMaster(userId, await GetCampaignAsync(participation.CampaignId));
        var character = await GetCharacterAsync(participation.CharacterId);
        participation.ApproveRequest(character);
        return await SaveAndPublishAsync(participation, userId);
    }

    public async Task<CampaignCharacterInfo> DenyRequestAsync(long userId, long campaignCharacterId)
    {
        var participation = await GetParticipationAsync(campaignCharacterId);
        EnsureMaster(userId, await GetCampaignAsync(participation.CampaignId));
        participation.DenyRequest();
        var result = await SaveAndPublishAsync(participation, userId);
        await RemoveOwnerIfNoAccessAsync(result.CharacterOwnerId, participation.CampaignId);
        return result;
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
            var created = (await MapToDtoAsync(new[] { await _repository.InsertAsync(invite) })).Single();
            await PublishPartyAsync(campaign.CampaignId, userId);
            return created;
        }

        existing.Invite(character);
        return await SaveAndPublishAsync(existing, userId);
    }

    public async Task<CampaignCharacterInfo> AcceptInviteAsync(long userId, long campaignCharacterId)
    {
        var participation = await GetParticipationAsync(campaignCharacterId);
        var character = await GetCharacterAsync(participation.CharacterId);
        EnsureCharacterOwner(userId, character);
        participation.AcceptInvite(character);
        return await SaveAndPublishAsync(participation, userId);
    }

    public async Task<CampaignCharacterInfo> DeclineInviteAsync(long userId, long campaignCharacterId)
    {
        var participation = await GetParticipationAsync(campaignCharacterId);
        EnsureCharacterOwner(userId, await GetCharacterAsync(participation.CharacterId));
        participation.DeclineInvite();
        return await SaveAndPublishAsync(participation, userId);
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

    /// <summary>The participation with its campaign notes: the master, the character owner or any approved participant.</summary>
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

    /// <summary>
    /// Current life/energy, status, the campaign sheet and its file (032) and the character's token; the character
    /// owner or the campaign master (010 FR-007). The token is saved on the character (the master's only change to
    /// someone else's character); nothing else of the character is reachable through here (032 FR-010).
    /// </summary>
    public async Task<CampaignCharacterDetailInfo> UpdateAsync(long userId, long campaignCharacterId, CampaignCharacterUpdateInfo info)
    {
        var participation = await GetParticipationAsync(campaignCharacterId);
        var campaign = await GetCampaignAsync(participation.CampaignId);
        var character = await GetCharacterAsync(participation.CharacterId);
        if (character.UserId != userId && campaign.UserId != userId)
            throw new UnauthorizedAccessException("Apenas o dono do personagem ou o mestre da campanha podem alterar os dados na campanha.");

        var before = (participation.CurrentLife, participation.CurrentEnergy, participation.CharacterStatus, participation.Sheet, participation.SheetFile, participation.Posture);
        participation.UpdatePlay(info.CurrentLife, info.CurrentEnergy, info.CharacterStatus, info.Sheet, character.Life, character.Energy);
        participation.ChangeSheetFile(info.SheetFile);
        if (info.Posture is int posture)
            participation.ChangePosture(posture);
        // Every change during the turn is recorded with who made it (024).
        var changes = TurnChange.Diff(
            ("currentLife", before.CurrentLife, participation.CurrentLife),
            ("currentEnergy", before.CurrentEnergy, participation.CurrentEnergy),
            ("characterStatus", before.CharacterStatus, participation.CharacterStatus),
            ("notes", before.Sheet, participation.Sheet),
            ("sheetFile", before.SheetFile, participation.SheetFile),
            ("posture", (int)before.Posture, (int)participation.Posture));
        var turn = changes.Count == 0 ? null
            : Turn.CharacterUpdate(campaign.CampaignId, campaign.CurrentMapId, character.CharacterId, null, null, campaign.CurrentTurn, userId, changes);
        if (info.TokenId.HasValue && await _tokenRepository.GetByIdAsync(info.TokenId.Value) == null)
            throw new KeyNotFoundException("Token não encontrado.");
        var tokenChanged = info.TokenId.HasValue && character.ChangeToken(info.TokenId.Value);
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            if (tokenChanged)
                await _characterRepository.UpdateAsync(character);
            await _repository.UpdateAsync(participation);
            if (turn != null)
                await _turnRepository.InsertAsync(turn);
        });
        var result = await MapToDetailAsync(participation);
        // Character pieces show the participation's vitals/status.
        await PublishPartyAsync(campaign.CampaignId, userId, piecesToo: true);
        if (turn != null)
            await _notifier.PublishAsync(TableEvents.Create(TableEventType.TURN_CHANGED, campaign.CampaignId, userId));
        return result;
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
        // Its pieces on the campaign maps go first (FKs never cascade).
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await _mapTokenRepository.DeleteByCampaignCharacterAsync(participation.CampaignCharacterId);
            await _repository.DeleteAsync(participation.CampaignCharacterId);
        });
        await PublishPartyAsync(participation.CampaignId, userId, piecesToo: true);
        var character = await _characterRepository.GetByIdAsync(participation.CharacterId);
        if (character != null)
            await RemoveOwnerIfNoAccessAsync(character.UserId, participation.CampaignId);
    }

    private async Task<CampaignCharacterInfo> SaveAndPublishAsync(CampaignCharacter participation, long userId)
    {
        var result = (await MapToDtoAsync(new[] { await _repository.UpdateAsync(participation) })).Single();
        await PublishPartyAsync(participation.CampaignId, userId);
        return result;
    }

    /// <summary>The party (and, when the pieces show what changed, every map's pieces) must be reloaded (017).</summary>
    private async Task PublishPartyAsync(long campaignId, long userId, bool piecesToo = false)
    {
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.PARTY_CHANGED, campaignId, userId));
        if (piecesToo)
            await _notifier.PublishAsync(TableEvents.Create(TableEventType.MAP_TOKENS_CHANGED, campaignId, userId));
    }

    /// <summary>A player left without an approved character stops receiving the campaign's events (017).</summary>
    private async Task RemoveOwnerIfNoAccessAsync(long ownerUserId, long campaignId)
    {
        var campaign = await _campaignRepository.GetByIdAsync(campaignId);
        if (campaign == null || campaign.UserId == ownerUserId)
            return;
        if (!await _repository.HasApprovedCharacterAsync(campaignId, ownerUserId))
            await _notifier.RemoveUserFromCampaignAsync(ownerUserId, campaignId);
    }

    private async Task<CampaignCharacterDetailInfo> MapToDetailAsync(CampaignCharacter participation)
    {
        var info = (await MapToDtoAsync(new[] { participation })).Single();
        // The sheet and its file belong to this campaign (032): copied from the character when it joined and then
        // changed only here. The token still belongs to the character, so every campaign shows the same one.
        var character = await _characterRepository.GetByIdAsync(participation.CharacterId);
        var sheetFile = participation.SheetFile;
        var token = character?.TokenId is long tokenId ? await _tokenRepository.GetByIdAsync(tokenId) : null;
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
            Posture = info.Posture,
            CharacterTokenId = info.CharacterTokenId,
            CreatedAt = info.CreatedAt,
            UpdatedAt = info.UpdatedAt,
            Sheet = participation.Sheet,
            CharacterSheet = character?.Sheet,
            CharacterTokenName = token?.Name,
            CharacterTokenImageUrl = _imageStorage.GetUrl(token?.UpImage),
            SheetFile = participation.SheetFile,
            SheetFileUrl = _imageStorage.GetUrl(sheetFile),
            SheetFileType = SheetFiles.TypeOf(sheetFile)
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
                Posture = (int)p.Posture,
                CharacterTokenId = character?.TokenId,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt
            };
        }).ToList();
    }
}
