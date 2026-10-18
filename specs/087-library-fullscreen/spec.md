# Feature Specification: Biblioteca em tela cheia

**Feature Branch**: `087-library-fullscreen`
**Created**: 2026-10-18
**Status**: Draft
**Input**: User description: "Melhoria na navegação: crie uma área de biblioteca que ocupe a tela toda, da mesma forma que o editor de animações; no editor de animações, inclua o menu de Usuário; do lado esquerdo do menu do usuário, um botão amarelo "← Voltar para campanha"; nessa área ficam todas as bibliotecas do jogo, com um menu de navegação à esquerda: Campanhas, Mapas, Personagens (só os do próprio usuário), NPCs, Tokens, Armas, Animações; todas as edições são feitas na biblioteca e os modais de edição saem; a engrenagem ao lado da campanha leva para a edição da campanha em tela cheia na biblioteca; na lista de mapas o botão de editar leva para o editor na biblioteca; "Selecionar personagem" leva para a edição do personagem na biblioteca; "Incluir personagem" leva para a inclusão em tela cheia na biblioteca; os menus "Animações" e "Armas" são substituídos por "Biblioteca", e essas telas funcionam em tela cheia lá; na biblioteca, cada página tem a sua rota."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Uma biblioteca em tela cheia, com navegação à esquerda (Priority: P1)

O usuário escolhe "Biblioteca" no menu do usuário e sai da mesa para uma área que ocupa a tela toda, como o editor de animações: no topo só a logomarca, o botão amarelo "← Voltar para campanha" e o menu do usuário; à esquerda um menu com Campanhas, Mapas, Personagens, NPCs, Tokens, Armas e Animações; à direita a página escolhida. Cada página tem o seu endereço próprio: recarregar, voltar/avançar no navegador e colar o endereço em outra aba levam à mesma página. "← Voltar para campanha" leva de volta à mesa, na campanha e no mapa em que o usuário estava.

**Why this priority**: é a casa de todas as outras histórias; sem ela não há onde editar.

**Independent Test**: abrir "Biblioteca" no menu do usuário, passar por cada item do menu à esquerda, recarregar a página em um deles e voltar à mesa pelo botão amarelo.

**Acceptance Scenarios**:

1. **Given** o usuário na mesa, **When** abre o menu do usuário, **Then** vê "Biblioteca" no lugar de "Animações" e "Armas", e ao escolher vai para a biblioteca em tela cheia, sem nada da mesa (mapa, painéis, chat, combos de campanha e personagem, "Livre", "Finalizar turno").
2. **Given** a biblioteca aberta, **When** escolhe um item do menu à esquerda, **Then** a página muda e o endereço passa a ser o daquela página, com o item marcado no menu.
3. **Given** uma página da biblioteca, **When** recarrega a página ou abre o mesmo endereço em outra aba (logado), **Then** vê a mesma página; sem sessão vai ao login e, depois de entrar, volta para ela.
4. **Given** a biblioteca, **When** toca em "← Voltar para campanha", **Then** volta à mesa com a campanha atual e o mapa que estava aberto antes de sair.
5. **Given** um celular, **When** abre a biblioteca, **Then** o menu da esquerda vira um menu recolhível no topo e a página ocupa a largura toda.

---

### User Story 2 - Editar a campanha em tela cheia (Priority: P1)

A engrenagem ao lado da campanha na mesa deixa de abrir uma janela: leva para a página da campanha na biblioteca, em tela cheia, com o status da campanha e as seções Personagens, NPCs, Mapas e Plano, cada uma com o seu endereço. A seção Campanhas da biblioteca lista as campanhas do usuário e as outras campanhas abertas, e permite criar uma campanha.

**Why this priority**: a edição da campanha é a janela mais usada e a mais apertada hoje.

**Independent Test**: tocar na engrenagem, mudar o status, aprovar um personagem, retirar um NPC, tornar um mapa atual e escrever um plano, tudo na página da biblioteca; voltar à mesa e ver as mudanças.

**Acceptance Scenarios**:

1. **Given** o mestre na mesa, **When** toca na engrenagem ao lado da campanha, **Then** vai para a página da campanha na biblioteca, na seção Personagens, sem abrir janela.
2. **Given** a página da campanha, **When** troca entre Personagens, NPCs, Mapas e Plano, **Then** o endereço muda para o da seção e recarregar mantém a seção.
3. **Given** o mestre, **When** muda o status, aprova/convida personagens, inclui/edita/retira NPCs, abre/arquiva/apaga/torna atual um mapa ou edita o plano, **Then** as regras e confirmações são as mesmas de hoje e a mesa dos outros participantes recebe as mudanças em tempo real.
4. **Given** um plano com alterações não salvas, **When** o mestre sai da seção ou da biblioteca, **Then** é perguntado se quer descartar as alterações.
5. **Given** a seção Campanhas, **When** o usuário a abre, **Then** vê "Minhas" (as que mestra, com a engrenagem de edição), as campanhas em que joga e a busca das outras campanhas (pedir acesso como hoje), e pode criar uma campanha nova.
6. **Given** um jogador (não mestre) que abre o endereço da edição de uma campanha, **Then** vê "Só o mestre edita esta campanha" e o caminho de volta.
7. **Given** o mestre abre "Mapas" da campanha na biblioteca e escolhe abrir um mapa, **Then** volta para a mesa com esse mapa aberto (como "Abrir" faz hoje).

---

### User Story 3 - Personagens: incluir e editar em tela cheia (Priority: P1)

Na seção Personagens o usuário vê só os seus personagens. "Incluir personagem" (no combo da mesa e na biblioteca) abre a página de inclusão em tela cheia; "Selecionar personagem" no combo da mesa leva para a lista de personagens na biblioteca, onde cada um abre a sua página de edição (dados, ficha, ficha em arquivo, token, transferência). As participações em campanhas (pedir acesso, aceitar convite) continuam onde estão.

**Why this priority**: a ficha é o texto mais longo do jogo e a janela atual é pequena para ela.

**Independent Test**: no combo de personagem da mesa, "Incluir personagem" → criar → aparece na lista da biblioteca; "Selecionar personagem" → editar a ficha → voltar à mesa.

**Acceptance Scenarios**:

1. **Given** a mesa, **When** escolhe "Incluir personagem" no combo, **Then** vai para a página de inclusão na biblioteca; ao salvar, vai para a página de edição do personagem criado.
2. **Given** a mesa, **When** escolhe "Selecionar personagem", **Then** vai para a lista de personagens na biblioteca, que mostra só os personagens do usuário, cada um com a situação dele na campanha atual (aprovado, convidado, pedido, fora) e as ações de hoje (pedir acesso, aceitar convite).
3. **Given** a página de um personagem, **When** edita dados, ficha, ficha em arquivo ou token e salva, **Then** os campos e as regras são os de hoje, e o que não foi alterado (token, ficha em arquivo) se mantém.
4. **Given** a página de um personagem, **When** escolhe "Transferir", **Then** a transferência pede o e-mail com o aviso de hoje e, feita, o personagem sai da lista.
5. **Given** o endereço do personagem de outro usuário, **When** é aberto, **Then** a página diz que o personagem não é dele.
6. **Given** a mesa, **When** toca no cartão de um personagem da campanha (painel do grupo), **Then** abre a janela "Nesta campanha" como hoje (vida, energia, situação, postura, ficha da campanha): é uma ação da mesa, não da biblioteca.

---

### User Story 4 - Mapas, NPCs e Tokens em tela cheia (Priority: P2)

Mapas, NPCs e Tokens ganham as suas páginas na biblioteca: lista ("Meus" e "Buscar"), inclusão e edição em tela cheia, com os mesmos campos de hoje. O lápis de editar mapa (nas listas de mapas da mesa) leva para a página de edição do mapa na biblioteca.

**Why this priority**: tira as janelas de edição restantes; usa as mesmas regras, só muda o lugar.

**Independent Test**: editar um mapa pelo lápis da lista da mesa e voltar; criar e editar um NPC e um token na biblioteca.

**Acceptance Scenarios**:

1. **Given** a lista de mapas da mesa ("Mapas da campanha", "Meus mapas", "Buscar mapas", aba Mapas da campanha), **When** toca no lápis de um mapa seu, **Then** vai para a página de edição do mapa na biblioteca (nome, descrição, tamanho da grade, imagem, máscara 3D, fundo, textura de parede), e salvar atualiza o mapa aberto na mesa como hoje.
2. **Given** a seção Mapas, **When** a abre, **Then** vê os seus mapas e a busca da biblioteca, e o lápis só nos seus.
3. **Given** a seção NPCs, **When** a abre, **Then** vê os seus NPCs, inclui e edita em tela cheia (figura, token, ficha, postura inicial), e apagar segue a regra de hoje (recusado enquanto o NPC está em campanha).
4. **Given** a seção Tokens, **When** a abre, **Then** vê "Meus tokens" e "Buscar tokens", inclui e edita em tela cheia com as abas de hoje (Token, 2,5D, 3D, Animação, Armas) e a prévia 3D maior.
5. **Given** a mesa, **When** escolhe um token para uma peça ("Incluir token"/"Alterar token" no hex, personagem sem token) ou inclui um NPC pelo painel, **Then** a janela de escolha da mesa continua como hoje, sem sair da mesa.

---

### User Story 5 - Armas e Animações dentro da biblioteca; editor de animações com o menu do usuário (Priority: P2)

Armas e Animações deixam o menu do usuário e passam a ser páginas da biblioteca (lista, envio e edição em tela cheia). O editor de animações ganha o mesmo topo da biblioteca: logomarca, "← Voltar para campanha" e o menu do usuário.

**Why this priority**: completa a troca dos menus por "Biblioteca" e deixa o editor coerente com ela.

**Independent Test**: abrir Animações na biblioteca, abrir o editor de uma animação, usar o menu do usuário e o botão amarelo de lá.

**Acceptance Scenarios**:

1. **Given** o menu do usuário, **When** é aberto (na mesa, na biblioteca ou no editor), **Then** tem "Biblioteca" e não tem mais "Animações" nem "Armas".
2. **Given** a seção Armas, **When** a abre, **Then** vê "Minhas", "Buscar" e "Enviar", e a edição da arma (nome, arquivo, pega, pose padrão) ocupa a página toda, com a prévia maior.
3. **Given** a seção Animações, **When** a abre, **Then** vê "Minhas", "Buscar" e "Enviar", edita nome e tipo em tela cheia, e "Editar no editor" abre o editor de animações.
4. **Given** o editor de animações, **When** é aberto, **Then** o topo tem a logomarca, o nome da animação, o estado do agente, o modelo, o botão amarelo "← Voltar para campanha" e, à direita dele, o menu do usuário.
5. **Given** o editor de animações aberto em outra aba, **When** toca em "← Voltar para campanha", **Then** vai para a mesa na mesma aba.

---

### Edge Cases

- Usuário sem campanha atual: "← Voltar para campanha" leva para a mesa sem campanha (como entrar no Roll6 hoje).
- Saída de uma página com alterações não salvas (personagem, NPC, token, mapa, arma, animação, plano): sempre pergunta antes de descartar, também ao tocar em "← Voltar para campanha" ou em outro item do menu; recarregar/fechar a aba avisa pelo navegador.
- Endereço de algo que não existe ou foi apagado: a página diz "não encontrado" e oferece voltar à lista.
- Item de outro usuário aberto pelo endereço (personagem, NPC; mapa/token/arma/animação de outro): personagens e NPCs dizem que não são dele; mapas, tokens, armas e animações de outros aparecem só para leitura, como na busca de hoje.
- Mesa com mapa com alterações não salvas quando o usuário vai para a biblioteca: o rascunho do mapa fica guardado e está lá ao voltar (nada é perdido nem perguntado); recarregar a página enquanto está na biblioteca avisa pelo navegador.
- Campanha apagada, transferência ou edição feita em outra aba enquanto a página está aberta: a página recarrega o dado e avisa.
- Jogador numa campanha pausada/finalizada: aprovar/convidar continua bloqueado com o aviso de hoje.
- Celular: o menu da esquerda é recolhível; as páginas de edição usam a largura toda; prévias 3D se ajustam.

## Requirements *(mandatory)*

### Functional Requirements

**Área da biblioteca**

- **FR-001**: O sistema MUST ter uma área "Biblioteca" em tela cheia, separada da mesa, com um topo (logomarca, "← Voltar para campanha" em amarelo, menu do usuário à direita) e um menu à esquerda com Campanhas, Mapas, Personagens, NPCs, Tokens, Armas e Animações.
- **FR-002**: Cada página da biblioteca MUST ter endereço próprio (lista, inclusão e edição de cada tipo, e cada seção da campanha), funcionando com recarregar, voltar/avançar e abertura direta do endereço (com login quando sem sessão, voltando ao endereço depois).
- **FR-003**: "← Voltar para campanha" MUST levar à mesa com a campanha atual e o mapa que estava aberto; sem campanha atual, à mesa vazia.
- **FR-004**: O menu do usuário MUST trocar "Animações" e "Armas" por um único "Biblioteca" e MUST estar presente na mesa, na biblioteca e no editor de animações.
- **FR-005**: No celular, o menu da esquerda MUST virar um menu recolhível e as páginas MUST ocupar a largura toda.
- **FR-006**: Sair de uma página com alterações não salvas MUST pedir confirmação, por qualquer caminho dentro do site (menu da esquerda, voltar para campanha, menu do usuário), e o navegador MUST avisar ao recarregar/fechar.

**Campanhas**

- **FR-007**: A engrenagem ao lado da campanha na mesa MUST levar para a página de edição da campanha na biblioteca (sem abrir janela), com o status e as seções Personagens, NPCs, Mapas e Plano, cada uma com o seu endereço, mantendo todas as ações, regras e confirmações de hoje.
- **FR-008**: A seção Campanhas MUST listar as campanhas que o usuário mestra (com acesso à edição), as em que joga e a busca das demais (com o pedido de acesso de hoje), e MUST permitir criar uma campanha; a edição MUST ser só do mestre.
- **FR-009**: "Abrir" um mapa a partir da biblioteca MUST levar para a mesa com o mapa aberto.

**Personagens**

- **FR-010**: A seção Personagens MUST mostrar somente os personagens do próprio usuário, cada um com a sua situação na campanha atual e as ações de participação de hoje (pedir acesso, aceitar convite).
- **FR-011**: "Incluir personagem" (combo da mesa e biblioteca) MUST abrir a página de inclusão em tela cheia; "Selecionar personagem" no combo da mesa MUST levar para a lista de personagens da biblioteca; cada personagem MUST ter a sua página de edição (dados, ficha, ficha em arquivo, token, transferência) com os campos e regras de hoje.

**Mapas, NPCs, Tokens, Armas, Animações**

- **FR-012**: O lápis de editar mapa nas listas da mesa MUST levar para a página de edição do mapa na biblioteca, com os campos de hoje; salvar MUST atualizar o mapa aberto na mesa como hoje.
- **FR-013**: Mapas, NPCs, Tokens, Armas e Animações MUST ter na biblioteca as suas listas ("Meus"/"Minhas" e "Buscar", e "Enviar" onde existe hoje), inclusão e edição em tela cheia, com os mesmos campos, permissões e regras de hoje (só o dono edita; apagar recusado quando em uso).
- **FR-014**: O editor de animações MUST ganhar o topo da biblioteca: "← Voltar para campanha" e o menu do usuário; "Editar no editor" continua abrindo-o.

**Janelas**

- **FR-015**: As janelas de edição da biblioteca MUST sair (configurações da campanha, campanhas, mapas e edição de mapa, selecionar/incluir/editar personagem, edição de NPC, edição de token, armas, animações e as suas edições), substituídas pelas páginas.
- **FR-016**: As escolhas feitas durante o jogo MUST continuar como janelas da mesa, sem sair dela: escolher o token de uma peça, incluir NPC pelo painel, a janela "Nesta campanha" do cartão do grupo, a transferência dentro da página do personagem e as confirmações.
- **FR-017**: A mesa MUST continuar recebendo em tempo real as mudanças feitas na biblioteca (por este usuário ou outro), como recebe hoje as feitas nas janelas.

### Key Entities

- **Página da biblioteca**: um endereço da área da biblioteca — a seção (Campanhas, Mapas, Personagens, NPCs, Tokens, Armas, Animações), e dentro dela a lista, a inclusão ou a edição de um item; para a campanha, também a seção (Personagens, NPCs, Mapas, Plano).
- **Volta para a mesa**: a campanha atual e o mapa aberto que o usuário deixou ao entrar na biblioteca (já lembrados hoje pelo site).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Todas as edições de campanha, mapa, personagem, NPC, token, arma e animação podem ser feitas sem abrir nenhuma janela de edição (100% das listadas em FR-015 substituídas por páginas).
- **SC-002**: Qualquer página da biblioteca reabre exatamente igual depois de recarregar ou colar o endereço em outra aba, em 100% dos casos testados.
- **SC-003**: Da biblioteca à mesa com a campanha e o mapa de antes em um toque ("← Voltar para campanha"), em menos de 3 segundos.
- **SC-004**: Nenhuma alteração não salva é perdida ao navegar dentro do site sem confirmação do usuário.
- **SC-005**: Um usuário chega da mesa a qualquer item da biblioteca em no máximo 3 toques (menu do usuário → Biblioteca → item do menu).
- **SC-006**: As ações de jogo da mesa (escolher token de peça, incluir NPC pelo painel, cartão do grupo) continuam sem sair da mesa.

## Assumptions

- O endereço das páginas é estável e segue o padrão dos endereços que o site já tem (`/library/characters/12`, como `/campaign/…` e `/map/…`); o detalhe dos caminhos fica no plano. O editor de animações mantém o endereço atual e passa a ser alcançado também pela biblioteca.
- A biblioteca usa a mesma sessão e as mesmas regras de permissão do servidor; nada muda nas regras, no banco ou no MCP — é uma reorganização das telas.
- As escolhas feitas no meio do jogo (token de peça, incluir NPC pelo painel, cartão "Nesta campanha") ficam como janelas da mesa porque sair da mesa durante o jogo atrapalharia; a criação de um token ou NPC a partir dessas escolhas, se hoje existe nelas, continua lá.
- "Outras campanhas…" e "Mapas…" do combo da mesa passam a levar para Campanhas e Mapas da biblioteca.
- A biblioteca abre na mesma aba (a mesa fica para trás e volta pelo botão amarelo); o editor de animações continua abrindo em nova aba a partir da lista.
- Itens de outros usuários (mapas, tokens, armas, animações da busca) abrem só para leitura, como hoje.
