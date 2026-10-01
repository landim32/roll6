# Phase 1 Data Model: Ficha do personagem por campanha (texto e arquivo)

**Feature**: `032-campaign-sheet-copy` · **Date**: 2026-09-30 · **Plan**: [plan.md](./plan.md) · **Decisões**: [research.md](./research.md)

Nenhuma entidade nova. Uma entidade existente ganha um campo; outra muda apenas o **significado** de um campo que
já tem. Convenções de banco conforme constituição, Princípio V.

---

## 1. `Character` — entidade inalterada

`backend/Roll6.Domain/Models/Character.cs` · tabela `characters`

Nenhum campo, coluna, validação ou método muda. Registrado aqui porque é a **fonte da cópia** (FR-003) e porque
FR-010/FR-022 exigem que nada disto seja alcançável pelo mestre.

| Propriedade | Coluna | Tipo | Regra | Papel em 032 |
|---|---|---|---|---|
| `CharacterId` | `character_id` | `bigint` identity, PK `characters_pkey` | — | identidade |
| `UserId` | `user_id` | `bigint` NOT NULL | FK `fk_user_character`, `ClientSetNull` | dono — única pessoa que escreve aqui |
| `Name` | `name` | `varchar(260)` NOT NULL | `Guard.RequiredText(name, "name", 260)` | não copiável pela campanha |
| `Sheet` | `sheet` | `varchar(20000)` NULL | `Guard.OptionalText(sheet, "sheet", 20000)` | **fonte** da cópia de texto |
| `Life` / `Energy` | `life` / `energy` | `integer` NOT NULL | `Guard.NonNegative(..., "life"/"energy")` | **totais**; fonte de `CurrentLife`/`CurrentEnergy` |
| `Move` | `move` | `integer` NOT NULL | `Guard.NonNegative(move, "move")` | não copiável |
| `Image` | `image` | `varchar(260)` NULL | `Guard.ImageFileName(image, "image")` | não copiável |
| `SheetFile` | `sheet_file` | `varchar(260)` NULL | `Guard.SheetFileName(sheetFile, "sheetFile")` | **fonte** da cópia do arquivo |
| `TokenId` | `token_id` | `bigint` NULL | FK `fk_token_character`, `ClientSetNull` | exceção de FR-010: o mestre o escolhe pela campanha |
| `CreatedAt` / `UpdatedAt` | `created_at` / `updated_at` | `timestamp without time zone` NOT NULL DEFAULT `now()` | — | — |

Métodos: `Update(name, sheet, life, energy, move, image, tokenId, sheetFile = null)` (substituição completa —
`null` em `tokenId`/`sheetFile` **remove**), `AssignTokenIfMissing(tokenId)`, `ChangeToken(tokenId)`.
**Nenhuma assinatura muda.**

> ⚠ Armadilha registrada em `research.md` D7: `Update` grava `TokenId` e `SheetFile` incondicionalmente. O
> Modal A precisa reenviar os dois; o Modal B nunca chama `PUT /api/character`.

---

## 2. `CampaignCharacter` — entidade alterada

`backend/Roll6.Domain/Models/CampaignCharacter.cs` · tabela `campaign_characters`

### 2.1 Campos

| Propriedade | Coluna | Tipo | Regra | Mudança em 032 |
|---|---|---|---|---|
| `CampaignCharacterId` | `campaign_character_id` | `bigint` identity, PK `campaign_characters_pkey` | — | — |
| `CampaignId` | `campaign_id` | `bigint` NOT NULL | FK `fk_campaign_campaign_character`, `ClientSetNull` | — |
| `CharacterId` | `character_id` | `bigint` NOT NULL | FK `fk_character_campaign_character`, `ClientSetNull` | — |
| `Status` | `status` | `integer` NOT NULL | enum `CampaignCharacterStatus` (1 Invited, 2 RequestedAccess, 3 Approved, 4 Denied) | — |
| `CurrentLife` / `CurrentEnergy` | `current_life` / `current_energy` | `integer` NOT NULL | ≤ total; pode ser ≤ 0 | — |
| `CharacterStatus` | `character_status` | `varchar(260)` NULL | `Guard.OptionalText(characterStatus, "characterStatus", 260)` | — |
| **`Sheet`** | `sheet` | `varchar(20000)` NULL | `Guard.OptionalText(sheet, "sheet", 20000)` | **significado**: era "Anotações da Campanha" (023, começava vazio); passa a ser a **ficha da campanha em texto**, cópia da original na entrada. Tipo, coluna e validação idênticos |
| **`SheetFile`** | **`sheet_file`** | **`varchar(260)` NULL** | **`Guard.SheetFileName(sheetFile, "sheetFile")` → `^[0-9a-f]{32}\.(png\|jpg\|webp\|pdf)$`, ≤ 260** | **NOVO** — referência ao arquivo de ficha **da campanha** (D1: mesmo nome de objeto do personagem na entrada; independente depois) |
| `Posture` | `posture` | `integer` NOT NULL DEFAULT 1 | `Guard.ValidPosture(posture, "posture")`; `HasSentinel((Posture)0)` | — |
| `CreatedAt` / `UpdatedAt` | `created_at` / `updated_at` | `timestamp without time zone` NOT NULL DEFAULT `now()` | — | — |

**Configuração Fluent API a acrescentar** em `backend/Roll6.Infra/Context/Roll6Context.cs`, no bloco
`modelBuilder.Entity<CampaignCharacter>` (linhas 194-220), imediatamente após a linha do `Sheet`:

```csharp
entity.Property(e => e.SheetFile).HasColumnName("sheet_file").HasMaxLength(260);
```

Sem índice, sem default, sem FK — exatamente como `characters.sheet_file`, porque é um **nome de arquivo
armazenado**, não uma referência a linha. Índices existentes preservados: unique
`ix_campaign_characters_campaign_character (campaign_id, character_id)`, `IX_campaign_characters_character_id`,
`IX_campaign_characters_campaign_id`.

**Persistência**: `CampaignCharacterRepository.UpdateAsync` faz
`_context.Entry(existing).CurrentValues.SetValues(entity)` — a coluna nova é gravada automaticamente.
**Nenhuma mudança em `ICampaignCharacterRepository` nem em `CampaignCharacterRepository`.**

### 2.2 Comportamento

```csharp
// ALTERADO — único funil de cópia (D2). Chamado por Create (participação nova) e por Join (toda ida a Aprovado).
private void ResetFrom(Character character)
{
    CurrentLife = character.Life;
    CurrentEnergy = character.Energy;
    Sheet = character.Sheet;          // era null (023)
    SheetFile = character.SheetFile;  // novo (032)
    CharacterStatus = null;
    Posture = Posture.Standing;
}

// NOVO — D3. ausente/null = mantém, "" = remove, nome = troca.
public void ChangeSheetFile(string? sheetFile)
{
    if (sheetFile is null)
        return;
    var value = sheetFile.Length == 0 ? null : Guard.SheetFileName(sheetFile, "sheetFile");
    if (value == SheetFile)
        return;
    SheetFile = value;
    UpdatedAt = DateTime.UtcNow;
}

// INALTERADO em assinatura; só o significado de `sheet` muda.
public void UpdatePlay(int currentLife, int currentEnergy, string? characterStatus, string? sheet, int totalLife, int totalEnergy)
```

`UpdatePlay` continua exigindo `Status == Approved` (`ConflictException`) e continua validando
`currentLife ≤ totalLife` / `currentEnergy ≤ totalEnergy` (`DomainValidationException`).
**`ChangeSheetFile` também só pode ser chamado com participação Aprovada** — a guarda fica em
`CampaignCharacterService.UpdateAsync`, que já é o único caminho de escrita (ver §4).

### 2.3 Transições de estado (inalteradas em forma; o conteúdo do reset mudou)

```
                        ┌────────────── ResetFrom copia sheet + sheetFile ──────────────┐
                        │                                                               │
 (não existe) ──RequestAccess(autoApprove=true)──────────────────────────────► Approved │
 (não existe) ──RequestAccess(autoApprove=false)──► RequestedAccess ──ApproveRequest──► │
 (não existe) ──CreateInvite──────────────────────► Invited ──AcceptInvite─────────────► │
                                    RequestedAccess ──Invite(character)──────────────────► │
                                    Denied ──Invite(character)──► Invited ───────────────► │
                                                                                        │
 Invited ──DeclineInvite──► Denied          RequestedAccess ──DenyRequest──► Denied     │
 Approved ──(DELETE /api/campaigncharacter/{id}, mestre)──► linha removida               │
                                                                                        │
 Approved ──UpdatePlay / ChangePosture / ChangeSheetFile──► Approved (mesmo estado)  ◄───┘
```

Todo caminho até `Approved` passa por `Join` → `ResetFrom` → **recópia** (US5-AS3, US5-AS4, FR-003, FR-006).
Nenhuma transição sai de `Approved` para outro estado, então a recópia só acontece de fato na criação e nas
entradas vindo de `Invited`/`RequestedAccess`/`Denied`.

---

## 3. Arquivo de ficha armazenado — entidade implícita, inalterada

Não é uma tabela: é um objeto no bucket S3-compatível, nomeado `{guid:N}.{ext}` sob `{S3:Folder}`
(`S3ImageStorageAppService.UploadAsync`).

| Aspecto | Valor | Por que importa para 032 |
|---|---|---|
| Escrita | write-once, nome sempre novo | garante imutabilidade → D1 |
| Sobrescrita | não existe | um nome nunca passa a apontar para outro conteúdo |
| Apagamento | não existe (`IImageStorageAppService` não tem `DeleteAsync`) | remover a ficha = tirar a referência; o objeto fica órfão (fora de escopo, como na 022) |
| Leitura | `GetUrl(name)` → URL pré-assinada de curta duração | imagens e PDFs exibidos pela URL; expiração já tratada pela UI ao reabrir o card |
| Extensões | `.png`, `.jpg`, `.webp` (imagens) e `.pdf` (só em campo de ficha) | `SheetFiles.TypeOf(name)` → `"image"` \| `"pdf"` \| `null` |
| Leitura por nome via API | `GET /api/image/file/{fileName}` — **só imagens** (`^[0-9a-f]{32}\.(png\|jpg\|webp)$`) | usado apenas pelo canvas do map-share (CORS); **não** é usado por ficha, então rejeitar `.pdf` não afeta 032 |

**Cardinalidade nova**: um objeto pode ser referenciado por `characters.sheet_file` **e** por N
`campaign_characters.sheet_file`. Nenhum campo é dono exclusivo do objeto, e nada depende de exclusividade
(nada apaga objetos).

---

## 4. Regras de validação e permissão → requisitos

Aplicadas em `CampaignCharacterService.UpdateAsync` (o único caminho de escrita da participação) e em
`CharacterService.UpdateAsync`/`GetOwnedAsync` (o único caminho de escrita do personagem).

| # | Regra | Onde | Erro | FR |
|---|---|---|---|---|
| V1 | Só dono **ou** mestre da campanha escreve a participação | `CampaignCharacterService.UpdateAsync` (já existe, inline: `character.UserId != userId && campaign.UserId != userId`) | `UnauthorizedAccessException` → 403 `"Apenas o dono do personagem ou o mestre da campanha podem alterar os dados na campanha."` | FR-009, FR-013 |
| V2 | Só participação `Approved` tem dados de campanha alterados | `CampaignCharacter.UpdatePlay` (já existe) | `ConflictException` → 409 `"Só personagens aprovados na campanha podem ter os dados da campanha alterados."` | FR-009 · ⚠ **hoje `ChangeSheetFile` precisa da mesma guarda**: `UpdateAsync` chama `UpdatePlay` antes, então a ordem já garante; manter a chamada de `ChangeSheetFile` **depois** de `UpdatePlay` |
| V3 | Só o dono escreve o personagem | `CharacterService.GetOwnedAsync` (já existe) | `UnauthorizedAccessException` → 403 `"Apenas o dono pode acessar este personagem."` | FR-010, FR-011 |
| V4 | Nome de arquivo de ficha válido ou vazio | `Guard.SheetFileName` via `ChangeSheetFile` | `DomainValidationException("sheetFile", ...)` → 400 `ValidationProblemDetails` | FR-002 |
| V5 | Texto de ficha ≤ 20.000 | `Guard.OptionalText` via `UpdatePlay` | `DomainValidationException("sheet", ...)` → 400 | FR-001 |
| V6 | Leitura do detalhe: dono, mestre ou participante aprovado | `CampaignCharacterService.GetByIdAsync` (já existe, com `HasApprovedCharacterAsync`) | `UnauthorizedAccessException` → 403 | FR-012 |
| V7 | Busca pública não expõe ficha nem arquivo | `CharacterService.SearchAsync` → `CharacterSearchInfo` (já existe) | — | FR-012 (e Assumption da spec) |
| V8 | Tipo/tamanho/assinatura do arquivo no upload | `ImageService.UploadDocumentAsync` (já existe: PNG/JPEG/WebP/PDF, ≤ 10 MB, magic bytes) | `DomainValidationException("file", ...)` → 400 | FR-002 |
| V9 | Migração não altera a ficha original | backfill só escreve em `campaign_characters` | — | FR-022, SC-010 |
| V10 | Migração preserva as anotações | `left(cópia, 20000 − len(sufixo)) \|\| sufixo`, com `left(..., 20000)` de segurança | — | FR-027, FR-028, FR-030 |

---

## 5. Migração de dados

`AddCampaignSheetFile` — uma única migration, schema + backfill (padrão do repositório).

| Passo | Operação | Requisito |
|---|---|---|
| 1 | `AddColumn<decimal?>(name: "sheet_file", table: "campaign_characters", type: "character varying(260)", maxLength: 260, nullable: true)` — na prática `AddColumn<string>` | FR-002 |
| 2 | `migrationBuilder.Sql(""" ... """)` — CTE `prepared` monta o sufixo de notas e o `UPDATE` grava `sheet` (cópia truncada + notas) e `sheet_file` (cópia da referência). SQL completo em [research.md D5](./research.md#d5) | FR-027, FR-028, FR-029, FR-030, FR-031 |
| 3 | `Down`: `DropColumn("sheet_file", "campaign_characters")`. O `sheet` **não** é revertido (as notas originais deixam de existir como campo separado — perda aceitável e documentada no `Down`) | — |

Artefatos adicionais, ambos obrigatórios pela convenção do repositório:
- `database/migrations/032-campaign-sheet.sql` — saída idempotente de
  `dotnet ef migrations script 20260929215843_AddPostureAndTokenSpaces <timestamp>_AddCampaignSheetFile --idempotent --project Roll6.Infra --startup-project Roll6.API`,
  com cabeçalho no padrão de `031-posture-footprint.sql` (o que muda, como aplicar com `psql`, como regenerar).
- `database/roll6.sql` — regenerado com
  `dotnet ef migrations script --idempotent --project Roll6.Infra --startup-project Roll6.API -o ../database/roll6.sql`
  e o cabeçalho manual recolocado.

**Ordem de aplicação**: após `20260929215843_AddPostureAndTokenSpaces` (031). Não há `028` nem `030` em
`database/migrations/` — os buracos são reais (essas features não mudaram o banco).

---

## 6. Rastreabilidade requisito → modelo

| FR | Elemento do modelo |
|---|---|
| FR-001 | `CampaignCharacter.Sheet` (campo existente, significado novo) + §2.2 `ResetFrom` |
| FR-002 | `CampaignCharacter.SheetFile` + `campaign_characters.sheet_file` + V4/V8 |
| FR-003 | `ResetFrom` (funil único) + §2.3 |
| FR-004, FR-005 | D1 — referências independentes a objetos imutáveis (§3) |
| FR-006 | nenhuma ação de recópia; só `ResetFrom` (§2.3) |
| FR-007 | §3 — write-once, sem conversão |
| FR-008 | `CharacterService.UpdateAsync` não toca participações além de `ClampVitalsAsync`; Modal A só chama `updateCharacter` (D7) |
| FR-009, FR-010 | V1 + V3 + `CampaignCharacterUpdateInfo` sem nenhum campo do personagem (exceto `tokenId`, exceção preservada) |
| FR-011 | `CampaignCharacterUpdateInfo.SheetFile` + V4; `CharacterInsertInfo.SheetFile` inalterado |
| FR-012 | V6 + V7 |
| FR-013 | V1 + V3 aplicadas no serviço, que é o que o MCP chama via REST |
| FR-014…FR-026 | frontend — ver [contracts/ui-contracts.md](./contracts/ui-contracts.md) |
| FR-027…FR-031 | §5 |

---

## 7. Testes de modelo afetados

| Arquivo | Teste | Ajuste |
|---|---|---|
| `Roll6.Tests/Domain/Models/CampaignCharacterTests.cs` | `Creation_StartsFromTheCharacter` (linha ~48) | `Sheet.Should().BeNull(...)` → `.Should().Be(SHEET)`; acrescentar `SheetFile` |
| idem | `JoiningTheCampaign_StartsOverFromTheCharacter` (~139) | idem |
| idem | `InviteAfterDenied_KeepsTheCampaignData` (~151) | `Sheet.Should().Be("Anotações antigas")` → passa a valer a recópia do personagem (a transição `Denied → Invited` **não** chama `ResetFrom`; verificar o comportamento real antes de alterar a asserção) |
| idem | família `UpdatePlay_*` (155-215) | **inalterada** (assinatura preservada, D2) |
| idem | novos `ChangeSheetFile_*` | mantém com `null`, troca com nome válido, remove com `""`, recusa nome inválido com `.Errors.Should().ContainKey("sheetFile")`, não atualiza `UpdatedAt` quando o valor é o mesmo |
| `Roll6.Tests/Domain/Models/CharacterTests.cs` | todos | **inalterados** |
| `Roll6.Tests/Domain/Services/CampaignCharacterServiceTests.cs` | `ApproveRequest_StartsWithEmptyCampaignNotes` (~318) | renomear para `ApproveRequest_CopiesTheCharactersSheet` e inverter a asserção (`p.Sheet == "Força 3"`); `CharacterStatus` continua `null` |
| idem | `GetById_ReturnsTheCharactersSheetFile` (~452), `GetById_WithoutSheetFile_ReturnsNulls` (~467) | passam a ler o arquivo **da participação**; novo caso: personagem com arquivo e participação sem → `null` (FR-025) |
| idem | `Update_OwnerOrMaster_SavesOnlyTheParticipation` (~333) | manter `_characterRepository.Verify(r => r.UpdateAsync(...), Times.Never)` — continua sendo a prova de FR-010 |
| idem | `Update_OnlyTheNotes_RecordsTheNotesByTheOwner` (~520) | renomear; a chave do diff continua `"notes"` (D6) |
| idem | seção nova `// ---- 032: campaign sheet copy ----` | mestre troca o arquivo da campanha; mestre **não** consegue trocar o do personagem; `sheetFile: null` mantém; `sheetFile: ""` remove; participação não aprovada recusa |
| `Roll6.Tests/Domain/Services/TurnServiceTests.cs` | linhas 487, 556 | conferem `participation.Sheet`; revisar se assumem notas vazias |
| `Roll6.Tests/Domain/Services/MapTokenServiceTests.cs` | linhas 351, 366 | idem (o `Sheet` da peça vem da participação) |
| `Roll6.Tests/Domain/Turns/TurnSummaryTests.cs` | linhas 63, 66 | `"Anotações alteradas"` → `"Ficha da campanha alterada"`; novo caso para `"sheetFile"` |
| `Roll6.Tests/Mcp/McpCoverageTests.cs` | contagens 86/87 | **devem permanecer** — nenhum endpoint novo (D3) |
| `Roll6.Tests/Mcp/McpDescriptionTests.cs` | descrições | `sheetFile` em `update_participation` precisa de `[Description]` ≥ 20 chars |
| `Roll6.Tests/Mcp/McpRouteParityTests.cs` | paridade | novo parâmetro **precisa ter default** (`= null`) para não receber o literal `"sample"` |
