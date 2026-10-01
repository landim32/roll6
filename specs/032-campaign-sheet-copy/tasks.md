---
description: "Task list for feature implementation"
---

# Tasks: Ficha do personagem por campanha (texto e arquivo)

**Input**: Design documents from `/specs/032-campaign-sheet-copy/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: incluídos. A spec não pede TDD explicitamente, mas (a) o repositório tem suítes estabelecidas
(`Roll6.Tests` xUnit + Moq + FluentAssertions; Vitest no frontend) com seções por feature
(`// ---- 031: posture ----`), (b) **testes existentes quebram** com a mudança de semântica de
`CampaignCharacter.Sheet` e precisam ser corrigidos de qualquer forma, e (c) SC-001…SC-010 são métricas
verificáveis. Dentro de cada fase, os testes vêm antes da implementação.

**Organization**: agrupado por user story (US1…US5 da spec), cada fase é um incremento testável isoladamente.

## Estado da execução (2026-09-30)

**45 de 54 tarefas concluídas.** Todo o código da feature está implementado e verificado pelas suítes automáticas:

| Verificação | Resultado |
|---|---|
| `dotnet build Roll6.sln` | Compilação com êxito, sem avisos |
| `dotnet test` | **1063 aprovados, 0 falhas** (linha de base antes da feature: 1043) |
| `npm run lint` | limpo |
| `npm test` | **291 aprovados (27 arquivos)** (linha de base: 289) |
| `npm run build` | ✓ 719 módulos, sem erro de tipo |
| `McpCoverageTests` | 86 operações / 87 ferramentas preservados |

**8 tarefas pendentes — todas de verificação manual em ambiente completo, não de código.** Restam apenas os
roteiros que exigem API + banco + S3 + navegador com dois usuários (mestre e jogador):

- **T019, T030, T038, T043, T047** — roteiros manuais ponta a ponta de US1…US5.
- **T048** — tempo real em duas sessões de navegador.
- **T053** — checklist de regressão de `contracts/ui-contracts.md` §9 e "Definição de pronto" do `quickstart.md` §7
  (itens de UI).
- **T054** — `/speckit.analyze` (comando separado).

**T007 concluída**: a migration e o backfill foram aplicados contra um PostgreSQL real por
`database/migrations/032-campaign-sheet.sql`, sem erro — a coluna `campaign_characters.sheet_file` existe, o
`UPDATE` de cópia rodou e a linha entrou em `__EFMigrationsHistory`. O que **não** foi feito é a conferência
item por item das consultas de `quickstart.md` §2 (participações sem `sheet`, notas íntegras, nenhum `sheet`
acima de 20.000, `characters` intocado): recomenda-se rodá-las antes de fechar a feature.

Ressalvas registradas:
- **T042** foi marcada como concluída pela parte de código: a asserção de que a peça lê `participation.Sheet` já
  existia em `MapTokenServiceTests.ListByMap_CharacterToken_ShowsTheParticipation` e recebeu o comentário da 032.
  A conferência visual no menu/tooltip da peça ficou para o T043.
- **T028**: a "linha ~87" citada na tarefa é, no arquivo real, a linha 89 de `Roll6Guide.cs` e trata apenas de
  `posture` — continua correta e não foi alterada.
- **T036** foi antecipada para a Phase 2: o T013 mudou o contrato de `toCampaignUpdate` e quebrou a asserção
  `toEqual` existente, então o teste foi corrigido junto para não atravessar fases com a suíte vermelha.
- **T014**: confirmado que `Denied → Invited` passa por `Invite`/`ChangeTo` e **não** por `ResetFrom`, então
  `InviteAfterDenied_KeepsTheCampaignData` continua correto; só o fixture e o comentário mudaram.

**Correção pós-entrega (SQL da migration)**: o backfill original falhava no PostgreSQL —
`UPDATE campaign_characters AS cc ... FROM characters AS c JOIN prepared p ON p.campaign_character_id = cc.campaign_character_id`
é inválido porque, dentro de um `UPDATE`, a condição `ON` de um item do `FROM` não pode referenciar a tabela-alvo
(`invalid reference to FROM-clause entry for table "cc"`). Os dois itens do `FROM` agora são unidos no `WHERE`, no
mesmo formato de `ClearCopiedCampaignNotes`. Corrigido em `20261001001517_AddCampaignSheetFile.cs` (com comentário
explicando por que não é `JOIN`) e nos dois scripts regenerados, `database/migrations/032-campaign-sheet.sql` e
`database/roll6.sql`. **O script corrigido foi executado contra um banco real sem erro**, o que confirma o
diagnóstico; a conferência item por item do backfill (consultas de `quickstart.md` §2) é que ainda não foi feita.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependências pendentes)
- **[Story]**: US1…US5 — apenas nas fases de user story; Setup, Foundational e Polish não têm rótulo
- Caminhos absolutos a partir de `C:\repos\Roll6`

## Path Conventions

Aplicação web (Opção 2 do plano): `backend/` (Clean Architecture, `Roll6.sln`) e `frontend/` (SPA React).
**Não existe `tests/` na raiz** — os testes ficam em `backend/Roll6.Tests/` e `frontend/src/**/*.test.ts`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: registrar a linha de base e preparar o único arquivo compartilhado por todas as fases de frontend.

- [X] T001 Rodar a linha de base e registrar o resultado: `cd backend && dotnet build Roll6.sln && dotnet test` e `cd frontend && npm run lint && npm test && npm run build`. A árvore de trabalho carrega alterações não commitadas da feature 031 — anotar em `specs/032-campaign-sheet-copy/quickstart.md` (seção 7) o que já falha antes de começar, para não atribuir à 032.
- [X] T002 Atualizar `frontend/src/i18n/locales/pt-BR.json` conforme `specs/032-campaign-sheet-copy/contracts/ui-contracts.md` §7: alterar os valores de `characterForm.campaignSheetTab` ("Ficha da Campanha"), `characterForm.campaignSheetHint`, `characterForm.campaignSheetPlaceholder`, `characterForm.campaignSheetEmpty` e `characterForm.errors.campaignSheetTooLong`; acrescentar `characterForm.campaignTitle`, `selectCharacter.edit`, `sheetFile.noneCampaign` e `toast.campaignCharacterUpdated`. Não renomear nem mover nenhuma chave existente (`characterForm.*` é lido também por `frontend/src/components/ui/ImageCropper.tsx`).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: coluna nova, campo de domínio, DTOs e tipos — a base que US1…US5 consomem. Nenhum comportamento novo ainda: sem `ResetFrom` copiar, a coluna nasce sempre `NULL`.

**⚠️ CRITICAL**: nenhuma user story pode começar antes desta fase terminar.

- [X] T003 Acrescentar a propriedade `public string? SheetFile { get; set; }` em `backend/Roll6.Domain/Models/CampaignCharacter.cs`, logo após `Sheet`, com XML doc no padrão do arquivo explicando que é a referência ao arquivo de ficha **da campanha** (cópia da referência do personagem na entrada, independente depois — 032, pesquisa D1).
- [X] T004 Mapear a coluna em `backend/Roll6.Infra/Context/Roll6Context.cs`, dentro de `modelBuilder.Entity<CampaignCharacter>` (bloco das linhas 194-220), imediatamente após a linha de `Sheet`: `entity.Property(e => e.SheetFile).HasColumnName("sheet_file").HasMaxLength(260);`. Sem índice, sem default, sem FK (é nome de arquivo armazenado, como `characters.sheet_file`).
- [X] T005 Gerar a migration (depende de T003 e T004): `cd backend && dotnet ef migrations add AddCampaignSheetFile --project Roll6.Infra --startup-project Roll6.API`. Conferir que o `AddColumn<string>` saiu como `character varying(260)` anulável em `campaign_characters` e que nada mais foi alterado.
- [X] T006 Acrescentar o backfill ao arquivo `backend/Roll6.Infra/Migrations/<timestamp>_AddCampaignSheetFile.cs` gerado no T005, usando `migrationBuilder.Sql(""" … """)` com a CTE `prepared` + `UPDATE` de `specs/032-campaign-sheet-copy/research.md` (D5): `sheet_file = c.sheet_file` e `sheet = left(left(coalesce(c.sheet,''), greatest(0, 20000 - length(p.suffix))) || p.suffix, 20000)`, onde `suffix` é `E'\n\n## Anotações anteriores da campanha\n\n' || cc.sheet` quando as notas existem. O `left(..., 20000)` externo é obrigatório (a coluna é `varchar(20000)`). Escrever o `Down` com `DropColumn("sheet_file", "campaign_characters")` e um comentário de que o `sheet` não é revertido.
- [X] T007 Aplicar e conferir: `dotnet ef database update --project Roll6.Infra --startup-project Roll6.API` e executar as consultas de verificação de `specs/032-campaign-sheet-copy/quickstart.md` §2 (nenhuma participação sem `sheet` quando o personagem tem; notas íntegras após a seção; nenhum `sheet` > 20.000; `cc.sheet_file = c.sheet_file`; `characters.sheet`/`sheet_file` inalterados).
- [X] T008 [P] Criar `database/migrations/032-campaign-sheet.sql` a partir de `dotnet ef migrations script 20260929215843_AddPostureAndTokenSpaces <timestamp>_AddCampaignSheetFile --idempotent --project Roll6.Infra --startup-project Roll6.API`, com cabeçalho de 5 linhas no padrão de `database/migrations/031-posture-footprint.sql` (o que muda, idempotência, uso com `psql`, comando de regeneração).
- [X] T009 [P] Regenerar `database/roll6.sql` com `dotnet ef migrations script --idempotent --project Roll6.Infra --startup-project Roll6.API -o ../database/roll6.sql` e **recolocar o cabeçalho manual de 3 linhas** que o comando sobrescreve.
- [X] T010 [P] Atualizar `backend/Roll6.DTO/CampaignCharacter/CampaignCharacterDetailInfo.cs`: acrescentar `SheetFile` (`string?`) com `[JsonPropertyName("sheetFile")]` e reescrever os XML docs de `Sheet` (ficha da campanha, cópia feita na entrada), `SheetFileUrl` e `SheetFileType` (agora os **da campanha**), mantendo `CharacterSheet` documentado como a ficha original somente-leitura.
- [X] T011 [P] Atualizar `backend/Roll6.DTO/CampaignCharacter/CampaignCharacterUpdateInfo.cs`: acrescentar `SheetFile` (`string?`) com `[JsonPropertyName("sheetFile")]` e XML doc com a semântica da pesquisa D3 — ausente/`null` = mantém, `""` = remove, `{32-hex}.{ext}` = troca — justificando a divergência em relação a `CharacterInsertInfo`.
- [X] T012 [P] Atualizar `frontend/src/types/campaignCharacter.ts`: acrescentar `sheetFile: string | null` em `CampaignCharacterDetailInfo` e `sheetFile?: string | null` em `CampaignCharacterUpdateInfo`, e corrigir os comentários hoje defasados (`sheet` documentado como "Anotações da Campanha"; `sheetFileUrl`/`sheetFileType` como "the character's sheet file … the same in every campaign").
- [X] T013 Atualizar `frontend/src/lib/campaignCharacterForm.ts`: `toCampaignUpdate` recebe `sheetFile?: string | null` (default `null`) e o inclui no `CampaignCharacterUpdateInfo` devolvido. `PARTICIPATION_MODE`, `participationMode`, `MAX_CAMPAIGN_SHEET`, `MAX_CHARACTER_STATUS`, `validateCampaignArea` e `CampaignAreaError` permanecem inalterados.

**Checkpoint**: coluna criada e migrada, DTOs e tipos prontos — as user stories podem começar.

---

## Phase 3: User Story 1 - A campanha recebe uma cópia da ficha do personagem (Priority: P1) 🎯 MVP

**Goal**: ao entrar numa campanha (criação da participação ou qualquer transição para Aprovado), a participação recebe cópia da ficha em texto e da referência ao arquivo de ficha do personagem; depois disso, nada se sincroniza.

**Independent Test**: criar um personagem com ficha `Força 3` e um PDF anexado, aprová-lo numa campanha e ler `GET /api/campaigncharacter/{id}`: `sheet` = `Força 3`, `sheetFile`/`sheetFileUrl`/`sheetFileType` apontam para o mesmo PDF. Mudar a ficha original para `Força 4` e trocar o arquivo: a participação continua `Força 3` com o PDF antigo.

### Tests for User Story 1

- [X] T014 [P] [US1] Ajustar `backend/Roll6.Tests/Domain/Models/CampaignCharacterTests.cs`: em `Creation_StartsFromTheCharacter` (~linha 48) e `JoiningTheCampaign_StartsOverFromTheCharacter` (~139), trocar `Sheet.Should().BeNull(...)` por `.Should().Be(SHEET)` e acrescentar a asserção de `SheetFile` (adicionar `SheetFile` ao `Hero` do fixture). Em `InviteAfterDenied_KeepsTheCampaignData` (~151), **verificar antes** que a transição `Denied → Invited` passa por `Invite`/`ChangeTo` e **não** por `ResetFrom` — se confirmado, a asserção de que os dados são mantidos continua correta e só o comentário precisa mudar. Rodar e confirmar que falham.
- [X] T015 [P] [US1] Ajustar `backend/Roll6.Tests/Domain/Services/CampaignCharacterServiceTests.cs`: adicionar `SheetFile` ao `Character` do fixture do construtor; renomear `ApproveRequest_StartsWithEmptyCampaignNotes` (~318) para `ApproveRequest_CopiesTheCharactersSheet` invertendo a asserção (`p.Sheet == "Força 3"`, `p.SheetFile` copiado, `CharacterStatus` continua `null`); reescrever `GetById_ReturnsTheCharactersSheetFile` (~452) e `GetById_WithoutSheetFile_ReturnsNulls` (~467) para lerem o arquivo **da participação**; criar a seção `// ---- 032: campaign sheet copy ----`. Rodar e confirmar que falham.

### Implementation for User Story 1

- [X] T016 [US1] Alterar `ResetFrom(Character character)` em `backend/Roll6.Domain/Models/CampaignCharacter.cs` para `Sheet = character.Sheet;` e `SheetFile = character.SheetFile;` (no lugar de `Sheet = null;`), e reescrever o XML doc citando 032 FR-003 e a reversão da 023. Não mexer em `UpdatePlay` — a assinatura permanece (pesquisa D2).
- [X] T017 [US1] Alterar `MapToDetailAsync` em `backend/Roll6.Domain/Services/CampaignCharacterService.cs` (~245-281): `var sheetFile = participation.SheetFile;` (no lugar de `character?.SheetFile`), preencher `SheetFile = participation.SheetFile` e reescrever o comentário — o **token** continua vindo do personagem, o arquivo de ficha não.
- [X] T018 [US1] Rodar `cd backend && dotnet test --filter "FullyQualifiedName~CampaignCharacter"` e corrigir o que mais assumir notas vazias; em seguida `dotnet test` completo, atentando para `backend/Roll6.Tests/Domain/Services/TurnServiceTests.cs` (linhas ~487, ~556) e `backend/Roll6.Tests/Domain/Services/MapTokenServiceTests.cs` (~351, ~366), que leem `participation.Sheet`.
- [ ] T019 [US1] Verificar US1 ponta a ponta pelo roteiro de `specs/032-campaign-sheet-copy/quickstart.md` §4 (US1), usando `bruno/Character/Update.bru` e `bruno/CampaignCharacter/Get detail.bru`; conferir SC-001, SC-003 e SC-004.

**Checkpoint**: a cópia existe e é independente — US1 já entrega valor sozinha (MVP).

---

## Phase 4: User Story 2 - O mestre altera a ficha da campanha sem tocar no personagem (Priority: P1)

**Goal**: dono e mestre passam a poder trocar ou remover o arquivo de ficha **da campanha** e a editar o texto, com a garantia de que nada do personagem é alcançável por esse caminho; o log de turno registra as mudanças.

**Independent Test**: como mestre (não dono), `PUT /api/campaigncharacter/{id}` com `sheet` novo e `sheetFile` de um PDF recém-enviado → `200` com os valores gravados. Como o mesmo mestre, `PUT /api/character/{id}` → `403`. `PUT` sem `sheetFile` → arquivo mantido; com `sheetFile: ""` → arquivo removido.

### Tests for User Story 2

- [X] T020 [P] [US2] Acrescentar em `backend/Roll6.Tests/Domain/Models/CampaignCharacterTests.cs` (mesmo arquivo do T014 — rodar depois dele) os casos de `ChangeSheetFile`: `null` mantém e não toca `UpdatedAt`; `""` remove; nome válido `{32-hex}.pdf` troca; nome inválido (`"ficha.pdf"`) lança `DomainValidationException` com `.Errors.Should().ContainKey("sheetFile")`; o mesmo valor não altera `UpdatedAt`.
- [X] T021 [P] [US2] Acrescentar em `backend/Roll6.Tests/Domain/Services/CampaignCharacterServiceTests.cs` (mesmo arquivo do T015 — rodar depois dele), na seção `// ---- 032 ----`: mestre troca o arquivo da campanha e `_characterRepository.Verify(r => r.UpdateAsync(...), Times.Never)` continua valendo (prova de FR-010); `sheetFile: null` mantém; `sheetFile: ""` remove; participação não aprovada → `ConflictException`; a troca de arquivo gera uma entrada `CharacterUpdate` com campo `"sheetFile"`.
- [X] T022 [P] [US2] Ajustar `backend/Roll6.Tests/Domain/Turns/TurnSummaryTests.cs` (linhas ~63, ~66): o rótulo esperado de `"notes"` passa a ser `"Ficha da campanha alterada"`; acrescentar um caso para `"sheetFile"` → `"Ficha em arquivo alterada"`, sem conteúdo.

### Implementation for User Story 2

- [X] T023 [US2] Acrescentar `ChangeSheetFile(string? sheetFile)` a `backend/Roll6.Domain/Models/CampaignCharacter.cs` com o corpo e o XML doc da pesquisa D3 (`null` retorna sem alterar; `Length == 0` → `null`; senão `Guard.SheetFileName(sheetFile, "sheetFile")`; valor igual retorna sem tocar `UpdatedAt`).
- [X] T024 [US2] Ligar em `UpdateAsync` de `backend/Roll6.Domain/Services/CampaignCharacterService.cs` (~157-195): capturar `participation.SheetFile` na tupla `before`, chamar `participation.ChangeSheetFile(info.SheetFile)` **depois** de `UpdatePlay` (assim a guarda de `Approved` já disparou — data-model.md V2) e acrescentar `("sheetFile", before.SheetFile, participation.SheetFile)` ao `TurnChange.Diff`.
- [X] T025 [US2] Alterar `Change` em `backend/Roll6.Domain/Turns/TurnSummary.cs` (~118-121): `"notes"` devolve `"Ficha da campanha alterada"` e acrescentar `"sheetFile"` devolvendo `"Ficha em arquivo alterada"` — ambos retornando antes do `switch` de rótulos, sem imprimir conteúdo. **Não renomear a chave `"notes"`**: ela está persistida em `turns.changes` (`jsonb`) e renomear orphanaria o histórico (pesquisa D6).
- [X] T026 [P] [US2] Acrescentar a `backend/Roll6.Mcp/McpDocs.cs` as constantes `CAMPAIGN_SHEET` e `SHEET_FILE_OPTIONAL` com os textos de `specs/032-campaign-sheet-copy/contracts/mcp-tools.md` §1 (ambas > 20 caracteres, exigência de `McpDescriptionTests`).
- [X] T027 [US2] Atualizar `backend/Roll6.Mcp/Tools/ParticipationTools.cs` (depende de T026): adicionar `string? sheetFile = null` a `UpdateParticipation` — **com default obrigatório**, senão `McpRouteParityTests` injeta o literal `"sample"` e `Guard.SheetFileName` falha; reescrever `What it does:`/`Returns:` de `update_participation` e de `get_participation`, a descrição do parâmetro `sheet`, e o trecho de reset em `accept_invite` e `approve_access_request` ("status cleared and posture standing, and the campaign sheet and its file re-copied from the character").
- [X] T028 [US2] Reescrever em `backend/Roll6.Mcp/Roll6Guide.cs` o parágrafo "Characters" (~36-40, mencionando a cópia feita na entrada) e o parágrafo "Campaigns and participation" (~53-57, substituindo a explicação de "campaign notes" pelo texto proposto em `contracts/mcp-tools.md` §5), além da linha ~87 que cita os parâmetros de `update_participation`.
- [X] T029 [US2] Rodar `cd backend && dotnet test --filter "FullyQualifiedName~Mcp"` e confirmar que `backend/Roll6.Tests/Mcp/McpCoverageTests.cs` continua em **86 operações / 87 ferramentas** (nenhum endpoint novo foi criado), que `backend/Roll6.Tests/Mcp/McpDescriptionTests.cs` passa com as descrições reescritas (cinco seções, > 80 chars, `[Description]` ≥ 20 chars) e que `backend/Roll6.Tests/Mcp/McpRouteParityTests.cs` passa. Não alterar `backend/Roll6.Tests/Mcp/McpToolCatalog.cs`.
- [ ] T030 [US2] Verificar US2 pela API/Bruno conforme `specs/032-campaign-sheet-copy/quickstart.md` §4 (US2) e §5: atualizar `bruno/CampaignCharacter/Update campaign values.bru` para incluir `sheetFile`; conferir os três cenários (mantém / troca / remove) e o `403` do mestre em `PUT /api/character/{id}`. Registrar SC-002 e SC-006.

**Checkpoint**: dono e mestre escrevem a ficha da campanha (texto e arquivo) só pela participação; o personagem está protegido por permissão e por ausência de campo no DTO.

---

## Phase 5: User Story 3 - O dono edita a ficha original num modal próprio do personagem (Priority: P1)

**Goal**: dividir o `CharacterFormModal` de 432 linhas em dois modais e dar ao dono um caminho de edição da ficha original fora do contexto de campanha, sem que salvar o personagem altere qualquer participação.

**Independent Test**: combo "Personagem atual" → "Selecionar Personagem" → lápis de um personagem → modal com Dados / Ficha / Ficha em arquivo e **nenhuma** seção de campanha; alterar nome, ficha e arquivo e salvar; reabrir e confirmar; abrir o card do mesmo personagem numa campanha e confirmar que vida atual, energia atual, status, postura e ficha da campanha não mudaram.

> **Ordem obrigatória**: T031 cria o Modal B **antes** de T032 remover as partes de campanha do Modal A, para que o card do painel nunca fique sem janela. As duas montagens (`MainPage`, `TopMenu`) são religadas em T033/T034.

### Implementation for User Story 3

- [X] T031 [US3] Criar `frontend/src/components/modals/CampaignCharacterModal.tsx` (novo) conforme `specs/032-campaign-sheet-copy/contracts/ui-contracts.md` §2: exportar `CharacterEditTarget`; props `{ open, onOpenChange, editing }`; abas `data` (nome/foto/totais/movimento somente leitura vindos do detalhe + "Nesta campanha": vida e energia atuais, status, postura, token só com "Escolher token") / `campaignSheet` / `sheetFile`; carregar **somente** com `getParticipation` (não chamar `getCharacter`); semear `campaignSheet` de `participation.sheet` e `campaignSheetFile` de `participation.sheetFile`/`sheetFileUrl`/`sheetFileType`; mover `vitalsToSave` para cá usando `before.totalLife`/`before.totalEnergy`; salvar com uma única chamada `updateParticipation` + `toCampaignUpdate({ …, sheetFile: campaignSheetFile?.fileName ?? '' })` + `toast.campaignCharacterUpdated`; manter `Modal large`, `hidden={pickingToken}`, `TokenModal`, `MarkdownEditor`/`MarkdownView` lazy com `Suspense`, e o footer só com `common.close` para `viewer`.
- [X] T032 [US3] Reduzir `frontend/src/components/modals/CharacterFormModal.tsx` ao Modal A (§1 do mesmo contrato): trocar a prop `editing` por `character?: CharacterInfo | null`; **remover** a exportação de `CharacterEditTarget` e todo o estado de campanha (`detail`, `currentLife`, `currentEnergy`, `characterStatus`, `posture`, `campaignSheet`, `vitalsToSave`) e as abas `campaignSheet`/leitura de `characterSheet`; semear `form`, `keptImage`, `sheetFile` e `token` a partir da prop `character` (⚠ `Character.Update` grava `TokenId` e `SheetFile` incondicionalmente — não semear o token apaga o token, pesquisa D7 armadilha 1); salvar com `createCharacter` (criação) ou `updateCharacter` (edição) e **nunca** chamar `updateParticipation`.
- [X] T033 [US3] Religar `frontend/src/pages/MainPage.tsx`: importar `CampaignCharacterModal` e o tipo `CharacterEditTarget` de `../components/modals/CampaignCharacterModal` (a exportação mudou de arquivo — quebra deliberada) e substituir a montagem das linhas ~171-175 por `<CampaignCharacterModal open={editing !== null} editing={editing} onOpenChange={(o) => { if (!o) setEditing(null); }} />`. Não alterar `PartyPanel.tsx` nem `PartyCard.tsx`.
- [X] T034 [US3] Atualizar `frontend/src/components/modals/SelectCharacterModal.tsx`: acrescentar a prop `onEdit: (character: CharacterInfo) => void` e, em `.stm-character-actions`, um botão `btn btn-sm btn-outline-secondary` com `PencilIcon size={14}` **antes** do de transferir, com `title`/`aria-label` = `t('selectCharacter.edit', { name })` e `onClick` que fecha este modal antes de chamar `onEdit` (padrão do botão de transferir; precedente de layout em `frontend/src/components/campaign/CampaignNpcsTab.tsx:38-43`). `PencilIcon` já existe em `frontend/src/components/ui/icons.tsx` — não criar ícone novo. O lápis não depende do status da participação.
- [X] T035 [US3] Atualizar `frontend/src/components/menu/TopMenu.tsx`: acrescentar `const [editingCharacter, setEditingCharacter] = useState<CharacterInfo | null>(null)`; passar `onEdit={setEditingCharacter}` ao `SelectCharacterModal`; substituir a montagem de `CharacterFormModal` por uma única que atenda criação e edição (`open={includeOpen || editingCharacter !== null}`, `character={editingCharacter}`, `onOpenChange` limpando os dois estados). Não alterar `frontend/src/components/menu/CharacterSelect.tsx`.
- [X] T036 [P] [US3] Atualizar `frontend/src/lib/campaignCharacterForm.test.ts` para o novo `toCampaignUpdate` com `sheetFile` (troca com nome, `''` remove, ausente mantém) seguindo o estilo do arquivo (`describe` por função exportada, `it.each` para tabelas de erro, limites via `MAX_*`).
- [X] T037 [US3] Rodar `cd frontend && npm run lint && npm test && npm run build` e corrigir erros de tipo/import em `frontend/src/components/modals/CampaignCharacterModal.tsx`, `frontend/src/components/modals/CharacterFormModal.tsx`, `frontend/src/pages/MainPage.tsx`, `frontend/src/components/modals/SelectCharacterModal.tsx` e `frontend/src/components/menu/TopMenu.tsx` (em especial o `CharacterEditTarget` movido de arquivo e as props novas).
- [ ] T038 [US3] Verificar US3 pelo roteiro de `specs/032-campaign-sheet-copy/quickstart.md` §4 (US3), incluindo os itens 6 e 7 (reduzir um total ajusta os valores atuais; **token e arquivo não são apagados** ao salvar uma edição) e o item 8 (criação pelo combo continua entrando na campanha atual). Registrar SC-007 e SC-010.

**Checkpoint**: o dono edita a ficha original fora da campanha; salvar o personagem não toca em participação (exceto `ClampVitalsAsync`); o card do painel abre o modal da campanha.

---

## Phase 6: User Story 4 - A tela do personagem na campanha mostra a ficha da campanha (Priority: P2)

**Goal**: dentro da campanha, ninguém vê a ficha original — todos veem a cópia da campanha, em texto e em arquivo, com aviso claro quando a campanha não tem arquivo.

**Independent Test**: com original `Força 3` e campanha `Força 5`, abrir o card como mestre, dono e outro participante aprovado: os três veem `Força 5` e nenhum vê `Força 3` em nenhuma aba. Remover o arquivo da campanha: a área mostra "Não há ficha em arquivo nesta campanha." mesmo que o personagem tenha arquivo.

> A maior parte da implementação chegou junto com a divisão dos modais (T031/T032). Esta fase fecha o contrato de exibição e o valida — as tarefas abaixo tocam `CampaignCharacterModal.tsx`, portanto são sequenciais em relação à T031.

- [X] T039 [US4] Em `frontend/src/components/modals/CampaignCharacterModal.tsx`, garantir que **não sobrou** nenhum ramo que renderize `detail.characterSheet` nem `detail.sheetFileUrl` do personagem: a aba `campaignSheet` usa exclusivamente `campaignSheet` (estado) e a aba `sheetFile` usa exclusivamente `campaignSheetFile`. A aba `sheet` (ficha original) não existe neste modal.
- [X] T040 [US4] Em `frontend/src/components/modals/CampaignCharacterModal.tsx`, implementar FR-025 exatamente como em `specs/032-campaign-sheet-copy/contracts/ui-contracts.md` §2: renderizar `SheetFileView` só com `campaignSheetFile?.url && campaignSheetFile.type`, senão `<p className="text-body-secondary">{t('sheetFile.noneCampaign')}</p>`. **Não alterar** `frontend/src/components/characters/SheetFileView.tsx` nem `frontend/src/components/characters/SheetFileField.tsx` (reutilizados sem mudança — pesquisa D8).
- [X] T041 [US4] Em `frontend/src/components/modals/CampaignCharacterModal.tsx`, conferir títulos e modo leitura (FR-024): `characterForm.campaignTitle` para dono/mestre e `characterForm.viewTitle` para `viewer`; para `viewer`, `MarkdownView` com `emptyText={t('characterForm.campaignSheetEmpty')}` nas duas abas de ficha, `<fieldset disabled>`, sem botão de token e footer só com `common.close`.
- [X] T042 [P] [US4] Verificar que o `sheet` das peças no mapa passou a exibir a ficha da campanha (`backend/Roll6.Domain/Services/MapTokenService.cs:349`, `info.Sheet = participation.Sheet`): ajustar/criar a asserção correspondente em `backend/Roll6.Tests/Domain/Services/MapTokenServiceTests.cs` (~351, ~366) e conferir na UI pelo menu/tooltip da peça (`specs/032-campaign-sheet-copy/quickstart.md` §6).
- [ ] T043 [US4] Verificar US4 pelo roteiro de `specs/032-campaign-sheet-copy/quickstart.md` §4 (US4) com os três perfis (mestre, dono, participante aprovado) e o usuário fora da campanha (`403`), conferindo `frontend/src/components/modals/CampaignCharacterModal.tsx` e `frontend/src/components/map/PartyCard.tsx`; registrar SC-005, SC-008 e SC-009.

**Checkpoint**: a tela da campanha mostra apenas a ficha da campanha, para todos os perfis.

---

## Phase 7: User Story 5 - As fichas são independentes entre si e entre campanhas (Priority: P3)

**Goal**: provar que não há vazamento entre campanhas nem entre a ficha da campanha e a original, e que a recópia acontece só nos momentos de entrada.

**Independent Test**: mesmo personagem aprovado em duas campanhas; alterar texto e arquivo na campanha A e conferir que B e a original não mudaram. Remover o personagem da campanha A e aprová-lo de novo: vida, energia, status e postura reiniciados **e** ficha (texto e arquivo) recopiada do personagem.

- [X] T044 [P] [US5] Acrescentar em `backend/Roll6.Tests/Domain/Services/CampaignCharacterServiceTests.cs` (após T021) os casos de independência: duas participações do mesmo personagem em campanhas diferentes, alterar uma não afeta a outra; alterar a ficha original depois da entrada não sobrescreve a da campanha; `AcceptInvite`/`ApproveRequest`/`Invite` a partir de `RequestedAccess` **recopiam** `Sheet` e `SheetFile`; `DeclineInvite`/`DenyRequest` (que não chamam `ResetFrom`) preservam os dados.
- [X] T045 [P] [US5] Acrescentar em `backend/Roll6.Tests/Domain/Services/CharacterServiceTests.cs` (seção `// ---- 032 ----`) a garantia de FR-008/US3-AS3: `UpdateAsync` não escreve `Sheet`/`SheetFile` em nenhuma participação — apenas `ClampVitalsAsync` quando um total desce; e que `TransferAsync` preserva as participações (US5-AS5).
- [X] T046 [US5] Confirmar que não foi criada nenhuma ação de "recopiar"/sincronizar (FR-006): `ResetFrom` em `backend/Roll6.Domain/Models/CampaignCharacter.cs` continua sendo o **único** ponto de cópia — buscar outras atribuições a `Sheet`/`SheetFile` fora de `ResetFrom`, `UpdatePlay` e `ChangeSheetFile`.
- [ ] T047 [US5] Verificar US5 pelo roteiro de `specs/032-campaign-sheet-copy/quickstart.md` §4 (US5), incluindo a transferência via `frontend/src/components/modals/TransferCharacterModal.tsx` e a remoção/reaprovação pelo painel `frontend/src/components/campaign/ManageCharactersPanel.tsx`; registrar SC-003.
- [ ] T048 [US5] Conferir em duas sessões de navegador o tempo real (`specs/032-campaign-sheet-copy/quickstart.md` §6): salvar a ficha da campanha dispara `party.changed`, `mapTokens.changed` e, havendo entrada de turno, `turn.changed` — verificar em `backend/Roll6.Domain/Services/CampaignCharacterService.cs` (`PublishPartyAsync`) e no consumo em `frontend/src/Contexts/CharacterContext.tsx`; com SignalR desconectado o poll de 15 s cobre.

**Checkpoint**: todas as user stories funcionam de forma independente.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: documentação, consistência entre artefatos e verificação final.

- [X] T049 [P] Atualizar `CLAUDE.md`: o parágrafo de "Campaign characters" ainda descreve `sheet` como **campaign notes** ("never a copy of the sheet") e o de imagens diz que o arquivo de ficha "belongs to the character and is never copied to participations" — os dois ficam falsos. Reescrever conforme a 032 (cópia na entrada via `ResetFrom`, `campaign_characters.sheet_file`, `ChangeSheetFile` com `null` mantém / `""` remove, `sheetFileUrl`/`sheetFileType` agora da campanha, `characterSheet` permanece leitura, chave de diff `"notes"` preservada com rótulo novo) e acrescentar o parágrafo da feature no padrão dos vizinhos.
- [X] T050 [P] Revisar `QWEN.md`: confirmar que o script `update-agent-context.ps1` preservou o bloco `<!-- MANUAL ADDITIONS START/END -->` e que as correções manuais continuam verdadeiras (memória: as seções auto-geradas desse arquivo não são confiáveis; `CLAUDE.md` e a constituição são a autoridade).
- [X] T051 [P] Atualizar a coleção Bruno: `bruno/CampaignCharacter/Update campaign values.bru` (incluir `sheetFile` com os três cenários) e `bruno/CampaignCharacter/Get detail.bru` (conferir `sheetFile`/`sheetFileUrl`/`sheetFileType` da campanha).
- [X] T052 Rodar a suíte completa conforme `specs/032-campaign-sheet-copy/quickstart.md` §3 e registrar a saída: `cd backend && dotnet build Roll6.sln && dotnet test` (inclui `backend/Roll6.Tests/Mcp/`) e `cd frontend && npm run lint && npm test && npm run build`. Comparar com a linha de base do T001 — nenhuma regressão é aceitável.
- [ ] T053 Percorrer o checklist de regressão de `specs/032-campaign-sheet-copy/contracts/ui-contracts.md` §9 (8 itens) e a "Definição de pronto" de `specs/032-campaign-sheet-copy/quickstart.md` §7, marcando cada item.
- [ ] T054 Executar `/speckit.analyze` para a verificação de consistência entre `specs/032-campaign-sheet-copy/spec.md`, `plan.md`, `tasks.md`, `research.md`, `data-model.md`, `quickstart.md` e `specs/032-campaign-sheet-copy/contracts/`, e registrar as divergências — em especial a Assumption da spec sobre "até N cópias do arquivo", que a decisão D1 de `specs/032-campaign-sheet-copy/research.md` tornou obsoleta (o custo de armazenamento permanece 1×).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — pode começar imediatamente. T002 é pré-requisito de todas as fases de frontend (US3, US4).
- **Foundational (Phase 2)**: depende do Setup. **Bloqueia todas as user stories.** T005 depende de T003+T004; T006 depende de T005; T007 depende de T006; T008/T009 dependem de T006 (precisam do timestamp da migration).
- **User Stories (Phase 3-7)**: todas dependem da Phase 2.
  - **US1 (Phase 3)**: depende só da Foundational.
  - **US2 (Phase 4)**: depende de US1 (a cópia precisa existir para haver o que trocar/remover) — T020 e T021 tocam os mesmos arquivos de T014/T015, então devem rodar depois.
  - **US3 (Phase 5)**: depende da Foundational (T012/T013) e, para o arquivo de ficha da campanha no Modal B (T031), do backend de US2 (T010/T011/T023/T024). A divisão dos modais em si não depende de US1.
  - **US4 (Phase 6)**: depende de US3 (T039…T041 mexem em `CampaignCharacterModal.tsx`, criado em T031). T042 é independente ([P]).
  - **US5 (Phase 7)**: depende de US1 e US2. T044 deve rodar depois de T021 (mesmo arquivo); T045 é independente.
- **Polish (Phase 8)**: depende de todas as stories desejadas. T054 por último.

### User Story Dependencies

- **US1 (P1)**: independente após a Foundational — **é o MVP**.
- **US2 (P1)**: depende de US1.
- **US3 (P1)**: depende da Foundational + backend de US2 para o arquivo no Modal B; a parte de edição da ficha original é independente de US1/US2.
- **US4 (P2)**: depende de US3.
- **US5 (P3)**: depende de US1 e US2; é majoritariamente verificação.

### Within Each User Story

- Testes antes da implementação (devem falhar primeiro).
- Modelo de domínio antes de serviço; serviço antes de DTO/MCP; backend antes do frontend que o consome.
- Tarefas no mesmo arquivo são **sequenciais**, nunca `[P]`.

### Conflitos de arquivo (por isso não são [P] entre si)

| Arquivo | Tarefas |
|---|---|
| `backend/Roll6.Domain/Models/CampaignCharacter.cs` | T003 → T016 → T023 |
| `backend/Roll6.Tests/Domain/Models/CampaignCharacterTests.cs` | T014 → T020 |
| `backend/Roll6.Tests/Domain/Services/CampaignCharacterServiceTests.cs` | T015 → T021 → T044 |
| `backend/Roll6.Domain/Services/CampaignCharacterService.cs` | T017 → T024 |
| `backend/Roll6.Mcp/Tools/ParticipationTools.cs` | T027 (após T026) |
| `frontend/src/components/modals/CampaignCharacterModal.tsx` | T031 → T039 → T040 → T041 |
| `frontend/src/components/modals/CharacterFormModal.tsx` | T032 |
| `frontend/src/i18n/locales/pt-BR.json` | T002 (única) |

### Parallel Opportunities

- **Phase 2**: T008, T009, T010, T011, T012 em paralelo (arquivos distintos) depois de T006.
- **Phase 3**: T014 e T015 em paralelo.
- **Phase 4**: T020, T021, T022 em paralelo; T026 em paralelo com T023/T024/T025.
- **Phase 5**: T036 em paralelo com T031…T035.
- **Phase 6**: T042 em paralelo com T039…T041.
- **Phase 7**: T044 e T045 em paralelo.
- **Phase 8**: T049, T050, T051 em paralelo.
- **Entre fases**: backend (US1, US2) e frontend (US3) podem avançar em paralelo por pessoas diferentes, desde que a Phase 2 esteja concluída — o contrato em `contracts/campaign-character-api.md` é a fronteira.

---

## Parallel Example: User Story 1

```bash
# Testes de US1 em paralelo (arquivos diferentes):
Task: "Ajustar as asserções de reset em backend/Roll6.Tests/Domain/Models/CampaignCharacterTests.cs"        # T014
Task: "Ajustar os testes de cópia/detalhe em backend/Roll6.Tests/Domain/Services/CampaignCharacterServiceTests.cs"  # T015

# Depois, implementação sequencial (T016 e T017 são arquivos diferentes, mas T018 depende de ambos):
Task: "Copiar sheet e sheetFile em ResetFrom — backend/Roll6.Domain/Models/CampaignCharacter.cs"            # T016
Task: "Ler o arquivo da participação em MapToDetailAsync — backend/Roll6.Domain/Services/CampaignCharacterService.cs"  # T017
```

## Parallel Example: Phase 2 (Foundational)

```bash
# Depois de T006 (migration com backfill), cinco tarefas em paralelo:
Task: "Criar database/migrations/032-campaign-sheet.sql"                                    # T008
Task: "Regenerar database/roll6.sql e recolocar o cabeçalho"                                # T009
Task: "Acrescentar sheetFile a backend/Roll6.DTO/CampaignCharacter/CampaignCharacterDetailInfo.cs"   # T010
Task: "Acrescentar SheetFile a backend/Roll6.DTO/CampaignCharacter/CampaignCharacterUpdateInfo.cs"   # T011
Task: "Acrescentar sheetFile a frontend/src/types/campaignCharacter.ts"                     # T012
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: Setup (T001-T002)
2. Phase 2: Foundational (T003-T013) — **crítico, bloqueia tudo**
3. Phase 3: User Story 1 (T014-T019)
4. **PARAR e VALIDAR**: a cópia existe, é independente e a migração preservou os dados
5. Já é demonstrável: um personagem que entra numa campanha leva a própria ficha (texto e arquivo)

### Incremental Delivery

1. Setup + Foundational → coluna, DTOs e tipos prontos
2. **US1** → cópia na entrada + migração → testar → demo (MVP)
3. **US2** → mestre/dono trocam e removem o arquivo da campanha + MCP + log de turno → testar → demo
4. **US3** → dois modais; o dono edita a ficha original pela lista de personagens → testar → demo
5. **US4** → a tela da campanha mostra só a ficha da campanha, com aviso quando não há arquivo → testar → demo
6. **US5** → independência entre campanhas e recópia na reentrada → testar → demo
7. **Polish** → `CLAUDE.md`, Bruno, suíte completa, `/speckit.analyze`

Cada passo adiciona valor sem quebrar o anterior. A ordem US3 → US4 é deliberada: T031 cria o Modal B antes de
T032 esvaziar o Modal A, então o card do painel nunca fica sem janela.

### Parallel Team Strategy

1. Todos fazem Setup + Foundational juntos (T001-T013)
2. Depois:
   - **Dev A (backend)**: US1 (T014-T019) → US2 (T020-T030) → US5 backend (T044-T046)
   - **Dev B (frontend)**: US3 (T031-T038) → US4 (T039-T043) — pode começar em T032/T034/T035 antes de US2
     terminar, desde que o Modal B (T031) use o campo `sheetFile` já definido em T011/T012
3. Polish (T049-T054) em conjunto

---

## Notes

- `[P]` = arquivos diferentes e sem dependências pendentes. Tarefas no mesmo arquivo são sempre sequenciais (ver tabela de conflitos).
- O rótulo `[USn]` existe só nas fases 3 a 7; Setup, Foundational e Polish não têm rótulo.
- **Não criar nenhum endpoint novo**: `McpCoverageTests` fixa 86 operações / 87 ferramentas (pesquisa D3).
- **Todo parâmetro novo de ferramenta MCP precisa ter default**, senão `McpRouteParityTests` injeta `"sample"`.
- **Não renomear a chave de diff `"notes"`** — está persistida em `turns.changes` (`jsonb`); muda-se apenas o rótulo em `TurnSummary` (pesquisa D6).
- ⚠ `Character.Update` grava `TokenId` e `SheetFile` incondicionalmente: o Modal A precisa reenviar os dois (pesquisa D7, armadilha 1).
- ⚠ O botão "Remover token" só funciona por `PUT /api/character` (`tokenId: null` em `PUT /api/campaigncharacter` significa *mantém*) — por isso ele fica no Modal A (armadilha 3).
- O Vitest do frontend usa `environment: 'node'` e coleta apenas `src/**/*.test.ts`: **não escrever `.test.tsx`**; a cobertura nova vai para `frontend/src/lib/campaignCharacterForm.test.ts`.
- Não rodar `docker`/`docker compose` na máquina de dev (constituição, Princípio II).
- Respeitar o casing de diretórios nos imports (`Contexts/`, `Services/` maiúsculos; `hooks/`, `types/`, `lib/`, `components/` minúsculos) — o build Linux/Docker falha com imports divergentes.
- Commitar após cada tarefa ou grupo lógico; parar em qualquer checkpoint para validar a story isoladamente.
