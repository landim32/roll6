# Research: Status e Ficha do Personagem por Campanha

Não havia `NEEDS CLARIFICATION` no contexto técnico; as decisões abaixo resolvem pontos de desenho.

## R1 — Nome do campo de status na participação

- **Decision**: propriedade `CharacterStatus` (coluna `character_status`, JSON `characterStatus`).
- **Rationale**: `CampaignCharacter.Status` já é a situação da participação (enum
  Invited/RequestedAccess/Approved/Denied, JSON `status`). Reaproveitar o nome quebraria o contrato e
  confundiria os dois conceitos.
- **Alternatives**: `Condition` (termo de RPG, mas diverge do "Status" que o usuário usa na tela);
  renomear o enum para `Situation` (mudança grande e sem ganho).

## R2 — Como a participação recebe a cópia

- **Decision**: os métodos de entrada de `CampaignCharacter` (`RequestAccess`, `CreateInvite`,
  `Invite`, `AcceptInvite`, `ApproveRequest`) passam a receber o `Character` em vez de
  `(totalLife, totalEnergy)`. O `Join`/`Create` privado copia `Life`, `Energy`, `Sheet` e zera
  `CharacterStatus` num só lugar.
- **Rationale**: a regra "ao entrar, reinicia" fica inteira no modelo (FR-003), e a assinatura não
  cresce a cada campo novo.
- **Alternatives**: mais parâmetros (`sheet`) — frágil; copiar no service — espalha a regra.

## R3 — Ficha fora do polling do painel

- **Decision**: `CampaignCharacterInfo` (listas, polling de 15 s) ganha só `characterStatus` e
  `characterMove`; a ficha vem apenas em `CampaignCharacterDetailInfo`, em
  `GET /api/campaigncharacter/{id}`, carregado ao abrir o modal.
- **Rationale**: até 20 000 caracteres por personagem × 12 personagens a cada 15 s seriam centenas de
  KB desnecessários.
- **Alternatives**: ficha em todas as listas — simples, mas pesado; endpoint só da ficha — um DTO a
  mais sem necessidade.

## R4 — Um endpoint de atualização da participação

- **Decision**: `PUT /api/campaigncharacter/{id}` com `CampaignCharacterUpdateInfo`
  (`currentLife`, `currentEnergy`, `characterStatus`, `sheet`) → `CampaignCharacter.UpdatePlay(...)`,
  que valida (Approved, atuais ≤ totais, status ≤ 260, ficha ≤ 20 000). Remove
  `PUT /api/campaigncharacter/{id}/vitals` e `CampaignCharacterVitalsInfo`.
- **Rationale**: o modal salva a área "Nesta campanha" inteira num salvamento; o frontend é o único
  cliente, então não há compatibilidade a manter.
- **Alternatives**: manter `/vitals` e criar `/sheet` — duas chamadas por salvamento e duas regras de
  permissão iguais.

## R5 — Permissões

- **Decision**:
  - `GET`/`PUT /api/character/{id}`: só o dono (volta ao `GetOwnedAsync`; remove
    `IsApprovedInCampaignOfAsync`, que só servia para isso).
  - `PUT /api/campaigncharacter/{id}`: dono do personagem ou mestre da campanha; participação Approved
    (409 caso contrário, regra do modelo).
  - `GET /api/campaigncharacter/{id}`: mestre da campanha, dono do personagem ou qualquer usuário com
    personagem Approved na campanha (mesma regra de `GET /api/campaign/{id}/character`).
- **Rationale**: FR-006 a FR-010 e o esclarecimento "os outros jogadores podem ver tudo, só não
  podem alterar".
- **Alternatives**: deixar o mestre ler o personagem original — desnecessário, já que o modal do
  mestre usa o detalhe da participação (nome, imagem, totais, movimento vêm nele).

## R6 — O que não-donos veem no modal

- **Decision**: mestre (não dono) e participantes veem os dados do personagem vindos do detalhe
  (nome, imagem, vida/energia totais, movimento) e a ficha **da campanha**; a ficha original não
  aparece para eles.
- **Rationale**: a ficha da campanha é a que vale na mesa; ler a original exigiria reabrir
  `GET /api/character/{id}` a não-donos.
- **Alternatives**: expor a ficha original no detalhe — mais dados sem uso claro.

## R7 — Modos do modal

- **Decision**: `CharacterFormModal` mantém inclusão e ganha o alvo `{ participation, mode }`, com
  `mode` = `owner` | `master` | `viewer`, calculado por `lib/campaignCharacterForm.ts`
  (`participationMode(isMaster, isOwner)`: dono vence mestre). Abas: **Dados**, **Ficha** (só dono)
  e **Ficha da campanha**.
  - `owner`: campos do personagem + área "Nesta campanha" editáveis; salva `PUT /api/character/{id}` e
    depois `PUT /api/campaigncharacter/{id}`; valida tudo antes da primeira chamada.
  - `master`: dados do personagem só leitura; salva só a participação.
  - `viewer`: tudo só leitura, sem Salvar (botão "Fechar").
  - A ficha só leitura usa `components/ui/MarkdownView` (`MDEditor.Markdown` + `rehype-sanitize`,
    lazy como o editor).
- **Rationale**: um só modal mantém o visual e o fluxo da 009; as regras puras ficam testáveis.
- **Alternatives**: um modal novo só da participação — duplicaria layout de imagem/barras/fichas.

## R8 — Migração dos dados

- **Decision**: migration `MoveCharacterStatusToCampaign`: adiciona `character_status` e `sheet`
  (nulláveis) em `campaign_characters`; `UPDATE … FROM characters` copia `status` e `sheet` para
  todas as participações; remove `characters.status`. `Down`: recria `characters.status`, copia de
  volta o status de uma participação (a mais recente) e remove as colunas novas.
- **Rationale**: FR-005/SC-004 — nenhum status se perde.
- **Alternatives**: copiar só para participações Approved — as outras seriam reiniciadas na aprovação
  de qualquer forma, mas copiar para todas é mais simples e não perde nada.
