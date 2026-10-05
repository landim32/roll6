# MCP documentation changes (036)

No tool, route or parameter is added or removed (86 operations / 87 tools; `McpCoverageTests` unchanged). Only descriptions change.

## `Roll6.Mcp/Tools/MapModelTools.cs` — constant `MASK_IMAGE`

Before: `3D mask: black = wall, white = empty, same proportion as the map image; only the 3D view uses it.`

After: `3D mask: same proportion as the map image; only the 3D view uses it. The tone is the wall height: black = full-height wall,
white = empty, a 50% gray = a wall half as tall (low walls can be seen over). Pure black and white work as before.`

Also in the `[Description]` of `create_map_model`/`update_map_model` (line mentioning `maskImage`): replace "a black and white image"
by "an image whose gray tones set the wall height".

## `Roll6.Mcp/Roll6Guide.cs` — section "3D view"

Replace the `maskImage` bullet by: *`maskImage` (from `upload_image`) is an image of the **same proportion as the map `image`**
covering the same area. Its tone is the wall height: **black = a wall of full height, white = empty space, a gray in between =
a lower wall** (50% gray = half the height; very light grays count as empty). Black and white masks behave exactly as before. It
only affects the 3D view — never the 2D map or the pieces.*

Add one line: *The 3D floor continues past the map image with the color of its nearest edge, and the speech balloons of the turn
in progress appear over the figures in the 3D view.*

## Tests

`McpDescriptionTests` only checks structure (What it does / Who can use it / …); if a test pins the old mask wording, update that
string. No new tests.
