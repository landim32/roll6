# Contracts: Status da campanha

## API

### `PUT /api/campaign/{id}/status` (new, `[Authorize]`, master)

Request:
```json
{ "status": 3 }
```
Responses:
- **200** `CampaignInfo` (with `status`). Publishes `campaign.changed` only when the value changed.
- **400** `status` "Status inválido." (not 1–4)
- **403** not the master
- **404** campaign not found

### Changed reads
- `CampaignInfo.status` (int 1–4) appears in every campaign read.
- `CampaignTableInfo.status` appears in `GET /api/campaign/table`.
- `POST /api/campaign` answers `status: 1`.

### New refusal (409 `ProblemDetails`, detail "A campanha está pausada." / "… finalizada." / "… em preparação.")
- `POST /api/maptoken`, `POST /api/maptoken/character`, `PUT /api/maptoken/{id}`, `PUT …/position`, `PUT …/token`, `PUT …/posture`, `DELETE /api/maptoken/{id}`: refused for players unless Active, and for the master in Paused/Finished.
- `POST`/`PUT`/`DELETE /api/mapnpc`, `POST /api/map` (campaign map): refused in Paused/Finished.
- `POST /api/turn/action`, `POST /api/turn/reset`, `POST /api/campaign/{id}/turn/finish`, `POST …/turn/process`, `PUT …/turn/current`, `POST /api/chat/{id}/convert`, `POST /api/campaign/{id}/poke`: refused unless Active.
- Request access, invite, approve, accept invite (`/api/campaigncharacter/...`): refused unless Active.

### Chat items
- `canConvert` is null while the campaign is not Active.

## MCP
- New `set_campaign_status` (campaignId, status 1–4 or name). Annotations: Idempotent, not destructive.
- Guide section "Campaign status".
- Counts: 100 operations / 101 tools.

## UI
- **`CampaignSettingsModal`** (master): a select "Status da campanha" (Preparando / Ativa / Pausada / Finalizada) above the tabs. Saving happens on change, then the toast `campaignStatus.changed`.
- **`TableSelect`**: a badge next to the campaign when it is not Active (`campaignStatus.label.*`).
- **Map footer**: "Campanha em preparação / pausada / finalizada" when it is not Active.
- **Hidden when the campaign is not playable for the viewer:**
  - `PendingPlayers`;
  - the composer's "Ação" option;
  - "Converter" in the hold menu;
  - "Cutucar";
  - "Finalizar turno";
  - HexMenu "Agir" and "Resetar turno".
- **Hidden when `canEditMap` is false:**
  - HexMenu "Mover", include/change token, posture and remove;
  - party/NPC card dragging and "Incluir NPC" on the map panel;
  - the image/resize map controls of an open campaign map.
- **Disabled unless Active:** invite / approve / accept / request access buttons, each with a tooltip `campaignStatus.blockedJoin`.
