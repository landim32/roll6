# Contrato REST: participação e personagem (032)

**Feature**: `032-campaign-sheet-copy` · **Base**: `/api` · **Auth**: `[Authorize]` em nível de classe nos dois
controllers (JWT `Authorization: Bearer` ou `X-Api-Key`; o `sub` vira `CurrentUserId` em `ApiControllerBase`).

Convenção do projeto (constituição v3.0.0): **sucesso devolve o DTO diretamente**, erro devolve
`ProblemDetails`/`ValidationProblemDetails` (RFC 7807). Nenhum envelope `sucesso`/`mensagem`/`erros`.
Mapeamento em `ApiControllerBase.HandleException`: `DomainValidationException` → 400 · `UnauthorizedAccessException`
→ 403 · `KeyNotFoundException` → 404 · `ConflictException` → 409 · resto → 500.

**Nenhum endpoint novo nesta feature** — restrição dura de `McpCoverageTests` (86 operações / 87 ferramentas).

---

## 1. `GET /api/campaigncharacter/{id}` — detalhe da participação

`CampaignCharacterController.GetById(long id)` → `CampaignCharacterService.GetByIdAsync(userId, id)`
**Permissão**: dono do personagem, mestre da campanha ou participante aprovado (V6). Senão 403.
**Resposta**: `200` `CampaignCharacterDetailInfo`. **Inalterado em forma**; três campos mudam de origem e um é novo.

| JSON | Tipo | Antes (022/023) | Depois (032) |
|---|---|---|---|
| `sheet` | `string \| null` | notas da campanha (só o que mudou) | **ficha da campanha em texto** — cópia da ficha do personagem no momento da entrada |
| `characterSheet` | `string \| null` | ficha original, somente leitura | **inalterado** |
| `sheetFileUrl` | `string \| null` | URL pré-assinada do arquivo **do personagem** | URL pré-assinada do arquivo **da campanha** |
| `sheetFileType` | `"image" \| "pdf" \| null` | tipo do arquivo **do personagem** | tipo do arquivo **da campanha** |
| **`sheetFile`** | `string \| null` | *(não existia)* | **NOVO** — nome armazenado (`{32-hex}.{ext}`) do arquivo da campanha; necessário para o cliente reenviar o arquivo ao salvar sem perdê-lo |

Campos herdados de `CampaignCharacterInfo` (todos inalterados): `campaignCharacterId`, `campaignId`,
`campaignName`, `campaignOwnerName`, `characterId`, `characterName`, `characterImageUrl`, `characterOwnerId`,
`characterOwnerName`, `status`, `currentLife`, `currentEnergy`, `totalLife`, `totalEnergy`, `characterMove`,
`characterStatus`, `posture`, `characterTokenId`, `createdAt`, `updatedAt`; e do detalhe,
`characterTokenName`, `characterTokenImageUrl`.

> `GET /api/campaign/{id}/character` (lista do painel) e `GET /api/campaigncharacter/mine` devolvem
> `CampaignCharacterInfo` — **sem nenhum campo de ficha**. Não mudam e não crescem (elas são consultadas por poll
> de 15 s).

**Exemplo** — personagem com ficha original `"Força 4"` e PDF, participação com ficha da campanha editada para
`"Força 5"` e sem arquivo:

```json
{
  "campaignCharacterId": 31, "campaignId": 7, "campaignName": "Mina Perdida",
  "campaignOwnerName": "Mestre Ana", "characterId": 20, "characterName": "Thorin",
  "characterImageUrl": "https://…/0ac….webp", "characterOwnerId": 2, "characterOwnerName": "Bruno",
  "status": 3, "currentLife": 9, "currentEnergy": 4, "totalLife": 12, "totalEnergy": 6,
  "characterMove": 5, "characterStatus": "envenenado", "posture": 1, "characterTokenId": 88,
  "createdAt": "2026-09-30T12:00:00", "updatedAt": "2026-09-30T14:30:00",
  "sheet": "Força 5",
  "characterSheet": "Força 4",
  "characterTokenName": "Anão Guerreiro", "characterTokenImageUrl": "https://…/1bd….png",
  "sheetFile": null, "sheetFileUrl": null, "sheetFileType": null
}
```

Erros: `403` `"Apenas o mestre ou participantes aprovados podem ver este personagem."` · `404`
`"Participação não encontrada."`

---

## 2. `PUT /api/campaigncharacter/{id}` — alterar dados da campanha

`CampaignCharacterController.Update(long id, [FromBody] CampaignCharacterUpdateInfo info)` →
`CampaignCharacterService.UpdateAsync(userId, id, info)`
**Permissão**: dono **ou** mestre (V1). 403 caso contrário. A participação precisa estar `Approved` (V2) — 409.

### Corpo `CampaignCharacterUpdateInfo`

| JSON | Tipo | Obrigatório | Semântica | Mudança |
|---|---|---|---|---|
| `currentLife` | `int` | sim | ≤ `totalLife`; pode ser ≤ 0 | — |
| `currentEnergy` | `int` | sim | ≤ `totalEnergy`; pode ser ≤ 0 | — |
| `characterStatus` | `string \| null` | não | texto livre ≤ 260; `null`/branco limpa | — |
| `sheet` | `string \| null` | não | **ficha da campanha em texto**, ≤ 20.000; `null`/branco limpa | significado novo (FR-001) |
| `tokenId` | `long \| null` | não | **`null` = mantém**; número troca o token **do personagem** (exceção de FR-010) | — |
| `posture` | `int \| null` | não | **`null` = mantém**; 1 Em pé, 2 Caído, 3 Fora de combate | — |
| **`sheetFile`** | `string \| null` | não | **`null` ou ausente = mantém · `""` = remove · `{32-hex}.{png\|jpg\|webp\|pdf}` = troca** | **NOVO** |

> **Por que `""` em vez de `null` para remover** (pesquisa D3): este DTO é de atualização *parcial* — `tokenId` e
> `posture` já usam `null` = mantém. Usar `null` = remove aqui faria qualquer `PUT` que omitisse o campo
> **apagar silenciosamente** a ficha em arquivo da campanha. A divergência em relação a
> `CharacterInsertInfo.sheetFile` (onde `null` remove, convenção da 022) é deliberada: aquele DTO é de
> substituição completa.

**Resposta**: `200` `CampaignCharacterDetailInfo` (já com os valores novos).

**Exemplo** — mestre troca o texto e o arquivo da campanha:

```json
{
  "currentLife": 9, "currentEnergy": 4, "characterStatus": "envenenado",
  "sheet": "# Thorin na Mina Perdida\n\nForça 5 (espada envenenada)",
  "posture": 1,
  "sheetFile": "3f2a9c1d4e5b67890123456789abcdef.pdf"
}
```

**Exemplo** — remover o arquivo da campanha mantendo o resto:

```json
{ "currentLife": 9, "currentEnergy": 4, "characterStatus": null, "sheet": "Força 5", "sheetFile": "" }
```

Erros: `400` `ValidationProblemDetails` com chaves `currentLife`/`currentEnergy`/`characterStatus`/`sheet`/
`sheetFile`/`posture` · `403` `"Apenas o dono do personagem ou o mestre da campanha podem alterar os dados na campanha."` ·
`404` `"Participação não encontrada."` / `"Token não encontrado."` · `409`
`"Só personagens aprovados na campanha podem ter os dados da campanha alterados."`

### Efeitos colaterais

- Log de turno (`024`): `TurnType.CharacterUpdate` com `changes` = `TurnChange.Diff` de `currentLife`,
  `currentEnergy`, `characterStatus`, `notes` (= `Sheet`; **a chave `"notes"` é mantida** por causa do histórico
  em `jsonb`, pesquisa D6) e `posture`, **mais `sheetFile`** (novo). Nada mudou → nenhuma entrada.
- Tempo real: `party.changed` sempre; `mapTokens.changed` (as peças mostram vida/energia/status da participação);
  `turn.changed` quando houve entrada de turno.
- `character.ChangeToken(...)` é gravado no mesmo `IUnitOfWork.ExecuteInTransactionAsync` quando `tokenId` vem.
- **Nunca** escreve em `characters.sheet`, `characters.sheet_file`, `characters.name`, `characters.image`,
  `characters.life`, `characters.energy` ou `characters.move` (FR-010).

---

## 3. `POST /api/document` — upload do arquivo de ficha (inalterado, reutilizado)

`DocumentController.Upload(IFormFile? file)` → `IImageService.UploadDocumentAsync(stream, length, contentType)`
`[RequestSizeLimit(11_000_000)]` · **Permissão**: qualquer usuário autenticado (o vínculo com a entidade é feito
depois, pelo `fileName`).

`multipart/form-data`, campo `file`. Aceita `image/png`, `image/jpeg`, `image/webp`, `application/pdf`; confere
magic bytes (PNG `89 50 4E 47 0D 0A 1A 0A`, JPEG `FF D8 FF`, WebP `RIFF….WEBP`, PDF `%PDF-`); ≤ 10 MB;
grava os bytes **sem conversão**.

**Resposta** `200` `DocumentUploadInfo`: `{ "fileName": "{32-hex}.{ext}", "url": "https://…", "type": "image" | "pdf" }`

Erros `400` (`DomainValidationException` no campo `file`): `"Nenhum arquivo enviado."` ·
`"O arquivo deve ter no máximo 10 MB."` · `"Formato não suportado. Use PNG, JPEG, WebP ou PDF."` ·
`"O conteúdo do arquivo não corresponde ao formato informado."`

> **Reutilização pela campanha**: o endpoint é entidade-agnóstico. O mesmo `fileName` devolvido aqui é gravado em
> `characters.sheet_file` (pelo `PUT /api/character`) **ou** em `campaign_characters.sheet_file` (pelo
> `PUT /api/campaigncharacter/{id}`). Nenhuma mudança neste contrato.

---

## 4. `GET` / `POST` / `PUT /api/character` — personagem (contrato inalterado)

`CharacterController` → `CharacterService`. **Permissão**: `GET`/`PUT`/`DELETE` só o dono (`GetOwnedAsync`, 403
`"Apenas o dono pode acessar este personagem."`); `GET /api/character/search` é público para logados e devolve
`CharacterSearchInfo` (só `characterId`, `name`, `imageUrl`, `ownerId`, `ownerName`) — **nunca** ficha ou arquivo.

`CharacterInfo` (resposta) e `CharacterInsertInfo` (corpo de `POST` e `PUT`) **não ganham nem perdem campo**.
Em `CharacterInsertInfo`, `sheetFile: null` **remove** (convenção 022, mantida) e `tokenId: null` **remove**.

**Mudança de comportamento observável** (não de contrato): `PUT /api/character` **não** altera mais a ficha nem o
arquivo de nenhuma participação — antes da 032 isso já era verdade, e continua; o que muda é que a participação
agora **tem** ficha e arquivo próprios, então a divergência passa a ser visível. O único efeito em participações
permanece sendo `ICampaignCharacterRepository.ClampVitalsAsync(characterId, life, energy)` quando um total desce
(FR-008, US3-AS6).

---

## 5. Superfície inalterada (verificação de regressão)

| Contrato | Estado |
|---|---|
| `POST /api/campaigncharacter/request` · `/invite` · `/{id}/accept` · `/{id}/approve` | corpo e resposta iguais; **comportamento novo**: a participação entra já com cópia de `sheet` e `sheet_file` (FR-003) |
| `POST /api/campaigncharacter/{id}/decline` · `/{id}/deny` · `DELETE /api/campaigncharacter/{id}` | inalterados |
| `GET /api/campaigncharacter/invites` · `/mine` · `GET /api/campaign/{id}/character` | inalterados (listas sem ficha) |
| `POST /api/character/{id}/transfer` | inalterado; as fichas das participações acompanham o personagem (US5-AS5) |
| `GET /api/image` · `POST /api/image` · `GET /api/image/file/{fileName}` | inalterados |
| `MapTokenInfo.sheet` (peças no mapa) | contrato igual; o **valor** passa a ser a ficha da campanha em vez das notas (`MapTokenService.cs:349`) |
| `POST /api/campaign/{id}/turn/process` | inalterado; repassa `participation.Sheet` e agora também preserva `participation.SheetFile` por não chamar `ChangeSheetFile` |
