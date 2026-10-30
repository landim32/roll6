using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Grid;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.Domain.Realtime;
using Roll6.DTO.MapToken;
using Roll6.DTO.Realtime;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

using Roll6.Domain.Npcs;
using Roll6.Domain.Weapons;

namespace Roll6.Domain.Services;

/// <summary>
/// Pieces on a campaign map. Only the map owner (the campaign master) writes; the master and approved
/// participants read. A hex holds at most one piece and a piece takes every hex of its shape (031: its token's size
/// for the current posture); a character appears at most once per map and its piece shows the participation's name,
/// vitals, status, posture and campaign notes (as its sheet).
/// </summary>
public partial class MapTokenService : IMapTokenService
{
    private readonly IMapTokenRepository<MapToken> _repository;
    private readonly IMapRepository<Map> _mapRepository;
    private readonly IMapModelRepository<MapModel> _mapModelRepository;
    private readonly ITokenRepository<Token> _tokenRepository;
    private readonly ICampaignCharacterRepository<CampaignCharacter> _campaignCharacterRepository;
    private readonly ICharacterRepository<Character> _characterRepository;
    private readonly IMapNpcRepository<MapNpc> _mapNpcRepository;
    private readonly INpcRepository<Npc> _npcRepository;
    private readonly ITurnRepository<Turn> _turnRepository;
    private readonly ICampaignRepository<Campaign> _campaignRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IImageStorageAppService _imageStorage;
    private readonly ITokenWeaponRepository<TokenWeapon> _tokenWeaponRepository;
    private readonly IWeaponRepository<Weapon> _weaponRepository;
    private readonly IRealtimeNotifier _notifier;

    public MapTokenService(
        IMapTokenRepository<MapToken> repository,
        IMapRepository<Map> mapRepository,
        IMapModelRepository<MapModel> mapModelRepository,
        ITokenRepository<Token> tokenRepository,
        ICampaignCharacterRepository<CampaignCharacter> campaignCharacterRepository,
        ICharacterRepository<Character> characterRepository,
        IMapNpcRepository<MapNpc> mapNpcRepository,
        INpcRepository<Npc> npcRepository,
        ITurnRepository<Turn> turnRepository,
        ICampaignRepository<Campaign> campaignRepository,
        IUnitOfWork unitOfWork,
        IImageStorageAppService imageStorage,
        ICampaignNpcRepository<CampaignNpc> campaignNpcRepository,
        ITokenWeaponRepository<TokenWeapon> tokenWeaponRepository,
        IWeaponRepository<Weapon> weaponRepository,
        IRealtimeNotifier notifier)
    {
        _tokenWeaponRepository = tokenWeaponRepository;
        _weaponRepository = weaponRepository;
        _notifier = notifier;
        _npcCommand = new NpcCommandLoader(campaignNpcRepository, campaignCharacterRepository, characterRepository);
        _turnRepository = turnRepository;
        _campaignRepository = campaignRepository;
        _repository = repository;
        _mapRepository = mapRepository;
        _mapModelRepository = mapModelRepository;
        _tokenRepository = tokenRepository;
        _campaignCharacterRepository = campaignCharacterRepository;
        _characterRepository = characterRepository;
        _mapNpcRepository = mapNpcRepository;
        _npcRepository = npcRepository;
        _unitOfWork = unitOfWork;
        _imageStorage = imageStorage;
        _occupancy = new MapOccupancyLoader(mapModelRepository, repository, tokenRepository, campaignCharacterRepository, mapNpcRepository);
    }

    private readonly MapOccupancyLoader _occupancy;
    private readonly NpcCommandLoader _npcCommand;

    public async Task<List<MapTokenInfo>> ListByMapAsync(long userId, long mapId)
    {
        await EnsureCanReadMapAsync(userId, mapId);
        return await MapToDtoAsync(await _repository.ListByMapAsync(mapId));
    }

    public async Task<MapTokenInfo> CreateAsync(long userId, MapTokenInsertInfo info)
    {
        var map = await EnsureMapOwnerAsync(userId, info.MapId);
        await EnsureMapEditableAsync(map, userId);
        if (info.TokenType == (int)MapTokenType.Character)
            throw new DomainValidationException("tokenType", "Personagens entram no mapa pelo painel da campanha.");
        if (info.TokenType == (int)MapTokenType.Npc)
            throw new DomainValidationException("tokenType", "NPCs entram no mapa pelo painel de NPCs.");
        var token = await GetTokenAsync(info.TokenId);
        (await _occupancy.LoadAsync(map)).EnsureFits(info.X, info.Y, info.Look ?? 0, MapOccupancyLoader.PieceSpace(token, null), null);

        var mapToken = new MapToken { MapId = info.MapId, TokenId = info.TokenId };
        var name = string.IsNullOrWhiteSpace(info.Name) ? token.Name : info.Name;
        mapToken.Update(name, info.TokenType, info.Sheet, info.Life, info.Energy, info.Status, info.Move, info.X, info.Y, info.Look);
        mapToken.CreatedAt = mapToken.UpdatedAt;

        return await PublishPieceAsync(map, userId, await MapToDtoAsync(await _repository.InsertAsync(mapToken)));
    }

    /// <summary>
    /// Places a campaign character: its own token, or — when it has none — the informed one, which is then
    /// saved on the character too (011 FR-015), in the same transaction. The master places any approved
    /// character; a player only his own (e.g. entering a map), later moves follow the turn rules (015/016).
    /// </summary>
    public async Task<MapTokenInfo> PlaceCharacterAsync(long userId, MapTokenCharacterInsertInfo info)
    {
        var map = await _mapRepository.GetByIdAsync(info.MapId)
            ?? throw new KeyNotFoundException("Mapa não encontrado.");
        map.EnsureNotDeleted();
        var participation = await _campaignCharacterRepository.GetByIdAsync(info.CampaignCharacterId)
            ?? throw new KeyNotFoundException("Participação não encontrada.");
        var character = await _characterRepository.GetByIdAsync(participation.CharacterId)
            ?? throw new KeyNotFoundException("Personagem não encontrado.");
        if (map.UserId != userId && character.UserId != userId)
            throw new UnauthorizedAccessException("Você só pode colocar os seus personagens no mapa.");
        await EnsureMapEditableAsync(map, userId);
        if (participation.CampaignId != map.CampaignId || participation.Status != CampaignCharacterStatus.Approved)
            throw new ConflictException("Só personagens aprovados nesta campanha podem ser colocados no mapa.");
        if (await _repository.GetByMapAndCampaignCharacterAsync(map.MapId, participation.CampaignCharacterId) != null)
            throw new ConflictException("O personagem já está neste mapa.");

        var tokenId = character.TokenId ?? info.TokenId
            ?? throw new DomainValidationException("tokenId", "Escolha um token para o personagem.");
        var token = await GetTokenAsync(tokenId);
        (await _occupancy.LoadAsync(map)).EnsureFits(info.X, info.Y, 0, MapOccupancyLoader.PieceSpace(token, participation.Posture), null);

        MapToken saved = null!;
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            if (character.AssignTokenIfMissing(tokenId))
                await _characterRepository.UpdateAsync(character);
            saved = await _repository.InsertAsync(MapToken.PlaceCharacter(
                map.MapId, tokenId, participation.CampaignCharacterId, character.Name, info.X, info.Y));
        });
        return await PublishPieceAsync(map, userId, await MapToDtoAsync(saved));
    }

    public async Task<MapTokenInfo> UpdateAsync(long userId, long mapTokenId, MapTokenUpdateInfo info)
    {
        var (mapToken, map) = await GetOwnedAsync(userId, mapTokenId);
        await EnsureMapEditableAsync(map, userId);
        var layout = await _occupancy.LoadAsync(map);
        layout.EnsureFits(info.X, info.Y, info.Look ?? 0, layout.SpaceOf(mapToken), mapToken.MapTokenId);
        mapToken.Update(info.Name, info.TokenType, info.Sheet, info.Life, info.Energy, info.Status, info.Move, info.X, info.Y, info.Look);
        return await PublishPieceAsync(map, userId, await MapToDtoAsync(await _repository.UpdateAsync(mapToken)));
    }

    /// <summary>
    /// Moves and turns a piece (015). The master moves any piece without limit; a player moves only the piece of
    /// his own approved character, and the cheapest cost (1 per step into the hex ahead + 1 per 60° turn,
    /// around the other pieces) must fit the participation's Deslocamento (037, not the character's own move).
    /// </summary>
    public async Task<MapTokenInfo> MoveAsync(long userId, long mapTokenId, MapTokenPositionInfo info)
    {
        var mapToken = await _repository.GetByIdAsync(mapTokenId)
            ?? throw new KeyNotFoundException("Token do mapa não encontrado.");
        // 069: walking in the 3D view writes the piece's hex with its own rules (other pieces don't block).
        if (info.Walk == true)
            return await WalkAsync(userId, mapToken, info);
        var map = await _mapRepository.GetByIdAsync(mapToken.MapId)
            ?? throw new KeyNotFoundException("Mapa não encontrado.");
        map.EnsureNotDeleted();
        var campaign = await EnsureMapEditableAsync(map, userId);
        var look = info.Look ?? mapToken.Look;
        var layout = await _occupancy.LoadAsync(map);
        if (map.UserId != userId)
            await EnsurePlayerMoveAsync(userId, layout, mapToken, info.X, info.Y, look, campaign);
        layout.EnsureFits(info.X, info.Y, look, layout.SpaceOf(mapToken), mapToken.MapTokenId);

        // Characters and NPC occurrences move once per turn, and the move is recorded (016); objects don't.
        // 054: in free mode nothing is recorded — any number of moves, no trail, nothing to undo.
        var turn = campaign.FreeMode ? null : await PrepareMovementTurnAsync(userId, campaign, map, layout, mapToken, info.X, info.Y, look);
        mapToken.MoveTo(info.X, info.Y);
        mapToken.Face(look);
        MapToken saved = mapToken;
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            saved = await _repository.UpdateAsync(mapToken);
            if (turn != null)
                await _turnRepository.InsertAsync(turn);
        });
        var result = await PublishPieceAsync(map, userId, await MapToDtoAsync(saved));
        if (turn != null)
            await _notifier.PublishAsync(TableEvents.Create(TableEventType.TURN_CHANGED, map.CampaignId, userId));
        return result;
    }

    /// <summary>
    /// The Movement entry of a character/NPC piece, or null for objects; refuses a second move in the turn. It keeps
    /// who moved and the movement points spent (024) — also for the master, who is not limited by them.
    /// </summary>
    private async Task<Turn?> PrepareMovementTurnAsync(long userId, Campaign campaign, Map map, MapLayout layout, MapToken mapToken, int x, int y, int look)
    {
        long? characterId = null;
        long? npcId = null;
        if (mapToken.CampaignCharacterId is long participationId)
            characterId = (await _campaignCharacterRepository.GetByIdAsync(participationId))?.CharacterId;
        else if (mapToken.MapNpcId is long occurrenceId)
            npcId = (await _mapNpcRepository.GetByIdAsync(occurrenceId))?.NpcId;
        if (characterId == null && npcId == null)
            return null;

        var mapNpcId = characterId == null ? mapToken.MapNpcId : null;
        if (await _turnRepository.ExistsMovementAsync(campaign.CampaignId, campaign.CurrentTurn, characterId, mapNpcId))
            throw new ConflictException("Já se moveu neste turno.");
        var moved = layout.MovementCost(mapToken, x, y, look) ?? layout.MovementCost(mapToken, x, y, look, ignorePieces: true);
        return Turn.Movement(campaign.CampaignId, map.MapId, characterId, npcId, mapNpcId, campaign.CurrentTurn, userId,
            (mapToken.X, mapToken.Y, mapToken.Look), (x, y, look), moved);
    }

    /// <summary>
    /// A player moves only his own approved character, within its Deslocamento in this campaign (037) — the whole
    /// shape around the other pieces. In free mode (054) only the ownership check remains: any distance, any path.
    /// </summary>
    private async Task EnsurePlayerMoveAsync(long userId, MapLayout layout, MapToken mapToken, int x, int y, int look, Campaign campaign)
    {
        var freeMode = campaign.FreeMode;
        // 071: the player commanding an ally moves its pieces like his own character, within the occurrence's Deslocamento.
        if (mapToken.MapNpcId is long mapNpcId)
        {
            var mapNpc = await _mapNpcRepository.GetByIdAsync(mapNpcId);
            if (mapNpc == null || !await _npcCommand.CommandsAsync(userId, campaign, mapNpc.NpcId))
                throw new UnauthorizedAccessException("Você só pode mover os seus personagens e aliados.");
            if (freeMode)
                return;
            var npcCost = layout.MovementCost(mapToken, x, y, look);
            if (npcCost == null || npcCost > mapNpc.CurrentMove)
                throw new DomainValidationException("move", "O movimento passou do máximo.");
            return;
        }
        var participation = mapToken.CampaignCharacterId is long participationId
            ? await _campaignCharacterRepository.GetByIdAsync(participationId)
            : null;
        var character = participation != null ? await _characterRepository.GetByIdAsync(participation.CharacterId) : null;
        if (participation == null || participation.Status != CampaignCharacterStatus.Approved || character?.UserId != userId)
            throw new UnauthorizedAccessException("Você só pode mover os seus personagens.");
        if (freeMode)
            return;

        var cost = layout.MovementCost(mapToken, x, y, look);
        if (cost == null || cost > participation.CurrentMove)
            throw new DomainValidationException("move", "O movimento passou do máximo.");
    }

    public async Task<MapTokenInfo> ChangeTokenAsync(long userId, long mapTokenId, MapTokenTokenInfo info)
    {
        var (mapToken, map) = await GetOwnedAsync(userId, mapTokenId);
        await EnsureMapEditableAsync(map, userId);
        await GetTokenAsync(info.TokenId);
        mapToken.ChangeToken(info.TokenId);
        return await PublishPieceAsync(map, userId, await MapToDtoAsync(await _repository.UpdateAsync(mapToken)));
    }

    /// <summary>
    /// Removes the piece; the piece of an NPC occurrence takes the occurrence off the map with it (051: marked removed,
    /// its turn entries stay named).
    /// </summary>
    public async Task DeleteAsync(long userId, long mapTokenId)
    {
        var (mapToken, map) = await GetOwnedAsync(userId, mapTokenId);
        await EnsureMapEditableAsync(map, userId);
        var occurrence = mapToken.MapNpcId is long mapNpcId ? await _mapNpcRepository.GetByIdAsync(mapNpcId) : null;
        occurrence?.Remove(DateTime.UtcNow);
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await _repository.DeleteAsync(mapToken.MapTokenId);
            if (occurrence != null)
                await _mapNpcRepository.UpdateAsync(occurrence);
        });
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.MAP_TOKEN_DELETED, map.CampaignId, userId, map.MapId,
            new { mapTokenId = mapToken.MapTokenId }));
        if (mapToken.MapNpcId != null)
            await _notifier.PublishAsync(TableEvents.Create(TableEventType.TURN_CHANGED, map.CampaignId, userId));
    }

    /// <summary>Tells the table about a created/moved/changed piece (017) and hands the DTO back.</summary>
    private async Task<MapTokenInfo> PublishPieceAsync(Map map, long userId, MapTokenInfo piece)
    {
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.MAP_TOKEN_UPSERTED, map.CampaignId, userId, map.MapId, piece));
        return piece;
    }

    private async Task<(MapToken MapToken, Map Map)> GetOwnedAsync(long userId, long mapTokenId)
    {
        var mapToken = await _repository.GetByIdAsync(mapTokenId)
            ?? throw new KeyNotFoundException("Token do mapa não encontrado.");
        return (mapToken, await EnsureMapOwnerAsync(userId, mapToken.MapId));
    }

    /// <summary>
    /// Pieces change only while the campaign plays — or, while it is being prepared, by the master (049).
    /// </summary>
    /// <summary>Loads the map's campaign and checks that its pieces may change (049); returns it for the free-mode rules (054).</summary>
    private async Task<Campaign> EnsureMapEditableAsync(Map map, long userId)
    {
        var campaign = await _campaignRepository.GetByIdAsync(map.CampaignId)
            ?? throw new KeyNotFoundException("Campanha não encontrada.");
        campaign.EnsureMapEditable(campaign.UserId == userId);
        return campaign;
    }

    private async Task<Token> GetTokenAsync(long tokenId)
    {
        return await _tokenRepository.GetByIdAsync(tokenId)
            ?? throw new KeyNotFoundException("Token não encontrado.");
    }

    /// <summary>Reading is allowed to the map owner (master) and to owners of approved characters.</summary>
    private async Task EnsureCanReadMapAsync(long userId, long mapId)
    {
        var map = await _mapRepository.GetByIdAsync(mapId)
            ?? throw new KeyNotFoundException("Mapa não encontrado.");
        map.EnsureNotDeleted();
        if (map.UserId != userId && !await _campaignCharacterRepository.HasApprovedCharacterAsync(map.CampaignId, userId))
            throw new UnauthorizedAccessException("Apenas o mestre ou participantes aprovados podem ver os tokens do mapa.");
    }

    /// <summary>Only the owner of a map that is not deleted can change its tokens.</summary>
    private async Task<Map> EnsureMapOwnerAsync(long userId, long mapId)
    {
        var map = await _mapRepository.GetByIdAsync(mapId)
            ?? throw new KeyNotFoundException("Mapa não encontrado.");
        map.EnsureNotDeleted();
        if (map.UserId != userId)
            throw new UnauthorizedAccessException("Apenas o dono do mapa pode gerenciar seus tokens.");
        return map;
    }

    private async Task<MapTokenInfo> MapToDtoAsync(MapToken mapToken) => (await MapToDtoAsync(new List<MapToken> { mapToken })).Single();

    /// <summary>Loads tokens, participations and characters in batch; Character pieces show the participation.</summary>
    private async Task<List<MapTokenInfo>> MapToDtoAsync(List<MapToken> mapTokens)
    {
        if (mapTokens.Count == 0)
            return new List<MapTokenInfo>();

        var tokens = (await _tokenRepository.ListByIdsAsync(mapTokens.Select(e => e.TokenId).Distinct()))
            .ToDictionary(e => e.TokenId);
        // 083: the weapons in the sockets of the pieces' tokens, in two queries.
        var weaponRows = tokens.Count == 0
            ? new List<TokenWeapon>()
            : await _tokenWeaponRepository.ListByTokenIdsAsync(tokens.Keys);
        var rowsByToken = weaponRows.ToLookup(row => row.TokenId);
        var weaponIds = TokenWeapons.IdsOf(weaponRows).ToList();
        var weapons = weaponIds.Count == 0
            ? new Dictionary<long, Weapon>()
            : (await _weaponRepository.ListByIdsAsync(weaponIds)).ToDictionary(e => e.WeaponId);
        var participationIds = mapTokens.Where(e => e.CampaignCharacterId.HasValue).Select(e => e.CampaignCharacterId!.Value).Distinct().ToList();
        var participations = new Dictionary<long, CampaignCharacter>();
        var characters = new Dictionary<long, Character>();
        if (participationIds.Count > 0)
        {
            participations = (await _campaignCharacterRepository.ListByIdsAsync(participationIds)).ToDictionary(e => e.CampaignCharacterId);
            characters = (await _characterRepository.ListByIdsAsync(participations.Values.Select(e => e.CharacterId).Distinct()))
                .ToDictionary(e => e.CharacterId);
        }
        var mapNpcIds = mapTokens.Where(e => e.MapNpcId.HasValue).Select(e => e.MapNpcId!.Value).Distinct().ToList();
        var mapNpcs = new Dictionary<long, MapNpc>();
        var npcs = new Dictionary<long, Npc>();
        if (mapNpcIds.Count > 0)
        {
            mapNpcs = (await _mapNpcRepository.ListByIdsAsync(mapNpcIds)).ToDictionary(e => e.MapNpcId);
            npcs = (await _npcRepository.ListByIdsAsync(mapNpcs.Values.Select(e => e.NpcId).Distinct())).ToDictionary(e => e.NpcId);
        }
        // 071: the category of each NPC in the piece's campaign and who commands it (an ally's master character owner).
        var standings = new Dictionary<(long MapId, long NpcId), NpcStanding>();
        foreach (var group in mapNpcs.Values.GroupBy(e => e.MapId))
        {
            var pieceMap = await _mapRepository.GetByIdAsync(group.Key);
            if (pieceMap == null)
                continue;
            foreach (var (npcId, standing) in await _npcCommand.StandingAsync(pieceMap.CampaignId, group.Select(e => e.NpcId)))
                standings[(group.Key, npcId)] = standing;
        }

        return mapTokens.Select(mapToken =>
        {
            var token = tokens.GetValueOrDefault(mapToken.TokenId);
            var info = new MapTokenInfo
            {
                MapTokenId = mapToken.MapTokenId,
                MapId = mapToken.MapId,
                TokenId = mapToken.TokenId,
                TokenName = token?.Name ?? string.Empty,
                UpImageUrl = _imageStorage.GetUrl(token?.UpImage),
                DownImageUrl = _imageStorage.GetUrl(token?.DownImage),
                FrontImageUrl = _imageStorage.GetUrl(token?.FrontImage),
                RightImageUrl = _imageStorage.GetUrl(token?.RightImage),
                LeftImageUrl = _imageStorage.GetUrl(token?.LeftImage),
                BackImageUrl = _imageStorage.GetUrl(token?.BackImage),
                ModelFileUrl = _imageStorage.GetUrl(token?.ModelFile),
                ModelIdleClip = token?.ModelIdleClip,
                ModelWalkClip = token?.ModelWalkClip,
                ModelDownClip = token?.ModelDownClip,
                ModelScale = token?.ModelScale ?? Validation.Guard.MODEL_SCALE_DEFAULT,
                Weapons = TokenWeapons.Read(rowsByToken[mapToken.TokenId], weapons, _imageStorage.GetUrl),
                CampaignCharacterId = mapToken.CampaignCharacterId,
                Name = mapToken.Name,
                TokenType = (int)mapToken.TokenType,
                Sheet = mapToken.Sheet,
                Life = mapToken.Life,
                Energy = mapToken.Energy,
                TotalLife = mapToken.Life,
                TotalEnergy = mapToken.Energy,
                Status = mapToken.Status,
                Move = mapToken.Move,
                X = mapToken.X,
                Y = mapToken.Y,
                Look = mapToken.Look,
                WalkX = mapToken.WalkX,
                WalkY = mapToken.WalkY,
                WalkYaw = mapToken.WalkYaw,
                Space = MapOccupancyLoader.PieceSpace(token, null),
                UpSpace = MapOccupancyLoader.PieceSpace(token, null),
                CreatedAt = mapToken.CreatedAt,
                UpdatedAt = mapToken.UpdatedAt
            };
            if (mapToken.CampaignCharacterId is long participationId && participations.TryGetValue(participationId, out var participation))
            {
                var character = characters.GetValueOrDefault(participation.CharacterId);
                info.CharacterId = participation.CharacterId;
                info.Name = character?.Name ?? mapToken.Name;
                // The player's limit in this campaign (037), what the Mover mode counts against.
                info.Move = participation.CurrentMove;
                info.Life = participation.CurrentLife;
                info.Energy = participation.CurrentEnergy;
                info.TotalLife = character?.Life ?? participation.CurrentLife;
                info.TotalEnergy = character?.Energy ?? participation.CurrentEnergy;
                info.Status = participation.CharacterStatus;
                info.RepeatedAction = participation.RepeatedAction; // 099
                info.Sheet = participation.Sheet;
                info.Posture = (int)participation.Posture;
                info.Space = MapOccupancyLoader.PieceSpace(token, participation.Posture);
            }
            if (mapToken.MapNpcId is long pieceNpcId && mapNpcs.TryGetValue(pieceNpcId, out var mapNpc))
            {
                info.MapNpcId = mapNpc.MapNpcId;
                info.NpcId = mapNpc.NpcId;
                var standing = standings.GetValueOrDefault((mapNpc.MapId, mapNpc.NpcId));
                info.NpcCategory = (int)(standing?.Category ?? NpcCategory.Enemy);
                info.CommanderUserId = standing?.CommanderUserId;
                // The occurrence owns name, current vitals and status; the NPC gives totals, move and the sheet (026).
                var npc = npcs.GetValueOrDefault(mapNpc.NpcId);
                info.Name = mapNpc.Name;
                info.Life = mapNpc.CurrentLife;
                info.Energy = mapNpc.CurrentEnergy;
                info.TotalLife = npc?.Life ?? mapNpc.CurrentLife;
                info.TotalEnergy = npc?.Energy ?? mapNpc.CurrentEnergy;
                info.Status = mapNpc.Status;
                info.RepeatedAction = mapNpc.RepeatedAction; // 099
                info.Posture = (int)mapNpc.Posture;
                info.Space = MapOccupancyLoader.PieceSpace(token, mapNpc.Posture);
                // 051: the instance's own Deslocamento.
                info.Move = mapNpc.CurrentMove;
                info.Sheet = mapToken.Sheet ?? npc?.Sheet;
            }
            return info;
        }).ToList();
    }
}
