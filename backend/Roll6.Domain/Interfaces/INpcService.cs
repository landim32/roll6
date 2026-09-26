using Roll6.DTO.Common;
using Roll6.DTO.Npc;

namespace Roll6.Domain.Interfaces;

public interface INpcService
{
    Task<PagedList<NpcInfo>> ListAsync(long userId, PageQuery query);
    Task<NpcInfo> GetByIdAsync(long userId, long npcId);
    Task<NpcInfo> CreateAsync(long userId, NpcInsertInfo info);
    Task<NpcInfo> UpdateAsync(long userId, long npcId, NpcInsertInfo info);
    Task DeleteAsync(long userId, long npcId);
}
