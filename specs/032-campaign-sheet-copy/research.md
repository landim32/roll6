# Phase 0 Research: Ficha do personagem por campanha (texto e arquivo)

**Feature**: `032-campaign-sheet-copy` · **Date**: 2026-09-30 · **Plan**: [plan.md](./plan.md)

Nenhum ponto do Technical Context ficou como `NEEDS CLARIFICATION`: a stack é fixa pela constituição
(Princípio II) e as quatro decisões de produto foram respondidas pelo usuário na fase de especificação
(tabela "Decisões incorporadas" da [spec.md](./spec.md)). Este documento registra as **8 decisões técnicas**
que a pesquisa de código levantou, cada uma com evidência do estado atual.

Índice: [D1](#d1) · [D2](#d2) · [D3](#d3) · [D4](#d4) · [D5](#d5) · [D6](#d6) · [D7](#d7) · [D8](#d8)

---

<a name="d1"></a>
## D1 — A "cópia" do arquivo de ficha é uma referência compartilhada, não uma duplicação de bytes

**Decision**: `campaign_characters.sheet_file` guarda o **mesmo nome de objeto** (`{32-hex}.{png|jpg|webp|pdf}`)
que `characters.sheet_file` no momento da entrada na campanha. Nenhum byte é copiado, movido ou lido do bucket.

**Rationale**:
- Os objetos armazenados são **write-once e imutáveis**. `S3ImageStorageAppService.UploadAsync` gera o nome
  (`$"{Guid.NewGuid():N}.{extension}"`), e nada no sistema sobrescreve ou apaga um objeto — `IImageStorageAppService`
  expõe apenas `UploadAsync(Stream, string contentType, string extension)`, `GetUrl(string?)` e `OpenAsync(string)`.
  Não existe `DeleteAsync`.
- Portanto FR-004 (alterar a original não afeta a da campanha) e FR-005 (substituir ou remover uma não altera a
  outra) são satisfeitos **pela independência das referências**: trocar o arquivo do personagem faz
  `Character.Update` gravar um nome *novo* no personagem, e a participação continua apontando para o antigo.
- FR-007 (conteúdo idêntico, sem conversão) é satisfeito trivialmente — são literalmente os mesmos bytes,
  e SC-004 ("idênticos byte a byte") vale por construção.
- **Elimina o único bloqueio real encontrado na pesquisa**: não há como ler de volta um PDF armazenado.
  `ImageService.OpenAsync` valida contra `^[0-9a-f]{32}\.(png|jpg|webp)$` e **rejeita `.pdf`** (é a mesma
  restrição de `GET /api/image/file/{fileName}`). Uma cópia física de ficha em PDF exigiria relaxar essa
  validação *e* acrescentar cópia no storage *e* recuperar o Content-Type a partir da extensão
  (`SheetFiles.TypeOf` devolve `"image"`/`"pdf"`, não um MIME).
- A migração vira SQL puro (um `UPDATE ... SET sheet_file = c.sheet_file`), sem passo de aplicação que
  precise de credencial S3 — importante porque `CLAUDE.md` registra que não há Docker nem PostgreSQL na
  máquina de dev e que as migrations de homolog/prod rodam no startup da API.
- Exibição continua funcionando sem mudança: `SheetFileView` usa a URL pré-assinada de `_imageStorage.GetUrl(name)`
  para imagens (`<img>`) e para PDFs (`<a target="_blank">`). O caminho `GET /api/image/file/{fileName}` só é
  usado pelo canvas do map-share por causa de CORS, e não é usado por ficha.

**Alternatives considered**:
- **Cópia física via S3 `CopyObjectAsync`** (novo método em `IImageStorageAppService` + `S3ImageStorageAppService`,
  novo serviço de cópia, novo registro em `Startup.cs`). Rejeitada: exige 3 camadas novas para um resultado
  indistinguível do usuário, não funciona dentro de `migrationBuilder.Sql` (a migração precisaria virar código C#
  com credenciais), e não resolve o bloqueio do PDF sem *também* mexer em `ImageService.OpenAsync`.
- **Ler o objeto e re-enviar com `UploadAsync`** (`OpenAsync` → `UploadAsync`). Rejeitada: esbarra no mesmo
  bloqueio do `.pdf`, duplica custo de requisição por participação e ainda precisa do Content-Type.
- **Não ter arquivo por campanha** (só o texto). Rejeitada: é o pedido explícito do usuário ("ficha em markdown
  **e imagem/pdf** dos personagens para a campanha") e está em FR-002/FR-016/FR-022.

**Consequência registrada**: a Assumption da spec de que "o mesmo personagem em N campanhas pode ocupar até N
cópias do arquivo" deixa de ser verdadeira — o custo de armazenamento permanece 1× por arquivo enviado.
Isso é estritamente melhor e não altera nenhum requisito; a spec não precisa ser reaberta (o `/speckit.analyze`
pode marcar a divergência como benigna).

---

<a name="d2"></a>
## D2 — `ResetFrom` continua sendo o funil único de cópia; `UpdatePlay` não muda de assinatura

**Decision**: a cópia (FR-003) acontece dentro de `CampaignCharacter.ResetFrom(Character)`, que já é chamado por
`Create` (participação nova) e por `Join` (toda transição para Aprovado — vinda de `Invite`, `AcceptInvite` e
`ApproveRequest`). O corpo passa de:

```csharp
CurrentLife = character.Life;
CurrentEnergy = character.Energy;
Sheet = null;              // 023: notas começam vazias
CharacterStatus = null;
Posture = Posture.Standing;
```

para:

```csharp
CurrentLife = character.Life;
CurrentEnergy = character.Energy;
Sheet = character.Sheet;          // 032: cópia da ficha original (reverte a 023)
SheetFile = character.SheetFile;  // 032: cópia da referência ao arquivo
CharacterStatus = null;
Posture = Posture.Standing;
```

`UpdatePlay(int currentLife, int currentEnergy, string? characterStatus, string? sheet, int totalLife, int totalEnergy)`
**mantém a assinatura**: só o *significado* de `sheet` muda (de "notas" para "ficha da campanha"), o que não é
observável no contrato.

**Rationale**:
- `ResetFrom` já é o ponto único que a feature 010 documentava como "entrada na campanha"; reaproveitá-lo cobre
  de uma vez a criação e todas as passagens para Aprovado, satisfazendo FR-003 e o cenário US5-AS4 sem新增 caminho.
- O `Character` já está carregado em todos esses pontos — `CampaignCharacterService.GetCharacterAsync(characterId)`
  (`ICharacterRepository.GetByIdAsync`, `AsNoTracking`) é chamado em `RequestAccessAsync`, `InviteAsync`,
  `ApproveRequestAsync` e `AcceptInviteAsync` — e a entidade já traz `SheetFile`. **Nenhuma consulta nova.**
- Manter `UpdatePlay` intacto reduz muito o raio de impacto. Os call sites que não precisariam mudar e de fato
  não mudam: `TurnService.Processing.cs:318`
  (`participation.UpdatePlay(life, energy, status, participation.Sheet, character.Life, character.Energy)`) e as
  seis chamadas em `Roll6.Tests/Domain/Models/CampaignCharacterTests.cs` (linhas 163, 176, 187, 195, 196, 208).
- `MapTokenService.cs:349` (`info.Sheet = participation.Sheet`) já expõe o texto da participação nas peças do
  mapa: com a mudança, as peças passam a mostrar a ficha da campanha em vez das notas — consequência desejada e
  coerente com FR-020.

**Alternatives considered**:
- **Passar `sheetFile` como parâmetro de `UpdatePlay`**. Rejeitada: obrigaria a alterar `TurnService.Processing.cs`
  e seis testes sem ganho — o `process_turn` não deve trocar o arquivo de ficha, e hoje ele já repassa
  `participation.Sheet` inalterado pelo mesmo motivo.
- **Criar um método `CopySheetFrom(Character)` separado de `ResetFrom`**. Rejeitada: dois funis para o mesmo
  momento criariam o risco de um ser chamado sem o outro (exatamente o bug que a 023 introduziu ao mudar só o
  `Sheet = null` dentro de `ResetFrom`).
- **Campo novo `campaign_characters.notes` ao lado de `sheet`** (manter notas *e* ter ficha). Rejeitada pela
  Decisão 1 do usuário: a ficha da campanha **substitui** as anotações (uma única área de texto por campanha).

---

<a name="d3"></a>
## D3 — Semântica de atualização do arquivo: ausente/`null` = mantém, `""` = remove, nome = troca

**Decision**: `CampaignCharacterUpdateInfo` ganha `sheetFile` (`string?`, `[JsonPropertyName("sheetFile")]`) com:

| Valor recebido | Efeito |
|---|---|
| ausente ou `null` | **mantém** o arquivo atual da campanha |
| `""` (string vazia) | **remove** o arquivo da campanha |
| `{32-hex}.{png\|jpg\|webp\|pdf}` | **troca** pelo arquivo enviado |

No domínio, um método novo e dedicado em vez de estender `UpdatePlay`:

```csharp
/// <summary>
/// Campaign sheet file: the fileName returned by POST /api/document; null (or absent) keeps the current one,
/// an empty string removes it (032). Only the owner or the campaign master, while approved.
/// </summary>
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
```

**Rationale**:
- **Coerência interna do DTO**: `CampaignCharacterUpdateInfo` já é um DTO de atualização *parcial*, onde
  `tokenId: null` = mantém (`CampaignCharacterService.cs:180`, `info.TokenId.HasValue && character.ChangeToken(...)`)
  e `posture: null` = mantém. Introduzir "`null` = apaga" num terceiro campo do mesmo DTO seria uma armadilha:
  qualquer cliente que faça `PUT` sem o campo **apagaria silenciosamente** a ficha em arquivo da campanha.
- A divergência em relação a `CharacterInsertInfo.sheetFile` (`null` = remove, convenção da 022) é **intencional
  e justificada**: aquele DTO é de substituição completa (todo campo é gravado), este é parcial. O motivo fica
  documentado no XML doc do DTO e no contrato.
- **`Guard.SheetFileName` não serve para o sentinela vazio**: `Guard.OptionalText` faz `Trim()` e devolve `null`
  para string vazia, então `""` seria indistinguível de "manter" se passasse direto pelo `Guard`. O teste de
  `Length == 0` antes do `Guard` resolve isso e mantém a validação de formato (`^[0-9a-f]{32}\.(png|jpg|webp|pdf)$`)
  e de tamanho (260) intactas para o caso de troca.
- Um método próprio espelha o padrão já existente na entidade (`ChangePosture(int)`, que também retorna sem
  alterar quando o valor é o mesmo) e deixa `UpdatePlay` focado no que muda durante o jogo.
- **MCP seguro por construção**: `update_participation` ganha `string? sheetFile = null`. Por ter default, o
  `McpRouteParityTests` (que injeta o literal `"sample"` em parâmetros `string` sem default — e que hoje já
  faria `Guard.SheetFileName("sample")` falhar) **continua passando**, e uma chamada de assistente que não
  mencione o arquivo nunca o apaga.

**Alternatives considered**:
- **`null` = remove**, espelhando `CharacterInsertInfo`. Rejeitada: apagamento silencioso por omissão num DTO
  parcial; quebraria assistentes MCP e clientes existentes que já chamam `PUT /api/campaigncharacter/{id}`
  sem o campo.
- **Booleano separado (`removeSheetFile`)** ou **`clearSheetFile`**. Rejeitada: dois campos para uma decisão,
  mais superfície de teste, e nenhum precedente no codebase.
- **Endpoint próprio (`PUT /api/campaigncharacter/{id}/sheet-file`)**. Rejeitada: **proibida** por restrição dura —
  `McpCoverageTests` fixa `expected.Should().HaveCount(86)` e `tools.Should().HaveCount(87)`, e todo endpoint novo
  exigiria ferramenta MCP nova + mudança nesses números + descrição completa (`What it does:`/`Who can use it:`/
  `Returns:`/`Related tools:`/`Common errors:`). Custo desproporcional para gravar um nome de arquivo.
- **Validação no serviço em vez de no domínio**. Rejeitada: violaria o Princípio I (regras de negócio no Domain)
  e o padrão `Guard` + `DomainValidationException` já usado em `Character.Update`.

---

<a name="d4"></a>
## D4 — Reuso dos nomes de campo do DTO de detalhe, com a origem trocada para a campanha

**Decision**: em `CampaignCharacterDetailInfo`:

| Campo (JSON) | Antes (022/023) | Depois (032) |
|---|---|---|
| `sheet` | notas da campanha | **ficha da campanha em texto** (cópia da original) |
| `characterSheet` | ficha original, somente leitura | **inalterado** — ficha original, somente leitura |
| `sheetFileUrl` | URL do arquivo **do personagem** | URL do arquivo **da campanha** |
| `sheetFileType` | tipo do arquivo **do personagem** | tipo do arquivo **da campanha** |
| `sheetFile` | *(não existia)* | **novo** — nome armazenado do arquivo da campanha |

`MapToDetailAsync` troca `var sheetFile = character?.SheetFile;` por `var sheetFile = participation.SheetFile;`.

**Rationale**:
- **`sheetFile` (nome cru) é obrigatório**, não conveniência: é o que permite ao Modal B reenviar o arquivo
  existente ao salvar. Sem ele, `toCampaignUpdate({ ..., sheetFile: null })` manteria o arquivo por sorte, mas o
  fluxo "trocar arquivo" precisaria de uma leitura extra. O precedente é exato — `CharacterInfo.sheetFile` existe
  pela mesma razão e alimenta `toCharacterInsert(form, image, tokenId, sheetFile?.fileName ?? null)`.
- **Manter `characterSheet`** evita regressão para consumidores MCP (`get_participation` documenta
  `characterSheet` como a ficha do personagem) e não contradiz FR-020, que é uma regra de **tela**, não de
  visibilidade de API. O mestre continua podendo *ler* a ficha original; o que ele não pode é **alterá-la**
  (FR-010) nem **vê-la na tela da campanha** (FR-020, resolvido no frontend).
- **Não acrescentar `characterSheetFileUrl`/`characterSheetFileType`**: nenhuma tela os consumiria — FR-025 exige
  justamente que a tela da campanha **não** exiba o arquivo original quando a campanha não tem o seu. Adicionar
  campo morto contraria o "keep it simple" do `CLAUDE.md`.
- Reusar `sheetFileUrl`/`sheetFileType` (em vez de renomear para `campaignSheetFileUrl`) mantém
  `frontend/src/types/campaignCharacter.ts` e `components/characters/SheetFileView.tsx` intactos; a mudança de
  origem é documentada no XML doc do DTO, no comentário do tipo TS e em `contracts/campaign-character-api.md`.
  É uma mudança de semântica de campo existente, tratada como tal no contrato — não há consumidor externo além
  do nosso MCP, cujas descrições são atualizadas nesta feature.

**Alternatives considered**:
- **Renomear para `campaignSheetFileUrl`/`campaignSheetFileType`**. Rejeitada: mais explícito, porém obriga a
  mudar tipos TS, `SheetFileView`, descrições MCP e testes de contrato sem ganho funcional; e deixaria a dúvida
  simétrica sobre `sheet`/`characterSheet`, que já seguem a convenção "sem prefixo = da campanha".
- **Remover `characterSheet` do DTO**. Rejeitada: quebra `get_participation` e os testes
  `GetById_OwnerMasterOrApprovedParticipant_ReturnsTheSheet` sem nenhum requisito pedindo isso.
- **Criar um DTO de detalhe novo**. Rejeitada: dois DTOs quase idênticos e um endpoint novo (bloqueado por D3).

---

<a name="d5"></a>
## D5 — Migração: uma migration EF com backfill em SQL; notas preservadas e anexadas

**Decision**: `dotnet ef migrations add AddCampaignSheetFile --project Roll6.Infra --startup-project Roll6.API`,
com `AddColumn` + um `migrationBuilder.Sql(...)` (raw string literal `"""`, padrão de `AddSlugs` e
`AddPostureAndTokenSpaces`) que faz as duas coisas numa passada:

```sql
WITH prepared AS (
    SELECT cc.campaign_character_id,
           CASE WHEN cc.sheet IS NULL OR btrim(cc.sheet) = ''
                THEN ''
                ELSE E'\n\n## Anotações anteriores da campanha\n\n' || cc.sheet
           END AS suffix
    FROM campaign_characters AS cc
)
UPDATE campaign_characters AS cc
SET sheet_file = c.sheet_file,
    sheet = left(
              left(coalesce(c.sheet, ''), greatest(0, 20000 - length(p.suffix))) || p.suffix,
              20000)
FROM characters AS c
JOIN prepared p ON p.campaign_character_id = cc.campaign_character_id
WHERE c.character_id = cc.character_id;
```

Mais: `database/migrations/032-campaign-sheet.sql` (saída idempotente de
`dotnet ef migrations script 20260929215843_AddPostureAndTokenSpaces <nova> --idempotent`, com o cabeçalho no
padrão de `031-posture-footprint.sql`) e `database/roll6.sql` regenerado preservando o cabeçalho.

**Rationale**:
- A ordem dos `left(...)` implementa exatamente FR-027 e FR-028: o `left(coalesce(c.sheet,''), greatest(0, 20000 - length(suffix)))`
  interno **corta a cópia** para o sufixo caber; o `left(..., 20000)` externo é a rede de segurança para o caso
  patológico em que as próprias notas + o cabeçalho já estouram o limite (`sheet` é `varchar(20000)` e um valor
  maior faria a migration falhar). Sem ele, `greatest(0, …)` devolveria `''` e o resultado seria só o sufixo,
  potencialmente > 20000.
- `sheet_file = c.sheet_file` é possível **somente por causa de D1** — não há objeto a duplicar.
- Aplica-se a **todas** as participações, não só às Aprovadas: o edge case da spec pede isso, e participações não
  aprovadas serão recopiadas ao serem aprovadas de qualquer forma (`ResetFrom`), então o valor é inofensivo.
- SQL puro roda no startup da API em homolog/prod (`Database:ApplyMigrationsOnStartup`) sem depender de
  credencial S3 nem de passo manual.
- A migration da 023 (`ClearCopiedCampaignNotes`) serve de precedente para backfill de dados em
  `campaign_characters.sheet` usando `UPDATE ... FROM characters`.

**Alternatives considered**:
- **Backfill em C# na migration** (`context.CampaignCharacters.ToList()` + loop). Rejeitada: precisa de
  `Roll6Context` dentro de migration (fora do padrão do repositório), não é idempotente por construção e seria
  obrigatória se a cópia fosse física — mais um motivo para D1.
- **Notas viram a ficha sem recopiar** (opção B do usuário) ou **descartar as notas** (opção C). Rejeitadas
  **pelo usuário**, que escolheu "Copiar + anexar notas".
- **Duas migrations (schema e dados)**. Rejeitada: o repositório faz as duas coisas na mesma migration
  (`AddCampaignCharacterVitals`, `MoveCharacterStatusToCampaign`, `AddSlugs`, `AddPostureAndTokenSpaces`).

---

<a name="d6"></a>
## D6 — Log de turno: mantém a chave `"notes"`, muda o rótulo; arquivo entra como mudança própria

**Decision**:
1. `CampaignCharacterService.cs:174` continua emitindo `("notes", before.Sheet, participation.Sheet)` — **a chave
   do diff não muda**.
2. `TurnSummary.Change` (`Turns/TurnSummary.cs:120-121`) troca o rótulo `"Anotações alteradas"` por
   `"Ficha da campanha alterada"`.
3. `UpdateAsync` passa a incluir `("sheetFile", before.SheetFile, participation.SheetFile)` no `TurnChange.Diff`,
   e `TurnSummary.Change` ganha um ramo que devolve `"Ficha em arquivo alterada"` (sem conteúdo, como as notas).

**Rationale**:
- As mudanças são persistidas em `turns.changes` como `jsonb` `[{ field, before, after }]` (`TurnChange.Diff`).
  Renomear a chave `"notes"` **orfanaria as entradas históricas**: `TurnSummary.Change` cairia no `_ => change.Field`
  e o resumo de turnos antigos passaria a imprimir `notes`. Manter a chave e trocar só o rótulo preserva o
  histórico e ainda o exibe com o nome novo — que é o correto, já que o campo agora *é* a ficha da campanha.
- O rótulo não revela conteúdo, coerente com a decisão da 024 ("as anotações aparecem no resumo apenas como
  'Anotações alteradas', sem o texto completo, para não poluir o resumo") — vale igual para a ficha inteira, que
  pode ter 20.000 caracteres, e para um nome de arquivo `{guid}.pdf`, que não significa nada para o leitor.
- Registrar a troca do arquivo mantém a garantia da 024 de que "toda gravação que mude valores de um personagem
  na campanha gera um registro com o que mudou e quem fez" — o arquivo agora é um desses valores.
- `Turn.CharacterUpdate` é criado só quando `changes.Count > 0`, então uma chamada que não muda nada continua
  sem gerar entrada (teste `Update_NothingChanged_RecordsNothing` permanece válido).

**Alternatives considered**:
- **Renomear a chave para `"sheet"`**. Rejeitada: quebra o histórico persistido e três testes
  (`TurnSummaryTests.cs:63,66`, `CampaignCharacterServiceTests.cs:532`, `TurnTests.cs:101,103`) sem benefício
  visível ao usuário.
- **Migrar as chaves antigas no `jsonb`**. Rejeitada: `UPDATE` sobre `jsonb` array para trocar um valor de campo,
  com risco e custo altos para ganho nulo (o rótulo já resolve a exibição).
- **Não registrar a troca de arquivo**. Rejeitada: deixaria uma alteração do mestre na campanha sem rastro,
  inconsistente com o resto do log.

---

<a name="d7"></a>
## D7 — Divisão dos modais: `CharacterFormModal` (personagem) + `CampaignCharacterModal` (campanha)

**Decision**: dois componentes, dois pontos de montagem.

**Modal A — `frontend/src/components/modals/CharacterFormModal.tsx` (arquivo existente, reduzido)**

```ts
interface CharacterFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null/undefined = criação ("Incluir Personagem"); um personagem = edição (dono). */
  character?: CharacterInfo | null;
}
```
- Abas: `data` (nome + imagem na mesma linha, token, "Ficha permanente" = totais + movimento) · `sheet`
  (ficha **original**, `MarkdownEditor`) · `sheetFile` (arquivo **original**, `SheetFileField`).
- Estado que permanece: `tab`, `form`, `crop`, `cropping`, `keptImage`, `sheetFile`, `uploadingSheet`, `saving`,
  `token`, `pickingToken`. Sai: `original`, `detail`, `currentLife`, `currentEnergy`, `characterStatus`,
  `posture`, `campaignSheet`.
- Salva **só** com `createCharacter` / `updateCharacter` (`PUT /api/character/{id}`) — nunca chama
  `updateParticipation`, o que garante FR-008/US3-AS3.
- `loading` perde o termo `isOwner && original === null`.

**Modal B — `frontend/src/components/modals/CampaignCharacterModal.tsx` (novo)**

```ts
/** A party card opened in the form: the participation and what the user may do with it. */
export interface CharacterEditTarget {
  participation: CampaignCharacterInfo;
  mode: ParticipationMode;
}
interface CampaignCharacterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: CharacterEditTarget | null;
}
```
- Abas: `data` (nome/foto/totais/movimento **somente leitura** a partir do detalhe + "Nesta campanha": vida e
  energia atuais, status, postura, token) · `campaignSheet` (**"Ficha da Campanha"**) · `sheetFile` (arquivo
  **da campanha**).
- Estado: `tab`, `detail`, `currentLife`, `currentEnergy`, `characterStatus`, `posture`, `campaignSheet`,
  `campaignSheetFile` (`SheetFileValue | null`), `uploadingSheet`, `token`, `pickingToken`, `saving`.
- **Não chama `getCharacter`**: `CampaignCharacterDetailInfo` já traz `characterName`, `characterImageUrl`,
  `totalLife`, `totalEnergy`, `characterMove` e `characterTokenId/Name/ImageUrl` — remove uma requisição e uma
  ramificação de `loading`.
- Salva **só** com `updateParticipation` (`PUT /api/campaigncharacter/{id}`), o que garante FR-009/FR-010
  estruturalmente: o mestre não tem como alcançar os dados do personagem por essa tela.
- `vitalsToSave` continua aqui, usando `before.totalLife`/`before.totalEnergy` do detalhe.

**Pontos de montagem e navegação**
- `pages/MainPage.tsx`: `import type { CharacterEditTarget } from '../components/modals/CampaignCharacterModal';`
  (a exportação **muda de arquivo** — quebra deliberada, corrigida no mesmo commit) e
  `<CampaignCharacterModal open={editing !== null} editing={editing} onOpenChange={...} />`.
- `components/menu/TopMenu.tsx`: `const [includeOpen, setIncludeOpen] = useState(false)` vira
  `const [editingCharacter, setEditingCharacter] = useState<CharacterInfo | null>(null)`, seguindo o padrão
  "entidade anulável como flag de aberto" já usado por `transferring`/`TransferCharacterModal`.
  `<CharacterFormModal open={editingCharacter !== null || includeOpen} ... />` é substituído por uma única
  montagem que atende criação e edição.
- `components/modals/SelectCharacterModal.tsx`: prop nova `onEdit: (character: CharacterInfo) => void` e um botão
  com `PencilIcon size={14}` **antes** do de transferir, dentro de `.stm-character-actions`
  (CSS `styles/app.css:564-588` já é `display:flex; gap:.5rem` — nenhuma mudança de estilo). Precedente exato
  de layout e de `title`/`aria-label`: `components/campaign/CampaignNpcsTab.tsx:38-43`.
- `PartyCard.tsx`/`PartyPanel.tsx`: **inalterados**. `PartyCard` recebe só `CampaignCharacterInfo` (DTO de lista,
  sem ficha), e a regra de ícone (`owner` e `master` → `PencilIcon`, `viewer` → `EyeIcon`) já satisfaz FR-024.

**Armadilhas do estado atual que o plano neutraliza**
1. `Character.Update` faz `TokenId = tokenId;` **incondicionalmente** → o Modal A precisa carregar o token do
   personagem (`CharacterInfo.tokenId/tokenName/tokenImageUrl`) e devolvê-lo, senão editar o personagem apaga o
   token. O token é dado do personagem, então pertence ao Modal A; ele **também** aparece no Modal B por causa da
   exceção de FR-010 (o mestre o escolhe lá, via `updateParticipation({ tokenId })`).
2. `Character.Update` faz `SheetFile = Guard.SheetFileName(sheetFile, ...)` → `null` remove. Como o Modal B nunca
   chama `updateCharacter`, o arquivo original está estruturalmente protegido.
3. `CampaignCharacterUpdateInfo.tokenId: null` = mantém → o botão "Remover token" **não funciona** por
   `updateParticipation`. No desenho atual ele só existe para o dono (`token && characterEditable`) e passará a
   viver no Modal A, onde `updateCharacter` de fato grava `tokenId: null`. O Modal B mantém apenas "Escolher
   token" (dono e mestre), sem o botão de remover — coerente com `null` = mantém.
4. `Modal hidden` existe para "uma janela visível por vez"; o Modal B continua passando
   `hidden={pickingToken}` para o `TokenModal`.

**Rationale**: a divisão é a Decisão 2 do usuário ("pode criar dois modals diferentes") e é o que torna FR-009 e
FR-020 garantidos **por construção** em vez de por ramificação de `if`: cada modal chama um único endpoint.
Também remove de vez o `mode === owner` duplo caminho que hoje faz o mesmo componente salvar em dois endpoints
numa ordem específica (`updateCharacter` → `updateParticipation`).

**Alternatives considered**:
- **Um modal só, com aba extra "Ficha original" visível para o dono** (opção A oferecida ao usuário). Rejeitada
  **pelo usuário**; tecnicamente manteria o duplo salvamento encadeado e o `characterEditable` ambíguo.
- **Um modal só, com alternador "Nesta campanha / Do personagem"** (opção B). Rejeitada **pelo usuário**; impede
  comparar as duas fichas lado a lado e mantém um componente de 400+ linhas com três modos.
- **Manter `CharacterFormModal` como está e criar só o Modal B novo**. Rejeitada: deixaria dois componentes com
  metade do estado duplicado (crop, `SheetFileField`, `TokenModal`, `MarkdownEditor` lazy) e o Modal A continuaria
  sem modo de edição — que é o que a US3 precisa entregar.
- **Testes de componente (`.test.tsx`)**. Rejeitada: `vite.config.ts` tem
  `test: { environment: 'node', include: ['src/**/*.test.ts'] }`, sem `jsdom` nem `@testing-library/*`; habilitar
  isso seria mudança de infraestrutura fora do escopo. A lógica nova vai para `lib/campaignCharacterForm.ts`
  (puro) e é coberta em `lib/campaignCharacterForm.test.ts`.

---

<a name="d8"></a>
## D8 — Componentes de ficha reutilizados sem alteração; i18n com chaves novas mínimas

**Decision**:
- `components/characters/SheetFileField.tsx` é **reutilizado sem alteração** nos dois modais. Ele não tem nenhum
  acoplamento com personagem ou participação: suas props são `{ id, value: SheetFileValue | null, onChange,
  onUploadingChange }`, e ele mesmo valida (`validateSheetFile`), envia (`imageService.uploadDocument`,
  entidade-agnóstico) e mostra nome/tipo antes de salvar — exatamente o que FR-016 e FR-017 pedem. Só o JSDoc
  menciona "character"; os comentários são ajustados, o contrato não.
- `components/characters/SheetFileView.tsx` é **reutilizado sem alteração** (`{ url: string; type: SheetFileType }`,
  `url` não anulável, sem estado vazio). FR-025 é atendido **no Modal B**, que renderiza o aviso quando não há
  arquivo:

  ```tsx
  {campaignSheetFile?.url && campaignSheetFile.type
    ? <SheetFileView url={campaignSheetFile.url} type={campaignSheetFile.type} />
    : <p className="text-body-secondary">{t('sheetFile.noneCampaign')}</p>}
  ```
- `components/ui/MarkdownEditor.tsx` (`maxLength`, `placeholder`, `initialMode`, preview com `rehypeSanitize`) e
  `components/ui/MarkdownView.tsx` (`emptyText`) são reutilizados sem alteração — FR-021 ("mesmo editor, mesmo
  limite, mesmas proteções") vale por reuso, e a sanitização continua em todo lugar onde ficha é renderizada.
- `lib/sheetFile.ts` (`ACCEPTED_SHEET_TYPES`, `SHEET_FILE_ACCEPT`, `MAX_SHEET_FILE_BYTES`, `validateSheetFile`,
  `sheetFileMimeType`, `sheetFileTypeOf`) é entidade-agnóstico e atende FR-002 sem mudança.

**i18n (`frontend/src/i18n/locales/pt-BR.json`, única locale)**

| Chave | Ação | Valor |
|---|---|---|
| `characterForm.campaignSheetTab` | **valor alterado** (chave mantida) | `"Ficha da Campanha"` |
| `characterForm.campaignSheetHint` | **valor reescrito** | explica que é a ficha do personagem nesta campanha, cópia da original no momento da entrada, e que a original não muda |
| `characterForm.campaignSheetPlaceholder` | **valor reescrito** | exemplo de ficha, não de anotação de diferença |
| `characterForm.campaignSheetEmpty` | **valor alterado** | `"Sem ficha nesta campanha."` |
| `characterForm.errors.campaignSheetTooLong` | **valor alterado** | `"A ficha da campanha pode ter no máximo 20.000 caracteres."` |
| `characterForm.campaignTitle` | **nova** | `"Personagem na Campanha"` (título do Modal B; `viewTitle` já existente serve para o modo leitura) |
| `selectCharacter.edit` | **nova** | `"Editar {{name}}"` (padrão de `npcs.edit` e `party.edit`) |
| `sheetFile.noneCampaign` | **nova** | `"Não há ficha em arquivo nesta campanha."` (FR-025) |
| `toast.campaignCharacterUpdated` | **nova** | `"{{name}} atualizado nesta campanha."` (distingue o salvamento do Modal B do `toast.characterUpdated` do Modal A) |

`characterForm.permanentSection` ("Ficha permanente") e `characterForm.permanentHint` continuam corretos no
Modal A. Nenhum bloco i18n é renomeado ou movido: as chaves são identificadores estáveis consumidos em vários
arquivos, e a separação em dois blocos (`characterForm` × `campaignForm`) exigiria tocar em `ImageCropper.tsx`
(que lê `characterForm.zoom`/`cropHint`/`changeImage`/`chooseImage`/`removeImage`) sem ganho.

**Rationale**: FR-016, FR-017, FR-021 e FR-002 pedem explicitamente "o mesmo editor", "o mesmo comportamento de
envio" e "as mesmas regras" — reuso é a implementação literal do requisito, e evita duplicar a sanitização de
markdown (ponto de segurança chamado em `CLAUDE.md`: "keep sanitizing wherever sheets are rendered").

**Alternatives considered**:
- **Tornar `SheetFileView.url` anulável + prop `emptyText`** (espelhando `MarkdownView`). Rejeitada: muda um
  componente usado em dois lugares para resolver um caso que pertence a um deles; o aviso no Modal B é mais
  explícito e não altera contrato existente.
- **Criar `components/campaign/CampaignSheetFileField.tsx`**. Rejeitada: duplicaria `SheetFileField` inteiro
  (validação, upload, badge, trocar/remover) por diferença de texto de ajuda — e `SheetFileField` nem tem texto
  específico de personagem.
- **Nova prop `hint`/`label` em `SheetFileField`**. Adiada: `sheetFile.hint` ("Imagem (PNG, JPG, WebP) ou PDF, até
  10 MB. O arquivo é guardado como está, sem recorte.") é igualmente verdadeiro para a cópia da campanha. Se o
  `/speckit.implement` julgar necessário, é uma prop opcional aditiva.
- **Mover as chaves de campanha para um bloco `campaignForm`**. Rejeitada: ver rationale acima.
