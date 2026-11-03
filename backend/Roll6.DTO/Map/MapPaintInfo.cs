using System.Text.Json.Serialization;

namespace Roll6.DTO.Map;

/// <summary>A painted hex of a campaign map (107). kind: 1 Wall, 2 Stone, 3 Hole, 4 Water, 5 Fire, 6 Entrance, 7 Mark.</summary>
public class MapHexMarkInfo
{
    [JsonPropertyName("x")]
    public int X { get; set; }

    [JsonPropertyName("y")]
    public int Y { get; set; }

    [JsonPropertyName("kind")]
    public int Kind { get; set; }

    /// <summary>Only for kind 7 (Mark); null otherwise.</summary>
    [JsonPropertyName("text")]
    public string? Text { get; set; }
}

/// <summary>One hex of a batch write (107): kind null removes the hex's mark.</summary>
public class MapHexMarkWriteInfo
{
    [JsonPropertyName("x")]
    public int X { get; set; }

    [JsonPropertyName("y")]
    public int Y { get; set; }

    [JsonPropertyName("kind")]
    public int? Kind { get; set; }

    [JsonPropertyName("text")]
    public string? Text { get; set; }
}

/// <summary>Body of PUT /api/map/{id}/hex-marks (107): 1 to 200 hexes, applied all or nothing.</summary>
public class MapHexMarksInfo
{
    [JsonPropertyName("marks")]
    public List<MapHexMarkWriteInfo> Marks { get; set; } = new();
}

/// <summary>Body of POST /api/map/{id}/drawing (107). kind: 1 Rectangle, 2 Circle, 3 Pencil, 4 Line, 5 Arrow.</summary>
public class MapDrawingInsertInfo
{
    [JsonPropertyName("kind")]
    public int Kind { get; set; }

    /// <summary>[[x, y], …] in map pixels: 2 points (corners, center + rim, start + end) or 2–2000 for the pencil.</summary>
    [JsonPropertyName("points")]
    public List<int[]> Points { get; set; } = new();

    [JsonPropertyName("color")]
    public string? Color { get; set; }

    [JsonPropertyName("width")]
    public int Width { get; set; }

    [JsonPropertyName("opacity")]
    public double Opacity { get; set; }
}

public class MapDrawingInfo
{
    [JsonPropertyName("mapDrawingId")]
    public long MapDrawingId { get; set; }

    [JsonPropertyName("kind")]
    public int Kind { get; set; }

    [JsonPropertyName("points")]
    public List<int[]> Points { get; set; } = new();

    [JsonPropertyName("color")]
    public string Color { get; set; } = string.Empty;

    [JsonPropertyName("width")]
    public int Width { get; set; }

    [JsonPropertyName("opacity")]
    public double Opacity { get; set; }

    [JsonPropertyName("userId")]
    public long UserId { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }
}

/// <summary>The whole paint of a campaign map (107): marks inside the current grid and drawings oldest first.</summary>
public class MapPaintInfo
{
    [JsonPropertyName("mapId")]
    public long MapId { get; set; }

    [JsonPropertyName("marks")]
    public List<MapHexMarkInfo> Marks { get; set; } = new();

    [JsonPropertyName("drawings")]
    public List<MapDrawingInfo> Drawings { get; set; } = new();
}

/// <summary>
/// A change of a map's paint (107): the data of the realtime event <c>mapPaint.changed</c> and the result of
/// PUT …/hex-marks. Apply in order: cleared, removedHexes, marks, deletedDrawingId, drawing.
/// </summary>
public class MapPaintChangeInfo
{
    [JsonPropertyName("mapId")]
    public long MapId { get; set; }

    [JsonPropertyName("marks")]
    public List<MapHexMarkInfo> Marks { get; set; } = new();

    [JsonPropertyName("removedHexes")]
    public List<HexCoordInfo> RemovedHexes { get; set; } = new();

    [JsonPropertyName("drawing")]
    public MapDrawingInfo? Drawing { get; set; }

    [JsonPropertyName("deletedDrawingId")]
    public long? DeletedDrawingId { get; set; }

    /// <summary>Every mark and drawing of the map was removed.</summary>
    [JsonPropertyName("cleared")]
    public bool Cleared { get; set; }
}

public class HexCoordInfo
{
    [JsonPropertyName("x")]
    public int X { get; set; }

    [JsonPropertyName("y")]
    public int Y { get; set; }
}

/// <summary>What is on one hex of a campaign map (107): its mark and every piece whose shape covers it.</summary>
public class HexContentInfo
{
    [JsonPropertyName("mapId")]
    public long MapId { get; set; }

    [JsonPropertyName("x")]
    public int X { get; set; }

    [JsonPropertyName("y")]
    public int Y { get; set; }

    [JsonPropertyName("inside")]
    public bool Inside { get; set; }

    [JsonPropertyName("mark")]
    public MapHexMarkInfo? Mark { get; set; }

    [JsonPropertyName("pieces")]
    public List<HexPieceInfo> Pieces { get; set; } = new();
}

/// <summary>A piece covering a hex (107), with the name it shows (character / NPC instance / object).</summary>
public class HexPieceInfo
{
    [JsonPropertyName("mapTokenId")]
    public long MapTokenId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>1 Character, 2 Npc, 4 Object.</summary>
    [JsonPropertyName("tokenType")]
    public int TokenType { get; set; }

    [JsonPropertyName("campaignCharacterId")]
    public long? CampaignCharacterId { get; set; }

    [JsonPropertyName("characterId")]
    public long? CharacterId { get; set; }

    [JsonPropertyName("mapNpcId")]
    public long? MapNpcId { get; set; }

    /// <summary>1 standing, 2 down, 3 out of combat; null for objects.</summary>
    [JsonPropertyName("posture")]
    public int? Posture { get; set; }

    /// <summary>The piece's position (the middle of its shape), which may be another hex than the one asked.</summary>
    [JsonPropertyName("x")]
    public int X { get; set; }

    [JsonPropertyName("y")]
    public int Y { get; set; }
}
