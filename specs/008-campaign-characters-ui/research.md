# Research: Personagens na Campanha

## R1. Lacunas do backend e como fechar

A feature 005 criou `CampaignCharacter` com convite/pedido/aprovação, mas faltam quatro capacidades
(spec, Assumptions). Nenhuma exige entidade ou migration nova.

| Necessidade | Decisão | Alternativa descartada |
|---|---|---|
| Buscar personagens de todos os usuários (convite) | `GET /api/character/search?page&pageSize&search` → `PagedList<CharacterSearchInfo>` (`characterId`, `name`, `imageUrl`, `ownerId`, `ownerName`); só campos públicos, nunca ficha/vida | Reusar `CharacterInfo` — exporia a ficha e demais atributos de outros usuários |
| GM remover um personagem da campanha | `DELETE /api/campaigncharacter/{id}` (só o mestre; qualquer status) → 204; apaga só a linha de `campaign_characters` | Novo status "Removido" — mais estados/transições sem ganho; a spec diz "excluir na campanha" |
| Jogador ver o status dos próprios personagens | `GET /api/campaigncharacter/mine?campaignId=` → participações (qualquer status) dos personagens do usuário naquela campanha | Afrouxar `GET /api/campaign/{id}/character` — mudaria a regra de privacidade da 005 (não aprovados veriam a campanha inteira) |
| GM incluir o próprio personagem já aprovado | `RequestAccessAsync`: quando quem pede é o mestre da campanha, cria já `Approved` (mesma regra da campanha aberta: `CampaignCharacter.RequestAccess(..., autoApprove: campaign.Open \|\| isMaster)`) | Convidar + aceitar em duas chamadas — duas requisições e estado intermediário visível |

- Mapeamento, DI e testes seguem a skill `dotnet-architecture` (métodos novos em
  `ICharacterRepository`/`ICampaignCharacterRepository`, services, controllers; testes em
  `CharacterServiceTests` e `CampaignCharacterServiceTests`).
- `search` usa `ILike` por nome, ordenado por nome, como `TokenRepository.ListPagedAsync`; nomes dos
  donos em lote via `IUserRepository.ListByIdsAsync` (sem N+1).
- A rota `search` não conflita com `{id:long}` (restrição de tipo).

## R2. O combo "Personagem atual" (não fake)

- **Decision**: `@radix-ui/react-dropdown-menu` (já instalado na 007) com aparência de select:
  gatilho no mesmo formato do `FakeSelect` (legenda + valor + seta) e conteúdo com
  `DropdownMenu.RadioGroup` para "Mestre (GM)" + personagens (marca o atual), `Separator` e `Item`s de
  ação ("Gerenciar Personagens", "Selecionar Personagem", "Incluir Personagem").
- **Rationale**: um `<select>` nativo não comporta ações abaixo das opções (Q2 = A); o Radix dá
  teclado, Esc, clique fora e ARIA (`menuitemradio`), e já é o padrão do `UserMenu`.
- **Alternatives considered**: `<select>` + botões fora (contraria Q2); combobox próprio.

## R3. Estado no frontend

- **Decision**: um novo `CharacterContext` (skill `react-architecture`: Types → Service → Context →
  Hook → Provider), entre `CampaignProvider` e `MapEditorProvider`. Guarda:
  - `myCharacters` (todos os personagens do usuário), `myParticipations` (da campanha atual),
    `currentSelection` (`'gm' | characterId | null`), `invites` (convites pendentes);
  - ações: `refresh`, `select`, `createCharacter` (cria + inclui/pede acesso), `requestAccess`,
    `acceptInvite`, `declineInvite`, e as do GM (`listCampaignCharacters`, `approve`, `deny`,
    `remove`, `invite`, `searchCharacters`).
- **Rationale**: combo, modais e sino leem o mesmo estado; aceitar um convite no sino precisa
  atualizar o combo sem prop drilling.
- **Alternatives considered**: estender o `CampaignContext` (ficaria grande e com duas
  responsabilidades); um contexto só para notificações (duplicaria o recarregamento após aceitar).

## R4. Regras puras (testáveis)

- **Decision**: `lib/characterSelection.ts`:
  - `buildCharacterOptions({ isMaster, myCharacters, myParticipations })` → `[{ key: 'gm' }, …
    personagens próprios Approved]` (Q1 = A);
  - `resolveSelection(stored, options)` → a escolha guardada se ainda existir, senão a primeira opção,
    senão `null` ("Nenhum personagem");
  - `participationAction(status | undefined)` → `'request' | 'respondInvite' | 'waitInvite' | 'use'`
    (tela "Selecionar Personagem", FR-014);
  - `inviteAction(status | undefined)` → `'invite' | 'status'` (aba de convite, FR-011: fora ou
    Recusado → convidar).
  Testados com Vitest, como `draft.ts`/`hexGrid.ts`.

## R5. Persistência da escolha

- **Decision**: localStorage `roll6:character` com um objeto
  `{ [campaignId]: 'gm' | characterId }`; lido ao trocar de campanha e resolvido por `resolveSelection`.
  Removido no `logout()` junto com as outras chaves.
- **Rationale**: FR-004 (por campanha, neste navegador); é preferência de UI, não dado de servidor.

## R6. Notificações

- **Decision**: `GET /api/campaigncharacter/invites` (já existe) ao autenticar, ao abrir o submenu,
  após cada ação e a cada 60 s (`setInterval` no `CharacterContext`, parado sem sessão e com a aba
  oculta via `document.visibilityState`). O sino é outro `DropdownMenu` com ícone SVG inline e badge
  Bootstrap (`badge rounded-pill text-bg-danger`); cada convite tem "Aceitar"/"Recusar" como botões
  dentro do item (`onSelect` com `preventDefault` para o menu não fechar a cada ação).
- **Rationale**: FR-020/SC-003 sem WebSocket (fora do escopo "simple").
- **Alternatives considered**: SignalR/SSE — infraestrutura nova para um contador.

## R7. Confirmação de exclusão e avatar

- **Decision**: `components/ui/ConfirmModal.tsx` genérico (título, mensagem, botão de perigo) sobre o
  `Modal` base; `components/ui/CharacterAvatar.tsx` (imagem redonda ou inicial do nome). O cadastro
  reaproveita `imageService.upload` (`POST /api/image`) antes do `POST /api/character`.
- **Nota**: o `ConfirmModal` abre por cima do `ManageCharactersModal` (dois Radix Dialogs aninhados
  são suportados).
