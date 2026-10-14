using Roll6.Domain.Animations;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.DTO.Animation;
using Roll6.DTO.Common;
using Roll6.DTO.Image;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Domain.Services;

/// <summary>
/// The animation library (059). Uploading validates the <c>roll6-animation</c> file (<see cref="AnimationFormat"/>),
/// stores it once in the bucket and inserts the row; the file never changes afterwards. An animation used by a token
/// ("animation:{id}" in a state column) cannot be deleted, nor retyped away from the type that state needs (Q2).
/// </summary>
public class AnimationService : IAnimationService
{
    public const string IN_USE = "Esta animação está em uso por um ou mais tokens.";
    public const string NOT_FOUND = "Animação não encontrada.";

    private readonly IAnimationRepository<Animation> _repository;
    private readonly ITokenRepository<Token> _tokenRepository;
    private readonly IUserRepository<User> _userRepository;
    private readonly IImageService _imageService;

    public AnimationService(
        IAnimationRepository<Animation> repository,
        ITokenRepository<Token> tokenRepository,
        IUserRepository<User> userRepository,
        IImageService imageService)
    {
        _repository = repository;
        _tokenRepository = tokenRepository;
        _userRepository = userRepository;
        _imageService = imageService;
    }

    public async Task<PagedList<AnimationInfo>> ListAsync(long viewerUserId, PageQuery query, bool mine, int? type)
    {
        var (items, total) = await _repository.ListPagedAsync(
            query.Search, query.Skip, query.PageSize, mine ? viewerUserId : null, type, viewerUserId);
        var owners = await OwnerNamesAsync(items.Select(item => item.UserId));
        return new PagedList<AnimationInfo>
        {
            Items = items.Select(item => MapToDto(item, owners)).ToList(),
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = total
        };
    }

    public async Task<AnimationInfo> GetByIdAsync(long animationId)
    {
        var animation = await GetAnimationAsync(animationId);
        return MapToDto(animation, await OwnerNamesAsync(new[] { animation.UserId }));
    }

    public async Task<StoredImageInfo> OpenFileAsync(long animationId)
    {
        var animation = await GetAnimationAsync(animationId);
        return await _imageService.OpenAnimationAsync(animation.FileName)
            ?? throw new KeyNotFoundException("Arquivo da animação não encontrado.");
    }

    public async Task<AnimationInfo> CreateAsync(long userId, AnimationInsertInfo info)
    {
        var file = AnimationFormat.Parse(info.Content);
        // Name and type are validated before anything is stored, so a bad request leaves no file behind.
        var animation = Animation.Create(userId, info.Name, info.Type, file.Duration, file.Loop);
        var fileName = await _imageService.StoreAnimationAsync(AnimationFormat.Serialize(info.Content));
        Animation saved;
        try
        {
            animation.AttachFile(fileName);
            saved = await _repository.InsertAsync(animation);
        }
        catch
        {
            await _imageService.DeleteAnimationAsync(fileName);
            throw;
        }
        return MapToDto(saved, await OwnerNamesAsync(new[] { userId }));
    }

    public async Task<AnimationInfo> UpdateAsync(long userId, long animationId, AnimationUpdateInfo info)
    {
        var animation = await GetOwnedAsync(userId, animationId);
        var oldType = animation.AnimationType;
        animation.Rename(info.Name);
        animation.ChangeType(info.Type);
        if (animation.AnimationType != oldType && AnimationStates.FieldOf(oldType) is { } field
            && await IsUsedInAsync(animationId, field))
            throw new ConflictException(IN_USE);
        var saved = await _repository.UpdateAsync(animation);
        return MapToDto(saved, await OwnerNamesAsync(new[] { saved.UserId }));
    }

    public async Task DeleteAsync(long userId, long animationId)
    {
        var animation = await GetOwnedAsync(userId, animationId);
        if (await _tokenRepository.AnyUsesClipAsync(AnimationStates.Choice(animationId), idle: true, walk: true, down: true))
            throw new ConflictException(IN_USE);
        await _repository.DeleteAsync(animationId);
        await _imageService.DeleteAnimationAsync(animation.FileName);
    }

    private Task<bool> IsUsedInAsync(long animationId, string field) => _tokenRepository.AnyUsesClipAsync(
        AnimationStates.Choice(animationId),
        idle: field == AnimationStates.IDLE_FIELD,
        walk: field == AnimationStates.WALK_FIELD,
        down: field == AnimationStates.DOWN_FIELD);

    private async Task<Animation> GetAnimationAsync(long animationId) =>
        await _repository.GetByIdAsync(animationId) ?? throw new KeyNotFoundException(NOT_FOUND);

    private async Task<Animation> GetOwnedAsync(long userId, long animationId)
    {
        var animation = await GetAnimationAsync(animationId);
        if (!animation.IsOwnedBy(userId))
            throw new UnauthorizedAccessException("Apenas o dono pode alterar ou excluir esta animação.");
        return animation;
    }

    private async Task<Dictionary<long, string>> OwnerNamesAsync(IEnumerable<long> userIds)
    {
        var users = await _userRepository.ListByIdsAsync(userIds.Distinct());
        return users.ToDictionary(user => user.UserId, user => user.Name);
    }

    private static AnimationInfo MapToDto(Animation animation, IReadOnlyDictionary<long, string> owners) => new()
    {
        AnimationId = animation.AnimationId,
        UserId = animation.UserId,
        OwnerName = owners.GetValueOrDefault(animation.UserId),
        Name = animation.Name,
        Type = (int)animation.AnimationType,
        Duration = animation.Duration,
        Loop = animation.Loop,
        FileUrl = $"/api/animation/{animation.AnimationId}/file",
        CreatedAt = animation.CreatedAt,
        UpdatedAt = animation.UpdatedAt
    };
}
