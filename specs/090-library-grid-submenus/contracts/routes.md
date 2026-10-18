# Library routes (090, on top of 087)

| Path | Page | Submenu marked |
|---|---|---|
| `/library/campaigns` | CampaignsPage `mine` | Campanhas › Minhas campanhas |
| `/library/campaigns/search` | CampaignsPage `search` | Campanhas › Buscar |
| `/library/campaigns/playing` | CampaignsPage `playing` | Campanhas › Jogando |
| `/library/campaigns/new` | CampaignCreatePage (+ image) | Campanhas |
| `/library/campaigns/:slug/:section` | CampaignEditPage (+ image) | Campanhas |
| `/library/maps` | MapsPage `mine` | Mapas › Meus mapas |
| `/library/maps/search` | MapsPage `search` | Mapas › Buscar |
| `/library/maps/campaign` | MapsPage `campaign` | Mapas › Da campanha |
| `/library/maps/:id` | MapEditPage | Mapas |
| `/library/characters`, `/library/characters/:id` | unchanged (4/3-col cards) | Personagens |
| `/library/npcs`, `/library/npcs/:id` | unchanged (4/3-col cards) | NPCs |
| `/library/tokens` | TokensPage `mine` | Tokens › Meus tokens |
| `/library/tokens/search` | TokensPage `search` | Tokens › Buscar |
| `/library/tokens/:id` (`new`) | TokenEditPage | Tokens |
| `/library/weapons` | WeaponsPage `mine` | Armas › Minhas armas |
| `/library/weapons/search` | WeaponsPage `search` | Armas › Buscar |
| `/library/weapons/new` | WeaponCreatePage (new) | Armas |
| `/library/weapons/:id` | WeaponEditPage | Armas |
| `/library/animations` | AnimationsPage `mine` | Animações › Minhas animações |
| `/library/animations/search` | AnimationsPage `search` | Animações › Buscar |
| `/library/animations/new` | AnimationCreatePage (new) | Animações |
| `/library/animations/:id`, `/:id/editor` | unchanged | Animações |

## Legacy `?tab=` (replace navigation)

| From | To |
|---|---|
| `/library/campaigns?tab=mine` · `search` · `playing` | `/library/campaigns` · `/search` · `/playing` |
| `/library/maps?tab=campaign` · `mine` · `search` | `/library/maps/campaign` · `/library/maps` · `/search` |
| `/library/tokens?tab=search` | `/library/tokens/search` |
| `/library/weapons?tab=search` · `upload` | `/library/weapons/search` · `/library/weapons/new` |
| `/library/animations?tab=search` · `upload` | `/library/animations/search` · `/library/animations/new` |

An unknown `tab` value is dropped and the section's first submenu is shown.

## Table entry points

- "Outras campanhas…" → `/library/campaigns/search`.
- "Mapas…" → `/library/maps`, i.e. Meus mapas. It was 087's "Da campanha" default, and the submenu now carries the
  choice.
