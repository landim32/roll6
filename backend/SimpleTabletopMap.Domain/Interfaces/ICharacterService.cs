using SimpleTabletopMap.DTO.Character;
using SimpleTabletopMap.DTO.Common;

namespace SimpleTabletopMap.Domain.Interfaces;

public interface ICharacterService
{
    Task<List<CharacterInfo>> ListAsync(long userId);
    Task<PagedList<CharacterSearchInfo>> SearchAsync(PageQuery query);
    Task<CharacterInfo> GetByIdAsync(long userId, long characterId);
    Task<CharacterInfo> CreateAsync(long userId, CharacterInsertInfo info);
    Task<CharacterInfo> UpdateAsync(long userId, long characterId, CharacterInsertInfo info);
    Task DeleteAsync(long userId, long characterId);
}
