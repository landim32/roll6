# Feature Specification: Gargalhada e enquetes no chat

**Feature Branch**: `045-chat-laugh-polls`
**Created**: 2026-10-09
**Status**: Draft
**Input**: User description: "Melhorias no chat: - Da mesma forma q está funcionando o curtir e amei, crie um de gargalhada - Crie tb uma opção de enquete, no clipe de papel - Essa opção deve abrir um modal onde o usuário poderá cadastra as perguntas e respostas - Cada personagem poderá votar um vez - Se baseie na enquete do whatsapp, procure imagens na internet"

## Clarifications

### Session 2026-10-09

- Q: Depois de votar, o personagem pode mudar o voto? → A: Sim, a qualquer momento, como no WhatsApp — tocar em outra opção troca e tocar na própria retira.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reagir com uma gargalhada (Priority: P1)

Durante a sessão, um jogador lê uma fala engraçada de outro personagem no chat. Ele segura a mensagem e, além de "Curtir" e "Amei", escolhe "Gargalhada". A mensagem passa a mostrar o ícone de gargalhada junto das outras reações, e quem tocar no selo vê quem reagiu e com o quê.

**Why this priority**: é pequena, segue exatamente o comportamento que a mesa já conhece (Curtir/Amei) e entrega valor imediato.

**Independent Test**: segurar qualquer mensagem que aceite reações, escolher Gargalhada e verificar o selo da mensagem em outra janela, sem recarregar.

**Acceptance Scenarios**:

1. **Given** uma mensagem que aceita reações, **When** o usuário segura a mensagem, **Then** a barra mostra "Gargalhada" ao lado de "Curtir" e "Amei", do mesmo tamanho para toque.
2. **Given** o usuário não reagiu, **When** escolhe Gargalhada, **Then** a mensagem mostra a gargalhada no selo de reações, e os demais participantes a veem em tempo real.
3. **Given** o usuário já curtiu a mensagem, **When** escolhe Gargalhada, **Then** a curtida é trocada pela gargalhada (uma reação por pessoa por mensagem).
4. **Given** o usuário já reagiu com gargalhada, **When** escolhe Gargalhada de novo, **Then** a reação é removida.
5. **Given** a lista de quem reagiu, **When** aberta, **Then** cada pessoa aparece com o ícone da reação que escolheu, gargalhada incluída.

---

### User Story 2 - Criar uma enquete (Priority: P1)

O mestre (ou um jogador) quer decidir com a mesa para onde o grupo vai. No clipe de papel ele toca em "Enquete"; abre uma janela onde escreve a pergunta e as opções de resposta (como no WhatsApp: um campo de pergunta e uma lista de opções que cresce conforme ele digita), e envia. A enquete aparece no chat como um cartão com a pergunta e as opções.

**Why this priority**: é o núcleo do pedido; sem criar, não há o que votar.

**Independent Test**: criar uma enquete com pergunta e 3 opções e verificar o cartão no chat de outro participante.

**Acceptance Scenarios**:

1. **Given** o usuário pode escrever no chat, **When** abre o clipe de papel, **Then** vê a opção "Enquete" com um ícone do mesmo tamanho dos demais.
2. **Given** a janela de enquete aberta, **When** o usuário preenche a pergunta e ao menos 2 opções, **Then** o botão Enviar fica disponível; com menos de 2 opções ou sem pergunta, não fica.
3. **Given** o usuário digita na última opção, **When** ela deixa de estar vazia, **Then** uma nova linha de opção vazia aparece embaixo, até o limite de 12 opções.
4. **Given** o usuário quer tirar ou reordenar uma opção, **When** apaga seu texto ou usa os controles de ordem, **Then** a lista se ajusta sem perder as outras.
5. **Given** a enquete enviada, **When** os participantes olham o chat, **Then** veem um cartão com quem perguntou (personagem ou "Mestre"), a pergunta, a indicação "Escolha uma opção", as opções e "Ver votos".
6. **Given** a janela tem texto e o usuário fecha, **When** fecha, **Then** é perguntado se quer descartar a enquete.

---

### User Story 3 - Votar e ver o resultado (Priority: P1)

Cada personagem da mesa vota uma vez na enquete tocando numa opção. As opções mostram quantos votos têm, uma barra proporcional e as fotos de quem votou nelas; "Ver votos" abre a lista de votantes por opção.

**Why this priority**: sem voto a enquete não serve para nada; é o que a torna útil para a mesa.

**Independent Test**: dois participantes votam em opções diferentes; os dois veem contagens, barras e fotos atualizadas em tempo real.

**Acceptance Scenarios**:

1. **Given** um jogador com personagem aprovado escolhido, **When** toca numa opção, **Then** o voto é registrado em nome desse personagem e a opção mostra o círculo marcado, a contagem e a barra atualizadas.
2. **Given** o personagem já votou, **When** o jogador toca em outra opção, **Then** o voto passa para a nova opção (continua sendo um voto só); tocar na opção em que já votou retira o voto.
3. **Given** um jogador tem dois personagens aprovados na campanha, **When** vota com cada um (trocando o personagem atual), **Then** cada personagem conta como um voto.
4. **Given** o mestre está falando como "Mestre", **When** toca numa opção, **Then** o voto conta como o voto do Mestre (um único voto).
5. **Given** votos registrados, **When** alguém toca em "Ver votos", **Then** abre uma janela com cada opção, sua contagem e a lista de quem votou nela (foto e nome do personagem ou "Mestre"), as mais votadas primeiro.
6. **Given** outra pessoa vota, **When** o usuário está com o chat aberto, **Then** as contagens se atualizam sem recarregar.

---

### User Story 4 - A enquete se comporta como as outras mensagens (Priority: P2)

A enquete pode ser respondida, receber reações, ser copiada e ser apagada por quem a criou ou pelo mestre, como as mensagens comuns.

**Why this priority**: consistência com o chat, mas a enquete já é útil sem isso.

**Independent Test**: segurar o cartão da enquete e usar Responder, Curtir, Copiar e Apagar.

**Acceptance Scenarios**:

1. **Given** um cartão de enquete, **When** o usuário o segura, **Then** a barra oferece Curtir, Amei, Gargalhada, Responder, Copiar e (para o autor ou o mestre) Apagar — nunca "Ação".
2. **Given** uma resposta a uma enquete, **When** exibida, **Then** a citação mostra "Enquete:" seguida da pergunta.
3. **Given** "Copiar" numa enquete, **When** usado, **Then** a área de transferência recebe a pergunta e as opções, uma por linha, com a contagem de votos.
4. **Given** a enquete apagada, **When** os participantes olham o chat, **Then** ela aparece como mensagem apagada e não aceita mais votos.

---

### Edge Cases

- Opções repetidas (mesmo texto, ignorando maiúsculas e espaços) não podem ser enviadas: a janela avisa e não envia.
- Pergunta com mais de 300 caracteres ou opção com mais de 100 não é aceita.
- Um usuário sem personagem escolhido (nem mestre) vê a enquete e os resultados mas não pode votar; ao tocar numa opção é avisado para escolher um personagem.
- Um personagem que deixou de estar aprovado na campanha tem seus votos mantidos na contagem, mas não pode mais votar nem trocar o voto.
- Um personagem apagado tem seus votos removidos da contagem.
- Tocar rapidamente em duas opções seguidas deixa o voto na última tocada.
- Duas pessoas votando ao mesmo tempo: nenhum voto é perdido e a contagem final é a soma correta.
- Sem conexão em tempo real, as contagens se atualizam na próxima atualização periódica do chat.
- Enquetes não expiram e não são encerradas: continuam aceitando votos até serem apagadas.

## Requirements *(mandatory)*

### Functional Requirements

**Gargalhada**

- **FR-001**: O sistema MUST oferecer uma terceira reação, "Gargalhada", com as mesmas regras de "Curtir" e "Amei": uma reação por pessoa por mensagem; escolher a mesma remove, escolher outra troca.
- **FR-002**: A barra que abre ao segurar uma mensagem MUST mostrar Gargalhada sempre que mostrar Curtir e Amei, com o mesmo tamanho de toque.
- **FR-003**: O selo de reações e a lista de quem reagiu MUST mostrar a gargalhada com um ícone e uma cor próprios, distintos de Curtir e Amei.
- **FR-004**: Reações de gargalhada MUST chegar aos outros participantes em tempo real, como as demais, e não geram notificação.

**Enquete — criação**

- **FR-005**: O clipe de papel MUST ter a opção "Enquete" para quem pode escrever no chat da campanha (o mestre ou um jogador com personagem aprovado escolhido).
- **FR-006**: "Enquete" MUST abrir uma janela com um campo de pergunta e uma lista de opções; uma nova opção vazia aparece quando a última deixa de estar vazia, até 12 opções; opções vazias são ignoradas no envio.
- **FR-007**: O envio MUST exigir pergunta (1–300 caracteres) e de 2 a 12 opções não vazias (1–100 caracteres cada), sem opções repetidas.
- **FR-008**: O usuário MUST poder reordenar e remover opções antes de enviar.
- **FR-009**: A enquete MUST ser publicada no chat em nome de quem fala no momento (o personagem escolhido ou "Mestre"), no turno atual, e notificar os participantes como uma mensagem de chat comum.
- **FR-010**: Uma enquete é sempre de **uma pergunta**; para várias perguntas o usuário cria várias enquetes.

**Enquete — voto**

- **FR-011**: Cada personagem aprovado na campanha MUST poder votar em exatamente uma opção de cada enquete; o mestre, falando como "Mestre", tem um voto próprio.
- **FR-012**: O voto MUST ser registrado em nome do personagem atualmente escolhido pelo jogador (ou do Mestre).
- **FR-013**: O votante MUST poder trocar o voto a qualquer momento, como no WhatsApp: tocar em outra opção move o voto para ela e tocar na opção em que já votou retira o voto.
- **FR-014**: O cartão MUST mostrar, por opção, um círculo de seleção (marcado na opção em que o personagem atual votou), o texto, a contagem de votos, uma barra proporcional ao total e até 3 fotos de quem votou nela.
- **FR-015**: Os votos MUST ser públicos para os participantes: "Ver votos" abre uma janela com cada opção, sua contagem e quem votou nela, ordenadas da mais votada para a menos.
- **FR-016**: Novos votos MUST aparecer para os demais participantes em tempo real e não geram notificação.
- **FR-017**: Uma enquete apagada MUST deixar de aceitar votos.

**Enquete — integração com o chat**

- **FR-018**: A enquete MUST aceitar Responder, as três reações, Copiar e Apagar (pelo autor ou pelo mestre), nunca a conversão em ação.
- **FR-019**: A enquete MUST ficar disponível também para assistentes de IA da mesa (criar, votar e ler resultados), com as mesmas permissões.
- **FR-020**: A enquete MUST NOT afetar as regras de turno (não é ação, não conta para "falta apenas você").

### Key Entities

- **Reação**: a reação de uma pessoa a uma entrada do chat — agora Curtir, Amei ou Gargalhada.
- **Enquete**: uma entrada do chat com autor (personagem ou Mestre), pergunta e momento; pertence à campanha e ao turno em que foi criada.
- **Opção da enquete**: texto e posição dentro da enquete (2 a 12).
- **Voto**: o voto de um personagem (ou do Mestre) numa opção de uma enquete; no máximo um por votante por enquete; registra quem votou e quando.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário reage com gargalhada em no máximo 2 toques a partir de segurar a mensagem.
- **SC-002**: Um usuário cria e envia uma enquete com pergunta e 3 opções em menos de 1 minuto.
- **SC-003**: Um voto aparece para os outros participantes conectados em menos de 2 segundos.
- **SC-004**: Em qualquer enquete, a soma das contagens é igual ao número de votantes distintos (nenhum personagem conta duas vezes).
- **SC-005**: 100% das tentativas de enviar uma enquete inválida (sem pergunta, menos de 2 opções, opções repetidas) são barradas com uma mensagem clara antes do envio.

## Assumptions

- Visual baseado na enquete do WhatsApp: cartão com a pergunta em destaque, "Escolha uma opção", opções com círculo de seleção, contagem à direita, barra verde e fotos dos votantes, e "Ver votos" no rodapé; a janela de criação tem "Pergunta", "Opções" com linhas que crescem e controles para reordenar.
- Uma única resposta por votante (o pedido diz "votar uma vez"); a opção "permitir várias respostas" do WhatsApp fica fora.
- Votos são por **personagem**, como o pedido diz; um jogador com dois personagens aprovados vota duas vezes, uma com cada.
- Enquetes não são editadas depois de enviadas, nem encerradas manualmente, nem expiram.
- Quem pode ver o chat (mestre e participantes aprovados) vê a enquete e os votos.
- Votos e reações não geram notificação push; a criação da enquete notifica como uma mensagem.
- A cor da gargalhada segue a paleta do chat (a curtida é amarela e o amei vermelho); a escolha final é de design.
