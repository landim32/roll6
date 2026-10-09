# Feature Specification: Jogadores só abrem o mapa atual da campanha

**Feature Branch**: `039-player-current-map-only`  
**Created**: 2026-10-08  
**Status**: Draft  
**Input**: User description: "https://github.com/landim32/roll6/issues/34" — *Jogadores só podem abrir o mapa atual da campanha (redirecionar para o atual).*

## Contexto

Desde a mesa em tempo real (017), o jogador vai para o mapa atual da campanha quando entra nela e acompanha cada troca feita pelo mestre. Mas, entre uma troca e outra, ele ainda consegue abrir **outros mapas da campanha** no site: por um link direto do mapa, pela lista "Mapas da campanha", pelo seletor da mesa ou porque o site lembrou o último mapa aberto. Isso deixa o jogador ver na tela lugares que o mestre ainda não revelou: a próxima masmorra, onde estão os inimigos, o mapa do chefe.

A issue pede que o jogador veja **só o mapa atual** e seja levado a ele quando tentar abrir outro. O mestre continua livre. A mudança é na **visualização do site**, mais um ajuste no canal em tempo real: as peças e os NPCs de mapas que não são o atual deixam de ser enviados aos jogadores. As regras de negócio, as permissões das leituras e ações e as ferramentas de assistentes de IA continuam como estão.

## Clarifications

### Session 2026-10-08

- Q: As ações do jogador presas a um mapa (colocar/mover peça, postura, agir, desfazer) também ficam restritas ao mapa atual? → A: Não — as ações continuam com as regras de hoje.
- Q: O servidor também deve restringir os mapas não atuais para jogadores? → A: Não — leituras, ações, permissões e as ferramentas de assistentes de IA não mudam; a regra é de visualização no site.
- Q: Os eventos em tempo real de peças/NPCs de mapas não atuais continuam indo para todos? → A: Não — jogadores só recebem eventos de peças/NPCs do mapa atual; os de outros mapas vão só para o mestre.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - O jogador sempre cai no mapa atual (Priority: P1)

Um jogador aprovado abre o link de um mapa da campanha que não é o atual, ou recarrega a página com outro mapa lembrado. Em vez de ver esse mapa, ele é levado ao mapa atual da campanha, o endereço passa a ser o do mapa atual e um aviso explica: "Apenas o mapa atual da campanha pode ser aberto".

**Why this priority**: é o pedido central da issue e o caminho mais comum de vazamento (link compartilhado, mapa lembrado).

**Independent Test**: com uma campanha de dois mapas, A atual e B não atual, um jogador abre o link de B. Ele vê A, o endereço mostra A e aparece o aviso. Depois de recarregar com B lembrado, ele também vê A.

**Acceptance Scenarios**:

1. **Given** um jogador aprovado e a campanha com o mapa A como atual, **When** ele abre o link do mapa B da mesma campanha, **Then** vê o mapa A, o endereço passa a ser o de A (sem criar uma entrada nova no histórico) e aparece o aviso "Apenas o mapa atual da campanha pode ser aberto".
2. **Given** o site lembrando o mapa B para esse jogador, **When** ele entra no site ou recarrega a página, **Then** abre o mapa A, sem aviso, e passa a lembrar A.
3. **Given** o jogador no mapa A, **When** o mestre torna B o mapa atual, **Then** o jogador passa para B na hora, como hoje.
4. **Given** um jogador que abriu o link de B, **When** a campanha não tem mapa atual, **Then** ele não vê nenhum mapa, fica na página da campanha e vê a mensagem "O mestre ainda não escolheu um mapa".
5. **Given** o mestre da campanha, **When** ele abre o link de B, **Then** B abre normalmente e passa a ser o mapa atual, como hoje.

---

### User Story 2 - As listas só oferecem o mapa atual ao jogador (Priority: P2)

Nos lugares onde o jogador escolhe um mapa (a lista "Mapas da campanha", a linha do mapa no seletor da mesa e o atalho "Mapas…"), ele só encontra o mapa atual. Os outros mapas da campanha não aparecem.

**Why this priority**: evita que o jogador clique num mapa só para ser mandado de volta, e não mostra nem os nomes dos mapas que o mestre ainda não revelou.

**Independent Test**: como jogador, abrir "Mapas da campanha" e o seletor da mesa. Só o mapa atual aparece. Como mestre, todos aparecem.

**Acceptance Scenarios**:

1. **Given** um jogador aprovado, **When** abre a lista "Mapas da campanha", **Then** vê só o mapa atual (ou uma mensagem de que o mestre ainda não escolheu um mapa).
2. **Given** um jogador, **When** abre o seletor da mesa, **Then** a linha de mapa da campanha mostra só o mapa atual, como hoje.
3. **Given** o mestre, **When** abre as mesmas listas, **Then** vê todos os mapas da campanha, como hoje.
4. **Given** um jogador, **When** procura mapas na biblioteca ("Buscar mapas", "Meus mapas"), **Then** a biblioteca de modelos de mapa continua como hoje, porque ela não é a campanha e não mostra peças nem NPCs.

---

### Edge Cases

- **Campanha sem mapa atual:** o jogador não vê mapa nenhum e recebe a mensagem "O mestre ainda não escolheu um mapa", e a lista "Mapas da campanha" fica vazia com essa mesma mensagem.
- **O mestre troca o mapa atual enquanto o jogador está na mesa:** o jogador segue a troca na hora. Um mapa antigo que ainda estava carregando não pode tomar o lugar do novo.
- **Eventos em tempo real de outros mapas** (por exemplo, o mestre preparando peças no próximo mapa): chegam só ao mestre. O jogador recebe só os eventos de peças e NPCs do mapa atual. Os avisos sem mapa específico, como "recarregar as peças de todos os mapas", continuam indo a todos, porque o jogador só recarrega o mapa atual.
- **O mestre troca o mapa atual:** a partir da troca, os eventos do novo mapa atual passam a chegar aos jogadores, que recarregam o mapa novo ao segui-lo. Nada do mapa anterior precisa ser reenviado.
- **O mapa atual é apagado:** a campanha fica sem mapa atual e vale o caso anterior.
- **Alterações não salvas:** jogadores não editam mapas da campanha. A regra de não perder alterações continua só para o mestre, e para o jogador a troca acontece sem perguntar.
- **Jogador que é mestre de outra campanha:** a regra é por campanha. Ele tem liberdade total só na campanha em que é mestre.
- **Usuário que não participa da campanha:** continua recebendo a mesma mensagem de hoje (sem permissão ou não encontrado), sem passar a ser redirecionado.
- **Mapa de outra campanha:** a regra não muda nada. O jogador só abre mapas das campanhas em que tem permissão, como hoje.
- **Mapa aberto fora de uma campanha** (modelo da biblioteca, em "Meus mapas" ou "Buscar mapas"): não é afetado.
- **Histórico de turnos e narração:** resumos e históricos de turnos passados que citam posições em outro mapa continuam como estão, porque são texto e não abrem o mapa.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: No site, para quem não é mestre da campanha, o único mapa da campanha que MUST poder ser aberto é o mapa atual.
- **FR-002**: Quando um jogador tentar abrir pelo link um mapa da campanha que não é o atual, o site MUST abrir o mapa atual, substituir o endereço pelo do mapa atual (sem nova entrada no histórico) e mostrar o aviso "Apenas o mapa atual da campanha pode ser aberto".
- **FR-003**: Ao entrar no site ou recarregar a página, se o mapa lembrado não for o atual da campanha do jogador, o site MUST abrir o mapa atual sem aviso.
- **FR-004**: Quando a campanha não tiver mapa atual, o jogador MUST ficar sem mapa aberto, na página da campanha, com a mensagem "O mestre ainda não escolheu um mapa".
- **FR-005**: Quando o mestre trocar o mapa atual, o jogador MUST passar para o novo mapa imediatamente, sempre. Deixa de existir a possibilidade de o jogador continuar num outro mapa até a próxima troca.
- **FR-006**: As listas de mapas da campanha mostradas ao jogador no site MUST conter só o mapa atual, com o filtro feito na tela. A biblioteca de modelos de mapa não muda.
- **FR-007**: O mestre MUST continuar podendo abrir qualquer mapa da campanha no site. Ao abrir um mapa da campanha, esse mapa continua virando o atual.
- **FR-008**: Jogadores MUST NOT receber nenhuma pergunta sobre alterações não salvas ao serem levados ao mapa atual.
- **FR-009**: As regras de negócio e as permissões do servidor MUST NOT mudar. Leituras, ações dos jogadores e as ferramentas de assistentes de IA continuam exatamente como hoje.
- **FR-010**: Os eventos em tempo real sobre peças e NPCs de um mapa específico (peça criada, alterada, movida ou removida, e as peças desse mapa recarregadas) MUST ir a todos da campanha quando o mapa for o atual, e **só ao mestre** quando não for. Eventos sem mapa específico e os demais tipos de evento (grupo, turno, campanha, troca de mapa atual) continuam indo a todos, como hoje.

### Key Entities

- **Campanha**: o **mapa atual** já existe e passa a ser o único mapa da campanha visível para os jogadores.
- **Mapa da campanha**: no site, só o mestre o vê quando não é o atual. Nenhum dado muda.
- **Participante aprovado (jogador)**: no site, vê só o mapa atual da campanha.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% das tentativas no site (link, mapa lembrado, listas e menus), um jogador não consegue ver um mapa da campanha que não seja o atual.
- **SC-002**: Um jogador que abre o link de um mapa não atual está vendo o mapa atual em até 2 segundos, com o aviso.
- **SC-003**: Quando o mestre troca o mapa atual, 100% dos jogadores conectados passam para o novo mapa sem nenhuma ação.
- **SC-004**: O mestre continua abrindo qualquer mapa da campanha sem nenhuma recusa ou redirecionamento nova (0 regressões nos fluxos do mestre).
- **SC-005**: Sem mapa atual, 100% dos jogadores veem a mensagem "O mestre ainda não escolheu um mapa" em vez de um mapa qualquer.
- **SC-006**: Nenhuma resposta de leitura ou ação do servidor e nenhuma ferramenta de assistente de IA muda de comportamento.
- **SC-007**: Em 100% das alterações de peças ou NPCs feitas pelo mestre num mapa que não é o atual, nenhum jogador conectado recebe esse evento.

## Assumptions

- **Mestre** é o dono da campanha. Todo outro usuário com acesso à campanha é tratado como jogador, mesmo que seja mestre de outras campanhas.
- **Visualização + tempo real** (confirmado em Clarifications): no site, a regra é de visualização. Um jogador que chame o servidor diretamente ou use um assistente de IA ainda consegue ler outros mapas, e isso é aceito. O canal em tempo real deixa de enviar a ele as peças e os NPCs dos mapas não atuais. O site sabe para onde redirecionar porque já conhece o mapa atual da campanha.
- **Biblioteca de modelos de mapa:** continua pública aos usuários logados, como hoje. Ela traz só a imagem e a grade, sem peças, NPCs nem o mapa da campanha, e já é pesquisável por todos.
- **Seletor da mesa:** já mostra só o mapa atual de cada campanha, então não precisa mudar.
- **Dados de turno:** leituras de turno, resumo e narração continuam como estão, porque já usam o mapa atual ou são texto histórico.
- **Mapas restaurados:** a lembrança do último mapa aberto continua existindo. Para o jogador, ela só é respeitada quando aponta para o mapa atual.
