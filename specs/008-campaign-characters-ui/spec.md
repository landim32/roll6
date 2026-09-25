# Feature Specification: Personagens na Campanha (combo, gerenciar, selecionar, incluir e convites)

**Feature Branch**: `008-campaign-characters-ui`
**Created**: 2026-09-25
**Status**: Clarified
**Input**: User description: "No frontend, preciso que crie a parte dos characters: outro combo (não fake, deve abrir); se for o GM, opção de selecionar o GM; personagens na campanha aparecem na lista; menu 'Gerenciar Personagens' só para o GM, modal com abas 'Personagens na Campanha' (status, Aprovar, Declinar, Excluir com confirmação — exclui da campanha, não o personagem) e 'Convidar Personagens' (busca, foto, nome do proprietário, botão convidar); menu 'Selecionar Personagem' (modal com os personagens do usuário e o status na campanha; se não estiver, botão 'solicitar acesso'); menu 'Incluir Personagem' (formulário de cadastro; GM já inclui na campanha, senão já pede acesso); ícone de notificações à direita do nome do usuário com os convites de campanha para aceitar ou recusar."

## Clarifications

### Session 2026-09-25

- Q: Quais personagens aparecem no combo "Personagem atual"? → A: só os personagens do próprio usuário aprovados na campanha atual, mais "Mestre (GM)" para o mestre.
- Q: Onde ficam os menus "Gerenciar Personagens", "Selecionar Personagem" e "Incluir Personagem"? → A: dentro da própria lista do combo, abaixo dos personagens, separados por uma linha.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Escolher com quem jogar no combo "Personagem atual" (Priority: P1)

Ao lado dos seletores de campanha e de mapa, o menu superior ganha o seletor "Personagem atual".
Diferente dos outros dois, ele é uma lista de verdade que abre ali mesmo. Se o usuário é o mestre
(GM) da campanha atual, a primeira opção é "Mestre (GM)". Em seguida aparecem os personagens do
próprio usuário aprovados na campanha atual. Abaixo deles, separados por uma linha, ficam as ações
"Gerenciar Personagens" (só GM), "Selecionar Personagem" e "Incluir Personagem". A escolha fica
lembrada para aquela campanha.

**Why this priority**: é a base das próximas features (tokens do personagem no mapa) e mostra ao
usuário de imediato com quem ele está participando.

**Independent Test**: com uma campanha própria e um personagem aprovado nela, abrir o combo, ver
"Mestre (GM)" e o personagem, escolher o personagem, recarregar a página e ver a escolha mantida.

**Acceptance Scenarios**:

1. **Given** o usuário é o mestre da campanha atual, **When** abre o combo, **Then** a primeira
   opção é "Mestre (GM)", seguida dos seus personagens aprovados e, abaixo de uma linha, das ações
   "Gerenciar Personagens", "Selecionar Personagem" e "Incluir Personagem".
2. **Given** o usuário não é o mestre e tem um personagem aprovado, **When** abre o combo, **Then**
   vê apenas os seus personagens aprovados e as ações "Selecionar Personagem" e "Incluir Personagem"
   (sem "Mestre (GM)" nem "Gerenciar Personagens").
3. **Given** outro jogador tem um personagem aprovado na mesma campanha, **When** o usuário abre o
   combo, **Then** esse personagem não aparece na lista.
4. **Given** o usuário não tem nenhuma opção (não é GM e não tem personagem aprovado), **When** abre
   o combo, **Then** o seletor mostra "Nenhum personagem" e a lista traz só as ações "Selecionar
   Personagem" e "Incluir Personagem".
5. **Given** uma opção escolhida, **When** o usuário troca de campanha e depois volta, **Then** a
   escolha daquela campanha é restaurada (se ainda for válida).
6. **Given** nenhuma campanha selecionada, **When** o usuário olha o menu, **Then** o combo fica
   desabilitado.

---

### User Story 2 - Participar com um personagem próprio ("Selecionar Personagem") (Priority: P1)

O menu "Selecionar Personagem" abre um modal com a lista dos personagens do usuário, com foto, nome
e o status de cada um na campanha atual (Aprovado, Convidado, Acesso solicitado, Recusado ou "Fora da
campanha"). Para os que estão fora, há o botão "Solicitar acesso". Personagens aprovados podem ser
escolhidos como personagem atual direto dali.

**Why this priority**: é como um jogador entra numa campanha; sem isso só o GM teria personagens.

**Independent Test**: com um personagem fora da campanha, abrir o modal, clicar "Solicitar acesso" e
ver o status mudar para "Acesso solicitado" (ou "Aprovado" em campanha aberta), com toast.

**Acceptance Scenarios**:

1. **Given** personagens do usuário com status variados, **When** abre "Selecionar Personagem",
   **Then** cada personagem mostra o status correto na campanha atual.
2. **Given** um personagem fora da campanha fechada, **When** clica "Solicitar acesso", **Then** o
   status vira "Acesso solicitado" e um toast confirma.
3. **Given** um personagem fora de uma campanha aberta, **When** clica "Solicitar acesso", **Then** o
   status vira "Aprovado" e o personagem passa a aparecer no combo.
4. **Given** um personagem com status "Convidado", **When** o modal é exibido, **Then** há os botões
   "Aceitar" e "Recusar" no lugar de "Solicitar acesso".
5. **Given** um personagem "Recusado", **When** o modal é exibido, **Then** não há botão de pedido e é
   informado que é preciso aguardar um convite do mestre.
6. **Given** um personagem aprovado, **When** o usuário clica "Usar", **Then** ele vira o personagem
   atual no combo e o modal fecha.
7. **Given** o usuário não tem personagens, **When** abre o modal, **Then** vê uma mensagem vazia com
   atalho para "Incluir Personagem".

---

### User Story 3 - Gerenciar os personagens da campanha (Priority: P1)

Só o GM vê o menu "Gerenciar Personagens". O modal tem duas abas:

- **Personagens na Campanha**: lista com foto, nome do personagem, nome do dono e status. Pedidos de
  acesso têm "Aprovar" e "Declinar"; todo item tem "Excluir", que pede confirmação e remove o
  personagem **da campanha** (o personagem continua existindo para o dono).
- **Convidar Personagens**: busca por nome de personagem entre os personagens de todos os usuários,
  com foto do personagem, nome do dono e o botão "Convidar".

**Why this priority**: sem aprovação do GM, campanhas fechadas não recebem ninguém.

**Independent Test**: com um pedido pendente, aprovar e ver o status "Aprovado"; excluir outro com
confirmação e ver que ele some da lista mas continua na lista do dono; buscar um personagem de outro
usuário e convidá-lo, vendo-o na primeira aba como "Convidado".

**Acceptance Scenarios**:

1. **Given** o usuário não é o GM da campanha atual, **When** olha o menu, **Then** "Gerenciar
   Personagens" não aparece.
2. **Given** um pedido de acesso pendente, **When** o GM clica "Aprovar", **Then** o status vira
   "Aprovado" e um toast confirma; **When** clica "Declinar", **Then** vira "Recusado".
3. **Given** qualquer personagem da lista, **When** o GM clica "Excluir", **Then** aparece uma
   confirmação dizendo que o personagem sai só da campanha; confirmando, ele some da lista.
4. **Given** a aba "Convidar Personagens", **When** o GM busca por parte do nome, **Then** vê os
   personagens encontrados com foto, nome e dono, paginados.
5. **Given** um personagem encontrado que não está na campanha, **When** o GM clica "Convidar",
   **Then** um toast confirma e o botão indica "Convidado"; ele aparece na primeira aba.
6. **Given** um personagem encontrado que já está na campanha, **When** exibido, **Then** o botão
   mostra o status atual em vez de "Convidar" (exceto "Recusado", que pode ser convidado de novo).
7. **Given** um personagem com pedido pendente, **When** o GM o convida pela busca, **Then** ele é
   aprovado (mesma regra do sistema).

---

### User Story 4 - Criar um personagem ("Incluir Personagem") (Priority: P2)

"Incluir Personagem" abre um modal com o formulário de cadastro: nome (obrigatório), imagem
(opcional, com envio de arquivo), vida, energia, movimento, estado e ficha (texto livre). Ao salvar,
o personagem é criado e: se o usuário é o GM da campanha atual, já entra na campanha como aprovado;
senão, o acesso é solicitado automaticamente (aprovado direto se a campanha for aberta).

**Why this priority**: útil para começar rápido, mas "Selecionar Personagem" já cobre quem tem
personagens.

**Independent Test**: como GM, incluir "Goblin" e vê-lo aprovado no combo; como jogador em
campanha fechada, incluir "Aria" e vê-la como "Acesso solicitado" em "Selecionar Personagem".

**Acceptance Scenarios**:

1. **Given** o formulário sem nome, **When** salva, **Then** um toast informa que o nome é
   obrigatório e o modal continua aberto.
2. **Given** o GM da campanha atual, **When** salva um personagem válido, **Then** ele é criado,
   entra aprovado na campanha, aparece no combo e um toast confirma.
3. **Given** um jogador em campanha fechada, **When** salva, **Then** o personagem é criado com o
   acesso solicitado e um toast informa que aguarda aprovação do mestre.
4. **Given** um jogador em campanha aberta, **When** salva, **Then** o personagem já entra aprovado.
5. **Given** uma imagem escolhida, **When** salva, **Then** a foto aparece nas listas de personagens.
6. **Given** falha ao pedir acesso após criar, **When** isso ocorre, **Then** o personagem continua
   criado e o toast explica que o pedido pode ser feito em "Selecionar Personagem".

---

### User Story 5 - Notificações de convite (Priority: P2)

À direita do nome do usuário há um ícone de sino com um contador de convites pendentes. Ao clicar,
abre um submenu com cada convite: nome da campanha, nome do mestre e personagem convidado, com os
botões "Aceitar" e "Recusar". Sem convites, o submenu diz "Nenhuma notificação".

**Why this priority**: fecha o ciclo do convite feito pelo GM na US3.

**Independent Test**: com um convite pendente, ver o contador "1", abrir, aceitar e ver o contador
zerar e o personagem aparecer aprovado.

**Acceptance Scenarios**:

1. **Given** convites pendentes para personagens do usuário, **When** o app carrega, **Then** o sino
   mostra a quantidade.
2. **Given** o submenu aberto, **When** o usuário clica "Aceitar", **Then** o convite sai da lista, o
   contador diminui, um toast confirma e, se for a campanha atual, o personagem aparece no combo.
3. **Given** o submenu aberto, **When** clica "Recusar", **Then** o convite sai da lista e um toast
   confirma.
4. **Given** nenhum convite, **When** abre o submenu, **Then** vê "Nenhuma notificação" e o sino não
   mostra contador.
5. **Given** o app aberto, **When** um novo convite é feito por outro usuário, **Then** ele aparece em
   até 1 minuto ou ao abrir o submenu.

---

### Edge Cases

- Troca de campanha: combo, listas e escolha lembrada passam a refletir a nova campanha.
- Personagem atual removido da campanha, recusado ou excluído pelo dono: o combo volta para a
  primeira opção válida (GM, se for o mestre) ou "Nenhum personagem".
- GM excluindo o próprio personagem da campanha: permitido; o personagem continua existindo.
- Ações simultâneas (ex.: o GM aprova enquanto o jogador vê o modal): ao reabrir ou após uma ação, a
  lista é recarregada; erros de conflito vindos do sistema viram toast com a mensagem.
- Busca sem resultados: mensagem "Nenhum personagem encontrado".
- Personagem sem imagem: exibe um marcador com a inicial do nome.
- Botões de ação ficam desabilitados enquanto a ação está em andamento (evita clique duplo).
- Sessão expirada durante qualquer ação: volta para a tela de login, como no resto do app.

## Requirements *(mandatory)*

### Functional Requirements

**Combo "Personagem atual"**

- **FR-001**: O menu superior MUST exibir o seletor "Personagem atual" como lista real que abre no
  próprio menu, desabilitado quando não há campanha selecionada.
- **FR-002**: Quando o usuário é o mestre da campanha atual, a primeira opção MUST ser "Mestre (GM)".
- **FR-003**: A lista MUST conter apenas os personagens do próprio usuário com status "Aprovado" na
  campanha atual; personagens de outros usuários MUST NOT aparecer.
- **FR-004**: A escolha MUST ser lembrada por campanha neste navegador e restaurada ao voltar à
  campanha; se não for mais válida, MUST cair na primeira opção válida.
- **FR-005**: A lista do combo MUST trazer, abaixo dos personagens e separadas por uma linha, as ações
  "Gerenciar Personagens" (só GM), "Selecionar Personagem" e "Incluir Personagem"; escolher uma ação
  MUST abrir o modal correspondente sem mudar o personagem atual.

**Gerenciar Personagens (GM)**

- **FR-006**: "Gerenciar Personagens" MUST aparecer apenas para o mestre da campanha atual.
- **FR-007**: A aba "Personagens na Campanha" MUST listar todos os personagens da campanha (qualquer
  status) com foto, nome, dono e status.
- **FR-008**: Pedidos de acesso pendentes MUST ter as ações "Aprovar" e "Declinar".
- **FR-009**: Todo item MUST ter "Excluir", com confirmação explícita de que o personagem sai apenas
  da campanha; o personagem MUST continuar existindo para o dono.
- **FR-010**: A aba "Convidar Personagens" MUST buscar, por parte do nome, entre os personagens de
  todos os usuários, com resultados paginados mostrando foto, nome do personagem e nome do dono.
- **FR-011**: Cada resultado MUST mostrar "Convidar" quando o personagem não está na campanha ou foi
  recusado, e o status atual nos demais casos.
- **FR-012**: Convidar MUST seguir as regras já existentes: fora ou recusado → "Convidado"; pedido
  pendente → "Aprovado".

**Selecionar Personagem**

- **FR-013**: "Selecionar Personagem" MUST listar todos os personagens do usuário com foto, nome e o
  status na campanha atual ("Fora da campanha" quando não há vínculo).
- **FR-014**: Personagens fora da campanha MUST ter "Solicitar acesso"; convidados MUST ter "Aceitar"
  e "Recusar"; recusados MUST informar que é preciso aguardar um convite; aprovados MUST ter "Usar".

**Incluir Personagem**

- **FR-015**: "Incluir Personagem" MUST abrir o cadastro com nome (obrigatório, até 260 caracteres),
  imagem opcional, vida, energia e movimento (inteiros ≥ 0, padrão 0), estado (opcional, até 260) e
  ficha (texto opcional, até 20.000 caracteres).
- **FR-016**: Após criar, se o usuário é o mestre da campanha atual, o personagem MUST entrar na
  campanha já aprovado; senão, o acesso MUST ser solicitado automaticamente.
- **FR-017**: Se não houver campanha atual, o personagem MUST ser apenas criado.

**Notificações**

- **FR-018**: À direita do nome do usuário MUST haver um ícone de notificações com a quantidade de
  convites pendentes (sem número quando zero).
- **FR-019**: O submenu MUST listar cada convite com campanha, mestre e personagem, e os botões
  "Aceitar" e "Recusar"; sem convites, "Nenhuma notificação".
- **FR-020**: A lista de convites MUST ser atualizada ao carregar o app, ao abrir o submenu, após cada
  ação e periodicamente (no máximo a cada 1 minuto).

**Geral**

- **FR-021**: Toda ação MUST ser comunicada por toast (sucesso ou erro), com textos em pt-BR.
- **FR-022**: Todas as janelas, exceto o combo e os submenus, MUST abrir como modal.

### Key Entities

- **Personagem**: pertence a um usuário; nome, imagem, vida, energia, movimento, estado e ficha.
- **Participação na campanha**: liga um personagem a uma campanha com um status — Convidado, Acesso
  solicitado, Aprovado ou Recusado. Excluir a participação não exclui o personagem.
- **Convite**: participação com status "Convidado" para um personagem do usuário; é o que aparece nas
  notificações.
- **Personagem atual**: escolha do usuário por campanha ("Mestre (GM)" ou um personagem aprovado);
  guardada só no navegador.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um jogador consegue pedir acesso para um personagem existente em no máximo 3 cliques a
  partir do mapa.
- **SC-002**: O GM consegue aprovar um pedido pendente em no máximo 3 cliques a partir do mapa.
- **SC-003**: Um convite feito pelo GM aparece para o convidado em até 1 minuto sem recarregar a
  página.
- **SC-004**: 100% das exclusões da campanha pedem confirmação e nenhuma apaga o personagem do dono.
- **SC-005**: Após incluir um personagem como GM, ele aparece no combo em menos de 2 segundos.
- **SC-006**: A escolha do personagem atual é restaurada em 100% das voltas à campanha enquanto
  continuar válida.

## Assumptions

- Esta feature é principalmente de frontend, mas depende de capacidades que o sistema ainda não
  oferece e que serão acrescentadas no backend:
  - busca de personagens de todos os usuários (nome, imagem e dono), para o convite;
  - remoção de um personagem da campanha pelo mestre;
  - consulta, pelo próprio usuário, do status dos seus personagens numa campanha (hoje só o mestre e
    participantes aprovados veem a lista da campanha);
  - inclusão direta como aprovado quando quem cadastra é o mestre da campanha.
- "Declinar" um pedido equivale a "Recusar" (status Recusado); um recusado só volta por convite.
- "Mestre (GM)" é o mestre da campanha atual (dono da campanha).
- O personagem atual ainda não tem efeito no mapa; será usado pela futura feature de tokens.
- Editar ou excluir o personagem em si (fora da campanha) está fora do escopo desta feature.
- Não há notificações em tempo real: a atualização periódica de no máximo 1 minuto é suficiente.
- Apenas convites geram notificações; pedidos de acesso para o GM aparecem em "Gerenciar
  Personagens".
