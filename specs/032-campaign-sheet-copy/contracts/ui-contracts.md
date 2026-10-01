# Contrato de UI: os dois modais, a lista de personagens e os textos (032)

**Feature**: `032-campaign-sheet-copy` · **Stack**: React 18 + TypeScript 5 + Bootstrap 5.3 (dark only) +
i18next (locale única `pt-BR`) + toasts `sonner`. Restrições do projeto: `tsconfig` tem `erasableSyntaxOnly`
(**sem `enum`** — usar constantes); ícones só Bootstrap Icons inlinados em `components/ui/icons.tsx`;
`interface` em vez de `type`; arrow functions; `const` por padrão.

**Vitest não testa componentes**: `frontend/vite.config.ts` tem
`test: { environment: 'node', include: ['src/**/*.test.ts'] }`, sem `jsdom` nem `@testing-library/*`. Toda a
cobertura nova vai para módulos puros em `lib/` (pesquisa D7).

---

## 1. Modal A — `components/modals/CharacterFormModal.tsx` (personagem)

Arquivo existente, reduzido. Trata **apenas** do que é permanente (FR-016).

### Props

```ts
interface CharacterFormModalProps {          // não exportada
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null/omitido = criação ("Incluir Personagem"); um personagem = edição pelo dono. */
  character?: CharacterInfo | null;
}
export const CharacterFormModal;
export default CharacterFormModal;
```

**Quebra deliberada**: a exportação `CharacterEditTarget` **sai deste arquivo** e vai para o Modal B; a prop
`editing` deixa de existir. `pages/MainPage.tsx` (import na linha 28 e montagem nas 171-175) é ajustado no mesmo
commit.

### Abas

| Chave | Rótulo (i18n) | Conteúdo |
|---|---|---|
| `data` | `characterForm.dataTab` = "Dados" | nome + imagem na mesma linha (`ImageCropper compact`), **Token** (`TokenModal`), "Ficha permanente" (`characterForm.permanentSection`): vida total, energia total, movimento |
| `sheet` | `characterForm.sheetTab` = "Ficha" | ficha **original** — `MarkdownEditor` (`maxLength={MAX_CHARACTER_SHEET}`, `initialMode` = `'preview'` na edição, `'live'` na criação) + `characterForm.sheetHint` |
| `sheetFile` | `sheetFile.tab` = "Ficha em arquivo" | arquivo **original** — `SheetFileField` |

Títulos: criação → `characterForm.title` ("Incluir Personagem"); edição → `characterForm.editTitle`
("Editar Personagem"). `Modal large`; `hidden={pickingToken}` para o `TokenModal`.

### Estado

Permanece: `tab`, `form`, `crop`, `cropping`, `keptImage`, `sheetFile`, `uploadingSheet`, `token`, `pickingToken`,
`saving`.
**Sai**: `original`, `detail`, `currentLife`, `currentEnergy`, `characterStatus`, `posture`, `campaignSheet`.
Novo: nenhum — `character` vem por prop; o carregamento inicial usa a prop diretamente (ela já é um `CharacterInfo`
completo vindo da lista), sem `getCharacter`.

> `loading` perde o termo `isOwner && original === null`. Como a lista "Selecionar personagem" já carrega
> `myCharacters` via `characterService.listMine()`, o Modal A não precisa de busca própria.

### Salvamento

- Criação: `createCharacter(toCharacterInsert(form, image, token?.tokenId ?? null, sheetFile?.fileName ?? null))`
  — fluxo inalterado, inclusive a entrada automática na campanha atual e os três toasts
  (`characterCreated` / `characterCreatedApproved` / `characterCreatedRequested` / `characterRequestFailed`).
- Edição: `updateCharacter(character.characterId, { ...toCharacterInsert(...), image })` + toast
  `characterUpdated`.
- **Nunca** chama `updateParticipation` → FR-008 e US3-AS3 por construção.
- Validação antes de qualquer chamada: `validateCharacterForm(form)` (nome obrigatório/≤ 260, inteiros, não
  negativos, ficha ≤ 20.000); em erro, `setTab(error === 'sheetTooLong' ? 'sheet' : 'data')` + `toast.error`.
- ⚠ `Character.Update` grava `TokenId` e `SheetFile` **incondicionalmente**: o Modal A precisa semear `token` a
  partir de `character.tokenId/tokenName/tokenImageUrl` e `sheetFile` a partir de
  `character.sheetFile/sheetFileUrl/sheetFileType`, sob pena de apagá-los ao salvar (pesquisa D7, armadilha 1).
- US3-AS6 (descer um total ajusta os valores atuais das participações) é comportamento **do backend**
  (`ClampVitalsAsync`); o frontend não faz nada. O helper `vitalsToSave` **sai daqui** e vai para o Modal B.

---

## 2. Modal B — `components/modals/CampaignCharacterModal.tsx` (NOVO, campanha)

Trata **apenas** do que pertence à participação (FR-019) e exibe **a ficha da campanha** (FR-020).

### Props

```ts
/** A party card opened in the form: the participation and what the user may do with it. */
export interface CharacterEditTarget {
  participation: CampaignCharacterInfo;
  mode: ParticipationMode;      // 'owner' | 'master' | 'viewer' — lib/campaignCharacterForm
}
interface CampaignCharacterModalProps {      // não exportada
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: CharacterEditTarget | null;
}
export const CampaignCharacterModal;
export default CampaignCharacterModal;
```

### Abas

| Chave | Rótulo (i18n) | Conteúdo |
|---|---|---|
| `data` | `characterForm.dataTab` = "Dados" | nome + foto **somente leitura** (`detail.characterName`, `CharacterAvatar` com `detail.characterImageUrl`); "Nesta campanha" (`characterForm.campaignSection`): vida atual, energia atual, status (`maxLength={MAX_CHARACTER_STATUS}`), postura (`POSTURES.map` + `posture.{1,2,3}`), token; "Ficha permanente" com `readOnlyField` de `totalLife`/`totalEnergy`/`characterMove` + `characterForm.readOnlyHint` |
| `campaignSheet` | `characterForm.campaignSheetTab` = **"Ficha da Campanha"** (valor alterado) | `MarkdownEditor` (`maxLength={MAX_CAMPAIGN_SHEET}`, `placeholder`, `initialMode="preview"`) para dono/mestre; `MarkdownView` com `emptyText` para `viewer` |
| `sheetFile` | `sheetFile.tab` = "Ficha em arquivo" | arquivo **da campanha**: `SheetFileField` para dono/mestre; para `viewer` (e para quem não pode editar) `SheetFileView` **ou** o aviso de FR-025 |

Títulos: dono/mestre → `characterForm.campaignTitle` = **"Personagem na Campanha"** (nova); `viewer` →
`characterForm.viewTitle` ("Ver Personagem"). `Modal large`; `hidden={pickingToken}`.

### Estado

`tab`, `detail` (`CampaignCharacterDetailInfo | null`), `currentLife`, `currentEnergy`, `characterStatus`,
`posture`, `campaignSheet`, **`campaignSheetFile`** (`SheetFileValue | null`), `uploadingSheet`, `token`,
`pickingToken`, `saving`.

Carregamento (efeito em `[open, participationId, mode]`, com flag `cancelled`):
`getParticipation(editing.participation.campaignCharacterId)` **apenas** — o Modal B **não chama `getCharacter`**,
porque o detalhe já traz nome, foto, totais, movimento e token. Semeia:

```ts
setCampaignSheet(participation.sheet ?? '');
setCampaignSheetFile(participation.sheetFile && participation.sheetFileType
  ? { fileName: participation.sheetFile, url: participation.sheetFileUrl, type: participation.sheetFileType, originalName: null }
  : null);
```

`loading = editing !== null && detail === null`.

### Salvamento

Uma única chamada — `updateParticipation(detail.campaignCharacterId, toCampaignUpdate({ currentLife, currentEnergy,
characterStatus, sheet: campaignSheet, posture, tokenId: token?.tokenId ?? null, sheetFile:
campaignSheetFile?.fileName ?? '' }))` — seguida de `toast.success(t('toast.campaignCharacterUpdated', { name }))`
(nova) e `onOpenChange(false)`.

- Validação antes: `validateVitals({ currentLife, currentEnergy, totalLife: detail.totalLife, totalEnergy:
  detail.totalEnergy })` → em erro `setTab('data')`; `validateCampaignArea({ characterStatus, sheet:
  campaignSheet })` → em erro `setTab(error === 'campaignSheetTooLong' ? 'campaignSheet' : 'data')`.
- `vitalsToSave` (descer o total puxa o valor atual intocado) **vem para cá**, usando
  `before.totalLife`/`before.totalEnergy` do detalhe.
- **Nunca** chama `updateCharacter` → FR-009/FR-010 por construção: o mestre não tem caminho até os dados do
  personagem nesta tela.
- `viewer`: footer só com `common.close` (sem botão de salvar — FR-024), `onSubmit` com early-return,
  `<fieldset disabled>`, sem botão de token.
- **Token**: só "Escolher token" (dono e mestre). **Sem botão "Remover"** — `tokenId: null` significa *mantém* na
  API (pesquisa D7, armadilha 3); remover o token é ação do dono no Modal A, onde `PUT /api/character` grava
  `tokenId: null` de fato.

### FR-025 — campanha sem arquivo

```tsx
{campaignSheetFile?.url && campaignSheetFile.type
  ? <SheetFileView url={campaignSheetFile.url} type={campaignSheetFile.type} />
  : <p className="text-body-secondary">{t('sheetFile.noneCampaign')}</p>}
```

`SheetFileView` **não é alterado** (`url` continua não anulável, sem estado vazio) — o aviso vive no Modal B.

---

## 3. `components/modals/SelectCharacterModal.tsx` — novo lápis (FR-018)

### Props

```ts
interface SelectCharacterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInclude: () => void;
  onTransfer: (character: CharacterInfo) => void;
  onEdit: (character: CharacterInfo) => void;      // NOVA
}
```

### Linha (`.stm-character-actions`)

```tsx
<div className="stm-character-actions">
  {renderActions(character)}
  <button type="button" className="btn btn-sm btn-outline-secondary"
    title={t('selectCharacter.edit', { name: character.name })}
    aria-label={t('selectCharacter.edit', { name: character.name })}
    onClick={() => { onOpenChange(false); onEdit(character); }}>
    <PencilIcon size={14} />
  </button>
  <button type="button" className="btn btn-sm btn-outline-secondary" disabled={busyId === character.characterId}
    title={t('transfer.action')} aria-label={t('transfer.action')}
    onClick={() => { onOpenChange(false); onTransfer(character); }}>
    <TransferIcon size={14} />
  </button>
</div>
```

- `PencilIcon` **já existe** em `components/ui/icons.tsx` (linha ~109, `bi-pencil`) — nenhum ícone novo.
- Convenção: `size={14}` em `btn-sm`; `title` + `aria-label` obrigatórios em botão só com ícone.
- Precedente de layout: `components/campaign/CampaignNpcsTab.tsx:38-43`.
- CSS: `.stm-character-actions` já é `display:flex; align-items:center; gap:.5rem; flex:none`
  (`styles/app.css:564-588`) — **nenhuma mudança de estilo**.
- Padrão "uma janela por vez": fecha este modal antes de abrir o outro, como o botão de transferir já faz.
- O lápis **não** depende do status da participação — o dono edita o personagem mesmo sem campanha.

---

## 4. `components/menu/TopMenu.tsx` — estado do Modal A

```ts
// antes
const [includeOpen, setIncludeOpen] = useState(false);
// depois — padrão "entidade anulável como flag de aberto", já usado por transferring
const [includeOpen, setIncludeOpen] = useState(false);
const [editingCharacter, setEditingCharacter] = useState<CharacterInfo | null>(null);
```

```tsx
<CharacterSelect onManage={() => setManageOpen(true)} onSelectCharacter={() => setSelectOpen(true)}
  onInclude={() => setIncludeOpen(true)} />
<SelectCharacterModal open={selectOpen} onOpenChange={setSelectOpen}
  onInclude={() => setIncludeOpen(true)} onTransfer={setTransferring} onEdit={setEditingCharacter} />
<CharacterFormModal open={includeOpen || editingCharacter !== null}
  onOpenChange={(o) => { if (!o) { setIncludeOpen(false); setEditingCharacter(null); } }}
  character={editingCharacter} />
```

`components/menu/CharacterSelect.tsx` **não muda** (as três ações continuam as mesmas).
O combo **não** ganha ação "Editar personagem" — o usuário escolheu o lápis na lista (Decisão 3 da spec).

---

## 5. `pages/MainPage.tsx` — montagem do Modal B

```ts
// linha 28 — a exportação mudou de arquivo
import type { CharacterEditTarget } from '../components/modals/CampaignCharacterModal';
import { CampaignCharacterModal } from '../components/modals/CampaignCharacterModal';
```
```tsx
// linhas 171-175
<CampaignCharacterModal
  open={editing !== null}
  editing={editing}
  onOpenChange={(o) => { if (!o) setEditing(null); }}
/>
```

`components/map/PartyPanel.tsx` e `components/map/PartyCard.tsx` **não mudam**: `PartyCard` recebe só
`CampaignCharacterInfo` (lista, sem ficha) e a regra de ícone já dá `PencilIcon` para `owner`/`master` e `EyeIcon`
para `viewer`. A cadeia continua `PartyCard.onOpen()` → `PartyPanel.onOpen(member, mode)` → `setEditing({
participation, mode })`.

---

## 6. Tipos e módulos puros

### `types/campaignCharacter.ts`

```ts
export interface CampaignCharacterDetailInfo extends CampaignCharacterInfo {
  /** Sheet of the character in this campaign: a copy of the character's sheet made when they joined (032). */
  sheet: string | null;
  /** The character's own sheet, read-only here (only the owner changes it). */
  characterSheet: string | null;
  characterTokenName: string | null;
  characterTokenImageUrl: string | null;
  /** Stored name ({guid}.{ext}) of this campaign's sheet file; null without one (032). */
  sheetFile: string | null;                       // NOVO
  /** Presigned URL of this campaign's sheet file (032 — was the character's). */
  sheetFileUrl: string | null;                    // comentário alterado
  sheetFileType: SheetFileType | null;            // comentário alterado
}

export interface CampaignCharacterUpdateInfo {
  currentLife: number;
  currentEnergy: number;
  characterStatus: string | null;
  sheet: string | null;
  /** New token of the character (saved on the character); null keeps the current one. */
  tokenId: number | null;
  /** New posture (031); null/omitted keeps the current one. */
  posture?: Posture | null;
  /** Campaign sheet file: a stored name replaces it, '' removes it, null/omitted keeps it (032). */
  sheetFile?: string | null;                      // NOVO
}
```

`types/character.ts` e `types/image.ts` **não mudam**.

### `lib/campaignCharacterForm.ts`

```ts
export const toCampaignUpdate = ({
  currentLife, currentEnergy, characterStatus, sheet,
  tokenId = null, posture = null, sheetFile = null,
}: {
  currentLife: string; currentEnergy: string; characterStatus: string; sheet: string;
  tokenId?: number | null; posture?: Posture | null;
  /** Stored name of the campaign sheet file; '' removes it (032). */
  sheetFile?: string | null;
}): CampaignCharacterUpdateInfo
// corpo: acrescenta sheetFile ao objeto devolvido
```

`PARTICIPATION_MODE`, `participationMode`, `MAX_CHARACTER_STATUS`, `MAX_CAMPAIGN_SHEET`,
`validateCampaignArea`, `CampaignAreaError` **não mudam** (o código de erro continua
`'campaignSheetTooLong'`). `lib/characterForm.ts`, `lib/sheetFile.ts` e `lib/vitals.ts` **não mudam**.

### `Services/` e `Contexts/` — nenhuma alteração

`campaignCharacterService.getById`/`.update` e `imageService.uploadDocument` já transportam os tipos que apenas
ganham campos; `useCharacter`/`CharacterContext` expõem `getParticipation`, `updateParticipation`,
`getCharacter`, `updateCharacter`, `createCharacter` sem mudança de assinatura. `updateParticipation` continua
fazendo `run(..., false)` + `refreshParty()`. **Nenhum provider novo, nenhuma mudança em `main.tsx`.**

---

## 7. i18n — `frontend/src/i18n/locales/pt-BR.json` (única locale)

| Chave | Ação | Valor |
|---|---|---|
| `characterForm.campaignSheetTab` | valor alterado | `"Ficha da Campanha"` |
| `characterForm.campaignSheetHint` | valor reescrito | `"É a ficha do personagem nesta campanha: começou como cópia da ficha dele quando entrou e só vale aqui. A ficha original não muda."` |
| `characterForm.campaignSheetPlaceholder` | valor reescrito | `"Ex.: # Thorin\n\nForça 5, espada longa, armadura de couro."` |
| `characterForm.campaignSheetEmpty` | valor alterado | `"Sem ficha nesta campanha."` |
| `characterForm.errors.campaignSheetTooLong` | valor alterado | `"A ficha da campanha pode ter no máximo 20.000 caracteres."` |
| `characterForm.campaignTitle` | **nova** | `"Personagem na Campanha"` |
| `selectCharacter.edit` | **nova** | `"Editar {{name}}"` |
| `sheetFile.noneCampaign` | **nova** | `"Não há ficha em arquivo nesta campanha."` |
| `toast.campaignCharacterUpdated` | **nova** | `"{{name}} atualizado nesta campanha."` |

Inalteradas e reutilizadas: `characterForm.{dataTab,sheetTab,name,image,life,energy,move,sheet,sheetHint,
editTitle,viewTitle,characterStatus,token,noToken,chooseToken,tokenHint,readOnlyHint,emptySheet,campaignSection,
currentLife,currentEnergy,permanentSection,permanentHint,vitalsHint}` · `characterForm.removeToken` (passa a ser
usada **só** pelo Modal A) · `sheetFile.{tab,hint,choose,replace,remove,current,image,pdf,uploading,imageAlt,
openFullSize,openPdf,errors.*}` · `posture.*` · `party.*` · `common.*`.

Nenhum bloco é renomeado ou movido: `characterForm.*` é lido também por `components/ui/ImageCropper.tsx`
(`zoom`, `cropHint`, `changeImage`, `chooseImage`, `removeImage`), e as chaves são identificadores estáveis.
Textos novos seguem a skill `add-react-i18n` (locale única, sem hardcoded em componente).

---

## 8. Fluxos ponta a ponta (aceitação)

**US1 — cópia na entrada**: dono cria personagem com ficha e PDF → `POST /api/character` (+ `requestAccess` se há
campanha) → backend `ResetFrom` copia `sheet` e `sheet_file` → dono altera a ficha original pelo Modal A →
reabre o Modal B na campanha → ficha da campanha continua a antiga.

**US2 — mestre edita a cópia**: mestre clica no lápis do `PartyCard` → Modal B → aba "Ficha da Campanha" edita o
markdown, aba "Ficha em arquivo" usa `SheetFileField` (`POST /api/document` → `fileName`) → Salvar →
`PUT /api/campaigncharacter/{id}` com `sheet` e `sheetFile` → `toast.campaignCharacterUpdated`. O dono abre o
Modal A e confirma que `sheet`/`sheetFile` originais não mudaram.

**US3 — dono edita a original**: combo do personagem → "Selecionar Personagem" → lápis → Modal A em modo edição →
altera nome/ficha/arquivo → Salvar → `PUT /api/character/{id}` → `toast.characterUpdated`. Nenhuma participação
alterada (exceto `ClampVitalsAsync` se um total desceu).

**US4 — tela da campanha mostra a cópia**: com original `"Força 3"` e campanha `"Força 5"`, mestre, dono e
`viewer` abrem o Modal B e veem `"Força 5"`; a ficha original não aparece em nenhuma aba. Campanha sem arquivo →
`sheetFile.noneCampaign`, mesmo que o personagem tenha.

**US5 — independência**: mesmo personagem em duas campanhas; alterar a campanha A não toca B nem a original;
remover e reaprovar refaz a cópia (`ResetFrom`).

---

## 9. Verificações de regressão no frontend

- [ ] Criar personagem pelo combo continua entrando na campanha atual e escolhendo o personagem novo quando aprovado.
- [ ] Editar o personagem **não** apaga o token nem o arquivo (armadilha 1 de D7).
- [ ] `viewer` continua sem botão de salvar e com as duas áreas de ficha em leitura.
- [ ] O lápis do `PartyCard` continua abrindo o modal da campanha (não o do personagem).
- [ ] Arrastar o card para o mapa continua funcionando (`PARTICIPATION_DRAG_TYPE`, `characterDropAction`).
- [ ] `TokenModal` continua abrindo por cima dos dois modais com `hidden` (uma janela visível por vez).
- [ ] Markdown continua sanitizado em toda renderização de ficha (`MarkdownEditor`/`MarkdownView` com `rehype-sanitize`).
- [ ] `npm run lint` e `npm test` limpos; `npm run build` sem erro de tipo.
