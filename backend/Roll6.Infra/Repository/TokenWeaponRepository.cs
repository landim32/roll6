using Microsoft.EntityFrameworkCore;
using Roll6.Domain.Models;
using Roll6.Infra.Context;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Infra.Repository;

public class TokenWeaponRepository : ITokenWeaponRepository<TokenWeapon>
{
    private readonly Roll6Context _context;

    public TokenWeaponRepository(Roll6Context context)
    {
        _context = context;
    }

    public async Task<List<TokenWeapon>> ListByTokenIdsAsync(IEnumerable<long> tokenIds)
    {
        var idList = tokenIds.Distinct().ToList();
        if (idList.Count == 0)
            return new List<TokenWeapon>();
        return await _context.TokenWeapons.AsNoTracking()
            .Where(e => idList.Contains(e.TokenId))
            .OrderBy(e => e.TokenId).ThenBy(e => e.Socket)
            .ToListAsync();
    }

    public async Task ReplaceAsync(long tokenId, IEnumerable<TokenWeapon> rows)
    {
        await _context.TokenWeapons.Where(e => e.TokenId == tokenId).ExecuteDeleteAsync();
        foreach (var row in rows)
        {
            row.TokenWeaponId = 0;
            row.TokenId = tokenId;
            _context.TokenWeapons.Add(row);
        }
        await _context.SaveChangesAsync();
    }

    public async Task DeleteByTokenAsync(long tokenId)
    {
        await _context.TokenWeapons.Where(e => e.TokenId == tokenId).ExecuteDeleteAsync();
    }

    public async Task<bool> AnyByWeaponAsync(long weaponId)
    {
        return await _context.TokenWeapons.AnyAsync(e => e.WeaponId == weaponId);
    }
}
