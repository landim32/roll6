namespace Roll6.Infra.Interfaces.Repository;

/// <summary>The conversations of the animation editor (086): at most one open per animation.</summary>
public interface IAnimationConversationRepository<TModel> where TModel : class
{
    Task<TModel?> GetByIdAsync(long id);
    /// <summary>The open conversation of the animation, or null.</summary>
    Task<TModel?> GetOpenAsync(long animationId);
    Task<TModel> InsertAsync(TModel entity);
    Task<TModel> UpdateAsync(TModel entity);
    /// <summary>Deletes every conversation of the animation (their messages first).</summary>
    Task DeleteByAnimationAsync(long animationId);
}

/// <summary>The lines of the editor conversations (086).</summary>
public interface IAnimationMessageRepository<TModel> where TModel : class
{
    /// <summary>The lines of a conversation, oldest first, the last <paramref name="take"/> of them.</summary>
    Task<List<TModel>> ListByConversationAsync(long conversationId, int take = 500);
    Task<TModel> InsertAsync(TModel entity);
}
