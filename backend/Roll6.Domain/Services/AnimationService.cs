using System.Text.Json;
using Roll6.Domain.Animations;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.DTO.Animation;
using Roll6.DTO.Common;
using Roll6.DTO.Image;
using Roll6.DTO.Realtime.Animation;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Domain.Services;

/// <summary>
/// The animation library (059). Uploading validates the <c>roll6-animation</c> file (<see cref="AnimationFormat"/>),
/// stores it in the bucket and inserts the row. A stored file is never overwritten: a new content is stored as a new file,
/// the row points to it and the old file is removed (<see cref="ReplaceContentAsync"/>). An animation used by a token
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
    private readonly IAnimationConversationRepository<AnimationConversation> _conversationRepository;
    private readonly IAnimationNotifier _notifier;

    public AnimationService(
        IAnimationRepository<Animation> repository,
        ITokenRepository<Token> tokenRepository,
        IUserRepository<User> userRepository,
        IImageService imageService,
        IAnimationConversationRepository<AnimationConversation> conversationRepository,
        IAnimationNotifier notifier)
    {
        _repository = repository;
        _tokenRepository = tokenRepository;
        _userRepository = userRepository;
        _imageService = imageService;
        _conversationRepository = conversationRepository;
        _notifier = notifier;
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

    public async Task<JsonElement> ReadContentAsync(long animationId)
    {
        var file = await OpenFileAsync(animationId);
        await using var stream = file.Content;
        using var document = await JsonDocument.ParseAsync(stream);
        return document.RootElement.Clone();
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
        // Everything is validated before the new file is stored, so a bad request leaves the animation and the bucket as they were.
        var content = info.Content is { ValueKind: not (JsonValueKind.Undefined or JsonValueKind.Null) } given ? given : (JsonElement?)null;
        var file = content is { } json ? AnimationFormat.Parse(json) : null;
        var oldType = animation.AnimationType;
        if (info.Name is not null)
            animation.Rename(info.Name);
        if (info.Type is { } type)
            animation.ChangeType(type);
        if (animation.AnimationType != oldType && AnimationStates.FieldOf(oldType) is { } field
            && await IsUsedInAsync(animationId, field))
            throw new ConflictException(IN_USE);
        if (file is null)
        {
            var updated = await _repository.UpdateAsync(animation);
            return MapToDto(updated, await OwnerNamesAsync(new[] { updated.UserId }));
        }
        return await SaveWithNewFileAsync(animation, content!.Value, file);
    }

    public async Task<AnimationInfo> ReplaceContentAsync(long userId, long animationId, AnimationContentInfo info, string origin = AnimationVersionInfo.ORIGIN_USER)
    {
        var animation = await GetOwnedAsync(userId, animationId);
        var saved = await SaveWithNewFileAsync(animation, info.Content, AnimationFormat.Parse(info.Content));
        // The editors (and the working file of the console, when the change did not come from it) follow the new version (086).
        await _notifier.VersionAsync(new AnimationVersionInfo
        {
            AnimationId = animationId,
            Name = saved.Name,
            Content = info.Content,
            Origin = origin,
            UserId = userId
        });
        return saved;
    }

    /// <summary>Stores the new file, points the row to it and only then removes the old one (a failed update removes the new file).</summary>
    private async Task<AnimationInfo> SaveWithNewFileAsync(Animation animation, JsonElement content, AnimationFile file)
    {
        var oldFileName = animation.FileName;
        var fileName = await _imageService.StoreAnimationAsync(AnimationFormat.Serialize(content));
        Animation saved;
        try
        {
            animation.ReplaceFile(fileName, file.Duration, file.Loop);
            saved = await _repository.UpdateAsync(animation);
        }
        catch
        {
            await _imageService.DeleteAnimationAsync(fileName);
            throw;
        }
        await _imageService.DeleteAnimationAsync(oldFileName);
        return MapToDto(saved, await OwnerNamesAsync(new[] { saved.UserId }));
    }

    public async Task DeleteAsync(long userId, long animationId)
    {
        var animation = await GetOwnedAsync(userId, animationId);
        if (await _tokenRepository.AnyUsesClipAsync(AnimationStates.Choice(animationId), idle: true, walk: true, down: true))
            throw new ConflictException(IN_USE);
        // The editor conversations point to the animation (086) and the FKs never cascade.
        await _conversationRepository.DeleteByAnimationAsync(animationId);
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
