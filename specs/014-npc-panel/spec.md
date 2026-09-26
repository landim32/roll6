# Feature Specification: Painel de NPCs

**Feature Branch**: `014-npc-panel`
**Created**: 2026-09-26
**Status**: Draft
**Input**: User description: "agora crie no frontend uma área de npcs igual a área de personagens mas do lado oposto. No fim da lista coloque um botão para incluir npcs, aparece apenas para o gm"

> Contexto: a **área de personagens** (feature 009) é o painel fixo e recolhível à esquerda do mapa, com
> um card por personagem aprovado (foto redonda, nome, barras de vida/energia) e, para o mestre, cards
> arrastáveis para o mapa (feature 011). Os NPCs já existem no backend (feature 013): biblioteca do
> mestre, NPCs da campanha e ocorrências de NPC nos mapas.

## Clarifications

### Session 2026-09-26

- Q: O painel lista os NPCs da campanha ou as ocorrências do mapa aberto? → A: os NPCs da campanha; o
  painel aparece só para o mestre, os cards mostram vida e energia base do NPC e cada arraste para o mapa
  cria uma nova peça. Os jogadores veem apenas as peças no mapa.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver os NPCs num painel à direita (Priority: P1)

Na tela do mapa, um painel fixo e compacto no lado direito — espelho da área de personagens — mostra um
card por NPC da campanha atual, visível apenas ao mestre. Cada card tem imagem redonda (ou inicial), nome e
barras de vida e energia. O painel pode ser recolhido e lembra essa escolha.

**Why this priority**: o mestre precisa ter os NPCs à mão durante a sessão, assim como os personagens.

**Independent Test**: com NPCs na campanha, abrir o mapa como mestre e ver o painel à direita com um card
por NPC; recolher, recarregar e continuar recolhido.

**Acceptance Scenarios**:

1. **Given** uma campanha atual com NPCs, **When** o mestre está no mapa, **Then** vê o painel no lado
   direito, com um card por NPC (imagem ou inicial, nome, barras de vida e energia).
2. **Given** o painel aberto, **When** o mestre o recolhe, **Then** ele vira uma aba estreita na borda
   direita e a escolha é lembrada ao recarregar.
3. **Given** o painel de personagens e o de NPCs abertos, **When** a tela é exibida, **Then** nenhum dos
   dois cobre o outro, o menu, os controles do mapa ou o rodapé.
4. **Given** muitos NPCs, **When** a lista passa da altura disponível, **Then** o painel rola por dentro.
5. **Given** nenhuma campanha selecionada, **When** o usuário está no mapa, **Then** o painel não aparece.
6. **Given** um jogador (não mestre), **When** está no mapa, **Then** o painel de NPCs não aparece; ele
   vê só as peças de NPC no mapa.
7. **Given** um NPC com vida 7 e energia 2, **When** o card é exibido, **Then** as barras mostram os
   valores base do NPC (cheias, "7/7" e "2/2").

---

### User Story 2 - Incluir NPCs pelo fim da lista (Priority: P1)

No fim da lista de NPCs há um botão "Incluir NPC", visível apenas ao mestre. Ele abre uma janela para
escolher um NPC da biblioteca do mestre ou cadastrar um novo (nome, imagem, token obrigatório, vida,
energia, movimento, ficha); o NPC escolhido ou criado entra na campanha e aparece no painel.

**Why this priority**: é como o mestre povoa a campanha de NPCs.

**Independent Test**: como mestre, clicar em "Incluir NPC", cadastrar um "Goblin" com token e ver o card
no painel; como jogador, confirmar que o botão não aparece.

**Acceptance Scenarios**:

1. **Given** o mestre no mapa, **When** olha o fim da lista de NPCs, **Then** vê o botão "Incluir NPC"
   (mesmo com a lista vazia).
2. **Given** um jogador, **When** olha a tela, **Then** não vê o botão "Incluir NPC".
3. **Given** a janela de inclusão, **When** o mestre escolhe um NPC da sua biblioteca, **Then** ele entra
   na campanha, a janela fecha e o card aparece no painel.
4. **Given** a janela de inclusão, **When** o mestre cadastra um NPC novo com os dados válidos e um token,
   **Then** o NPC é criado na biblioteca, entra na campanha e aparece no painel.
5. **Given** um NPC que já está na campanha, **When** o mestre tenta incluí-lo de novo, **Then** um aviso
   informa que ele já está na campanha.
6. **Given** o cadastro sem nome ou sem token, **When** o mestre tenta salvar, **Then** um aviso informa o
   campo faltante e nada é salvo.

---

### User Story 3 - Levar um NPC para o mapa e editá-lo (Priority: P2)

Como nos personagens, o mestre arrasta o card de um NPC para um hex livre do mapa aberto e uma peça do
NPC aparece ali (cada arraste cria uma nova ocorrência: dois goblins são duas peças). O lápis do card
abre o cadastro do NPC para edição, com a opção de retirá-lo da campanha.

**Why this priority**: completa o uso em jogo; o painel já tem valor sem isso.

**Independent Test**: arrastar o "Goblin" duas vezes para hexes livres e ver duas peças; editar a vida
base do NPC pelo lápis; retirar o NPC da campanha e ver o card e as peças sumirem.

**Acceptance Scenarios**:

1. **Given** o mestre e um mapa da campanha aberto, **When** solta o card de um NPC num hex livre,
   **Then** uma peça do NPC (com o token dele) aparece no hex.
2. **Given** o mesmo NPC, **When** é solto de novo em outro hex livre, **Then** aparece mais uma peça.
3. **Given** um hex ocupado ou fora da grid, **When** o card é solto, **Then** um aviso informa que o hex
   precisa estar livre e nada muda.
4. **Given** o lápis de um card, **When** o mestre clica, **Then** abre o cadastro do NPC preenchido;
   salvar atualiza o card.
5. **Given** o cadastro aberto pelo lápis, **When** o mestre escolhe "Retirar da campanha" e confirma,
   **Then** o card some do painel e as peças desse NPC saem dos mapas da campanha.

---

### Edge Cases

- Troca de campanha: o painel passa a mostrar os NPCs da nova campanha.
- Tela estreita: os dois painéis continuam compactos e recolhíveis, sem se sobrepor.
- NPC sem imagem: card com a inicial do nome.
- Mapa aberto fora de uma campanha (modelo): arrastar NPCs não está disponível.
- Erro ao incluir/salvar: aviso com o motivo; nada muda no painel.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A tela do mapa MUST exibir um painel de NPCs fixo no lado direito, com o mesmo formato
  compacto e recolhível do painel de personagens (card com imagem redonda ou inicial, nome, barras de
  vida e energia), lembrando o estado recolhido neste navegador.
- **FR-002**: O painel MUST listar os NPCs da campanha atual e MUST aparecer apenas para o mestre; as
  barras mostram vida e energia base de cada NPC.
- **FR-003**: No fim da lista MUST existir o botão "Incluir NPC", visível apenas ao mestre da campanha
  atual.
- **FR-004**: "Incluir NPC" MUST permitir escolher um NPC da biblioteca do mestre ou cadastrar um novo
  (nome e token obrigatórios; vida, energia, movimento ≥ 0; ficha; imagem opcional), e em ambos os casos
  incluí-lo na campanha.
- **FR-005**: O mestre MUST poder arrastar um card de NPC para um hex livre do mapa da campanha aberto,
  criando uma nova peça do NPC a cada soltura.
- **FR-006**: O lápis do card MUST abrir o cadastro do NPC para edição, com a ação "Retirar da campanha"
  (com confirmação).
- **FR-007**: Os dois painéis MUST NOT se sobrepor nem cobrir menu, controles do mapa e rodapé.
- **FR-008**: Todo sucesso ou erro MUST ser comunicado por aviso (toast); textos em pt-BR.

### Key Entities

- **NPC** (existente): nome, imagem, token, vida, energia, movimento, ficha; da biblioteca do mestre.
- **NPC da campanha** (existente): NPC disponível na campanha.
- **NPC do mapa** (existente): ocorrência de um NPC num mapa, com peça, vida, energia e status próprios.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O mestre vê todos os NPCs da mesa sem abrir janelas (0 cliques).
- **SC-002**: Incluir um NPC já cadastrado na campanha leva no máximo 3 cliques (Incluir NPC → NPC →
  confirmar).
- **SC-003**: Colocar um NPC no mapa leva 1 gesto (arrastar e soltar).
- **SC-004**: Com os dois painéis abertos, pelo menos 70% da área do mapa continua visível numa tela de
  1366 × 768.
- **SC-005**: 0 jogadores veem o painel de NPCs ou o botão "Incluir NPC".

## Assumptions

- Esta feature é só frontend e usa o que o backend da feature 013 já oferece.
- A janela "Incluir NPC" segue o padrão das outras (abas "Meus NPCs" e "Novo NPC"); a imagem do NPC usa o
  recorte redondo da foto de personagem e o token é escolhido pelo modal de tokens.
- Os valores de vida/energia das ocorrências no mapa (NPCs caídos, status) continuam sendo editados pela
  peça no mapa numa feature futura; esta feature não inclui a edição por ocorrência.
