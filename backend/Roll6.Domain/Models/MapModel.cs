using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Grid;
using Roll6.Domain.Validation;

namespace Roll6.Domain.Models;

public class MapModel
{
    public const int DEFAULT_GRID_SIZE = 20;
    public const int MAX_GRID_SIZE = 500;
    public const int MAX_IMAGE_SIZE = 20000;

    public long MapModelId { get; set; }
    public long UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Image { get; set; }

    /// <summary>Grid size in flat-top hexes: columns × rows.</summary>
    public int GridWidth { get; set; } = DEFAULT_GRID_SIZE;
    public int GridHeight { get; set; } = DEFAULT_GRID_SIZE;

    /// <summary>Size (px) the original image is displayed at; both null = original size.</summary>
    public int? ImageWidth { get; set; }
    public int? ImageHeight { get; set; }

    /// <summary>
    /// Image offset (px) relative to the grid origin: the image is drawn at (−ImageLeft, −ImageTop).
    /// Negative values move the image right/down, positive values left/up.
    /// </summary>
    public int ImageTop { get; set; }
    public int ImageLeft { get; set; }

    /// <summary>2D battle map or 2.5D story map (033).</summary>
    public MapKind Kind { get; set; } = MapKind.Battle;

    /// <summary>
    /// Wall cells [x, y] (column/row, odd-q) of a story map, sorted by row then column, no duplicates, inside the grid;
    /// null = none. Kept when the map goes back to 2D, but only <see cref="ActiveWalls"/> block pieces.
    /// </summary>
    public List<int[]>? Walls { get; set; }

    /// <summary>Sky/horizon image ({guid}.{ext}) behind the walls in the 3D view.</summary>
    public string? SkyImage { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime ChangedAt { get; set; }

    public void Update(string? name, string? description, string? image)
    {
        Name = Guard.RequiredText(name, "name", 260);
        Description = Guard.OptionalText(description, "description", 2000);
        Image = Guard.ImageFileName(image, "image");
        ChangedAt = DateTime.UtcNow;
    }

    public void UpdateGrid(int? gridWidth, int? gridHeight)
    {
        GridWidth = GridSize(gridWidth, "gridWidth");
        GridHeight = GridSize(gridHeight, "gridHeight");
        ChangedAt = DateTime.UtcNow;
    }

    public void UpdateImageLayout(int? imageWidth, int? imageHeight, int? imageTop, int? imageLeft)
    {
        if (imageWidth.HasValue != imageHeight.HasValue)
        {
            var missing = imageWidth.HasValue ? "imageHeight" : "imageWidth";
            throw new DomainValidationException(missing, "Informe largura e altura de exibição juntas, ou nenhuma.");
        }

        var width = imageWidth.HasValue ? ImageSize(imageWidth.Value, "imageWidth") : (int?)null;
        var height = imageHeight.HasValue ? ImageSize(imageHeight.Value, "imageHeight") : (int?)null;
        var top = ImageOffset(imageTop, "imageTop");
        var left = ImageOffset(imageLeft, "imageLeft");

        ImageWidth = width;
        ImageHeight = height;
        ImageTop = top;
        ImageLeft = left;
        ChangedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Kind, walls and sky (033). Call after <see cref="UpdateGrid"/>: walls outside the grid are dropped (so shrinking
    /// the grid never fails), duplicates removed and the rest sorted by row then column.
    /// </summary>
    public void UpdateStory(int? kind, IEnumerable<int[]>? walls, string? skyImage)
    {
        var mapKind = (MapKind)(kind ?? (int)MapKind.Battle);
        if (!Enum.IsDefined(mapKind))
            throw new DomainValidationException("kind", "O tipo de mapa deve ser 1 (2D) ou 2 (história 2,5D).");

        var cells = new SortedSet<(int Y, int X)>();
        foreach (var wall in walls ?? Enumerable.Empty<int[]>())
        {
            if (wall == null || wall.Length != 2)
                throw new DomainValidationException("walls", "Cada parede deve ser um par [x, y].");
            if (HexGrid.IsInsideGrid(wall[0], wall[1], GridWidth, GridHeight))
                cells.Add((wall[1], wall[0]));
        }

        var sky = Guard.ImageFileName(skyImage, "skyImage");
        Kind = mapKind;
        Walls = cells.Count == 0 ? null : cells.Select(c => new[] { c.X, c.Y }).ToList();
        SkyImage = sky;
        ChangedAt = DateTime.UtcNow;
    }

    /// <summary>Walls that block pieces and show in 3D: those of a story map, none on a 2D map.</summary>
    public IReadOnlyList<(int X, int Y)> ActiveWalls() =>
        Kind == MapKind.Story && Walls != null ? Walls.Select(w => (w[0], w[1])).ToList() : Array.Empty<(int X, int Y)>();

    private static int GridSize(int? value, string field)
    {
        var size = value ?? DEFAULT_GRID_SIZE;
        if (size < 1 || size > MAX_GRID_SIZE)
            throw new DomainValidationException(field, $"O campo {field} deve estar entre 1 e {MAX_GRID_SIZE}.");
        return size;
    }

    private static int ImageSize(int value, string field)
    {
        if (value < 1 || value > MAX_IMAGE_SIZE)
            throw new DomainValidationException(field, $"O campo {field} deve estar entre 1 e {MAX_IMAGE_SIZE}.");
        return value;
    }

    private static int ImageOffset(int? value, string field)
    {
        var offset = value ?? 0;
        if (offset < -MAX_IMAGE_SIZE || offset > MAX_IMAGE_SIZE)
            throw new DomainValidationException(field, $"O campo {field} deve estar entre -{MAX_IMAGE_SIZE} e {MAX_IMAGE_SIZE}.");
        return offset;
    }
}
