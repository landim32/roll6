# Contrato MCP: ferramentas e guia (032)

**Feature**: `032-campaign-sheet-copy` · **Projeto**: `backend/Roll6.Mcp` (gateway fino — referencia só `Roll6.DTO`,
sem banco/S3/JWT; cada ferramenta é uma chamada REST via `Roll6ApiClient`, repassando `X-Api-Key`/`Authorization`
do chamador). Portanto **permissões, validações e eventos são os da API** — ver
[campaign-character-api.md](./campaign-character-api.md).

**Nenhuma ferramenta nova e nenhum endpoint novo.** As contagens fixadas em
`Roll6.Tests/Mcp/McpCoverageTests.cs` permanecem:

```csharp
expected.Should().HaveCount(86);  // operações da API menos McpToolCatalog.EXCLUDED
tools.Should().HaveCount(87);     // 86 + get_roll6_guide
```

---

## 1. `update_participation` — ganha um parâmetro

`backend/Roll6.Mcp/Tools/ParticipationTools.cs` · `[ApiOperation("PUT /api/campaigncharacter/{id}")]`

### Assinatura

```csharp
public static async Task<...> UpdateParticipation(
    [Description(...)] long campaignCharacterId,
    [Description(...)] int currentLife,
    [Description(...)] int currentEnergy,
    [Description(...)] string? characterStatus = null,
    [Description(McpDocs.CAMPAIGN_SHEET)] string? sheet = null,          // descrição REESCRITA
    [Description(...)] long? tokenId = null,
    [Description(McpDocs.POSTURE_OPTIONAL)] int? posture = null,
    [Description(McpDocs.SHEET_FILE_OPTIONAL)] string? sheetFile = null) // NOVO
```

> **O parâmetro novo PRECISA ter default (`= null`)**. `McpRouteParityTests` invoca toda ferramenta com valores de
> amostra e injeta o literal `"sample"` em parâmetros `string` **sem** default — `"sample"` falharia em
> `Guard.SheetFileName` (`^[0-9a-f]{32}\.(png|jpg|webp|pdf)$`). Com default, o teste usa `null` (= mantém) e passa.

### Semântica de `sheetFile` (idêntica à da API)

| Valor | Efeito |
|---|---|
| omitido / `null` | **mantém** o arquivo da campanha |
| `""` | **remove** o arquivo da campanha |
| `{32-hex}.{png\|jpg\|webp\|pdf}` | **troca** — nome devolvido por `upload_document` |

### `[Description]` novo (≥ 20 chars, exigência de `McpDescriptionTests`)

Sugestão para `McpDocs.cs`, ao lado de `SHEET`, `POSTURE_OPTIONAL`, `IMAGE_FILE`:

```csharp
public const string SHEET_FILE_OPTIONAL =
    "Campaign sheet file (image or PDF): the fileName returned by upload_document, or the current sheetFile " +
    "from get_participation to keep it. Send an empty string to remove it; omitting it also keeps it.";
```

### Descrição da ferramenta — texto a reescrever

O texto atual diz que as notas **não** são cópia da ficha. Trechos que precisam mudar:

| Onde | Hoje | Depois |
|---|---|---|
| `What it does:` | *"…and the campaign notes (`sheet`). The notes are NOT a copy of the character sheet: write only the differences caused by this campaign — items lost or gained, injuries, changed attributes… The character's own sheet never changes here."* | *"…and the campaign sheet (`sheet`), plus its sheet file (`sheetFile`). The campaign sheet starts as a copy of the character's sheet taken when the character joined and belongs to this campaign: write the character's full sheet as it stands here. The character's own sheet never changes through this tool."* |
| parâmetro `sheet` | *"Campaign notes in markdown (up to 20000 characters): only what changed in this campaign compared to the character's sheet, e.g. \"- Lost the long sword\". Send the current notes (from get_participation) to keep them; null clears them."* | *"Sheet of the character in this campaign, in markdown (up to 20000 characters): a copy of the character's sheet made when they joined, editable by the owner and the master. Send the current sheet (from get_participation) to keep it; null clears it."* |
| `Returns:` | inalterado estruturalmente | acrescentar `sheetFile`/`sheetFileUrl`/`sheetFileType` como sendo **os da campanha** |

`McpDescriptionTests` continua exigindo, em toda descrição: mais de 80 caracteres e as seções `What it does:`,
`Who can use it:`, `Returns:`, `Related tools:` (e `Common errors:` quando há `[ApiOperation]`); exatamente uma
linha `Related tools:` e todo nome `snake_case` citado nela precisa existir.

---

## 2. `get_participation` — descrição reescrita

`[ApiOperation("GET /api/campaigncharacter/{id}")]` · parâmetros inalterados (`long campaignCharacterId`).

| Onde | Hoje | Depois |
|---|---|---|
| `What it does:` | *"returns one participation with its campaign notes (`sheet`, markdown). The notes hold only what changed in this campaign compared to the character's sheet (e.g. \"lost the long sword\"); read the character's own sheet with get_character (owner) for everything else."* | *"returns one participation with the campaign's own copy of the character's sheet (`sheet`, markdown) and of its sheet file (`sheetFile`/`sheetFileUrl`/`sheetFileType`). The copy is made when the character joins and then evolves only here; `characterSheet` is the character's original sheet, read-only."* |
| `Returns:` | *"the participation plus sheet (the campaign notes), characterSheet (the character's own sheet, read-only here), characterTokenName/characterTokenImageUrl and the character's sheetFileUrl/sheetFileType."* | *"the participation plus sheet (this campaign's sheet), sheetFile/sheetFileUrl/sheetFileType (this campaign's sheet file), characterSheet (the character's original sheet, read-only here) and characterTokenName/characterTokenImageUrl."* |

**Mudança de fato no retorno**: `sheetFileUrl`/`sheetFileType` deixam de ser os do personagem e passam a ser os da
campanha; `sheetFile` (nome cru) é acrescentado. `characterSheet` permanece.

---

## 3. `accept_invite` e `approve_access_request` — descrição do reset

Ambos dizem hoje: *"the character becomes approved (current life/energy reset to the totals, status and campaign
notes cleared)"*.

Passam a dizer: *"the character becomes approved (current life/energy reset to the totals, status cleared and
posture standing, and the campaign sheet and its file re-copied from the character)"* — é o que `ResetFrom` faz
(FR-003, US5-AS4).

---

## 4. Ferramentas que **não** mudam

| Ferramenta | Motivo |
|---|---|
| `update_character`, `create_character` | `sheetFile` continua sendo o arquivo **original** do personagem, só do dono (FR-011). A descrição de `update_character` já avisa que omitir remove — permanece verdadeiro |
| `get_character` | continua só do dono (*"masters read campaign data with get_participation instead"*) — agora ainda mais preciso, pois o mestre lê a ficha da campanha lá |
| `upload_document` | entidade-agnóstico; o `fileName` serve tanto para o personagem quanto para a campanha. Vale acrescentar ao `Returns:`/descrição que o nome pode ser gravado em `sheetFile` do personagem **ou** da participação |
| `list_my_participations`, `list_my_characters`, `request_campaign_access`, `invite_character`, `list_my_invites`, `decline_invite`, `deny_access_request`, `remove_participation`, `delete_character`, `transfer_character`, `search_characters` | usam DTOs de lista ou não tocam ficha |
| `process_turn`, `get_turn_data`, `get_turn_summary`, `set_piece_posture`, ferramentas de mapa/token | `process_turn` não chama `ChangeSheetFile` e preserva `SheetFile` (D2); `get_turn_summary` muda apenas o **rótulo** impresso (D6) |

---

## 5. `Roll6Guide.cs` (`roll6://guide`) — dois parágrafos

`backend/Roll6.Mcp/Roll6Guide.cs`, constantes `URI`, `INSTRUCTIONS` e `MARKDOWN`.

**Parágrafo "Characters"** (linhas ~36-40), trecho final hoje:

> *"Besides the markdown `sheet`, a character may have a **sheet file** (image or PDF, stored as sent):
> `upload_document` → `sheetFile` on create/update_character."*

Acrescentar que, ao entrar numa campanha, o texto e o arquivo são **copiados** para a participação e passam a
evoluir lá.

**Parágrafo "Campaigns and participation"** (linhas ~53-57), hoje:

> *"Each participation holds the campaign values of the character: current life/energy (may go to 0 or below; that
> does not change posture), a free-text status and the **campaign notes** (`sheet` of the participation,
> `update_participation`, by the owner or the master). The notes are not a copy of the character's sheet: they
> start empty when the character joins and record only what changed in this campaign (e.g. the character had a
> sword and lost it). The character's own sheet stays the reference and is never changed by campaign play."*

Substituir por (mantendo o tom e o tamanho):

> *"Each participation holds the campaign values of the character: current life/energy (may go to 0 or below; that
> does not change posture), a free-text status, the posture, and the character's **campaign sheet** — the
> participation's `sheet` and `sheetFile`, copied from the character when they join and from then on editable only
> here, by the owner or the master (`update_participation`). The character's own sheet and sheet file are never
> changed by campaign play; the master cannot change them at all."*

A linha ~87, que cita `posture` em `update_participation`, deve passar a citar também `sheetFile`.

---

## 6. Testes MCP afetados

| Arquivo | Efeito |
|---|---|
| `McpCoverageTests.cs` | **sem alteração** (86/87 preservados) |
| `McpDescriptionTests.cs` | o `[Description]` de `sheetFile` precisa existir e ter ≥ 20 chars; todas as descrições reescritas continuam precisando das cinco seções e de > 80 chars |
| `McpRouteParityTests.cs` | passa sem alteração **desde que** `sheetFile` tenha default `null` |
| `McpToolCatalog.cs` | **sem alteração** — `EXCLUDED` continua com 9 entradas |
