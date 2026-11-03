namespace Roll6.Infra.Interfaces.Repository;

/// <summary>The paint of campaign maps (107): hex marks (one per hex) and drawings.</summary>
public interface IMapPaintRepository<TMark, TDrawing> where TMark : class where TDrawing : class
{
    /// <summary>Every mark of the map (also outside the current grid; the service filters).</summary>
    Task<List<TMark>> ListMarksAsync(long mapId);

    Task<TMark?> GetMarkAsync(long mapId, int x, int y);

    /// <summary>
    /// Deletes the marks of <paramref name="removals"/> and inserts or replaces (by map + x + y) <paramref name="upserts"/>.
    /// Run it inside <c>IUnitOfWork</c> so the batch is all or nothing.
    /// </summary>
    Task ApplyMarksAsync(long mapId, IReadOnlyList<TMark> upserts, IReadOnlyList<(int X, int Y)> removals);

    /// <summary>Drawings of the map, oldest first (drawing order).</summary>
    Task<List<TDrawing>> ListDrawingsAsync(long mapId);

    Task<int> CountDrawingsAsync(long mapId);
    Task<TDrawing> InsertDrawingAsync(TDrawing drawing);
    Task<TDrawing?> GetDrawingAsync(long mapDrawingId);
    Task DeleteDrawingAsync(long mapDrawingId);

    /// <summary>Deletes every mark and drawing of the map; returns how many rows went.</summary>
    Task<int> ClearAsync(long mapId);

    /// <summary>Deletes the paint of these maps (campaign deletion, before the maps).</summary>
    Task DeleteByMapIdsAsync(IEnumerable<long> mapIds);
}
