namespace Roll6.Domain.Grid;

/// <summary>
/// Hex grid math for flat-top hexagons, following "Size and Spacing" in
/// https://www.redblobgames.com/grids/hexagons/. Pure and framework-free: the frontend keeps an
/// identical module, so any change here must be mirrored there (constitution Principle VII).
/// </summary>
public static class HexGrid
{
    /// <summary>
    /// Fixed hex size (center to corner, px) used by every grid. The grid never changes size when
    /// the scene image is moved or resized; the image is adjusted under it.
    /// </summary>
    public const int HEX_SIZE = 40;

    /// <summary>
    /// Stored column/row ("odd-q" offset: odd columns shifted half a hex down) to axial, for
    /// distance/neighbor/line math. See "Offset coordinates" → "Conversions" in the guide.
    /// </summary>
    public static (int Q, int R) OffsetToAxial(int x, int y)
    {
        return (x, y - (x - (x & 1)) / 2);
    }

    /// <summary>Axial back to the stored column/row ("odd-q" offset).</summary>
    public static (int X, int Y) AxialToOffset(int q, int r)
    {
        return (q, r + (q - (q & 1)) / 2);
    }
}
