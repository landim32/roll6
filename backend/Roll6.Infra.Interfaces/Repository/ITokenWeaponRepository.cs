namespace Roll6.Infra.Interfaces.Repository;

/// <summary>The weapons in the sockets of tokens' 3D models (083, <c>token_weapons</c>).</summary>
public interface ITokenWeaponRepository<TModel> where TModel : class
{
    /// <summary>Every row of the given tokens.</summary>
    Task<List<TModel>> ListByTokenIdsAsync(IEnumerable<long> tokenIds);
    /// <summary>Deletes the token's rows and inserts the new ones — run inside the caller's <see cref="IUnitOfWork"/>.</summary>
    Task ReplaceAsync(long tokenId, IEnumerable<TModel> rows);
    /// <summary>Deletes the token's rows (before the token itself: the FK never cascades).</summary>
    Task DeleteByTokenAsync(long tokenId);
    /// <summary>Whether any token carries this library weapon in any socket.</summary>
    Task<bool> AnyByWeaponAsync(long weaponId);
}
