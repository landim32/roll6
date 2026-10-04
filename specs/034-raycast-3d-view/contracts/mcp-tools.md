# Contract: MCP tools (034)

Nenhuma ferramenta nova; `McpCoverageTests` = 86 operações / 87 ferramentas. Parâmetros novos com default.

| Ferramenta | Muda |
|---|---|
| `create_map_model`, `update_map_model` | − `kind`, `walls`, `skyImage`; + `maskImage` ("3D mask: black = wall, white = empty, same proportion as the map image; only used by the 3D view in the web app"), + `backgroundImage` ("Background/sky of the 3D view, a 360° panorama repeated around the camera") |
| `get_map_model`, `list_map_models` | *Returns* com `maskImage`, `maskImageUrl`, `backgroundImage`, `backgroundImageUrl` |
| `create_token`, `update_token` | + `frontImage` ("2.5D front image: the figure seen from the front, standing, used by the 3D view; optional") |
| `get_token`, `list_tokens` | *Returns* com `frontImage`, `frontImageUrl` |
| `list_map_tokens` | *Returns* com `frontImageUrl` |
| Ferramentas de posição | sai "409 a wall is on that hex (story maps)" |

`roll6://guide`: a seção "Story maps (2.5D)" vira **"3D view"**: todo mapa tem a vista 3D no app (raycasting estilo
Wolfenstein 3D); a máscara define as paredes só no 3D e não afeta o 2D nem as peças; o fundo é um panorama; tokens
podem ter a imagem 2,5D frente; `update_map_model` substitui todos os campos (reenviar `maskImage`/`backgroundImage`).
