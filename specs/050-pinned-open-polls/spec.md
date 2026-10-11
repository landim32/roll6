# Feature Specification: Enquete em aberto fixada no fim do chat

**Feature Branch**: `050-pinned-open-polls`
**Created**: 2026-10-11
**Status**: Draft
**Input**: User description: "altere a enquete: a enquete que não foi respondida por todos os jogadores deve ficar sempre na parte mais baixa do chat; sempre que uma mensagem for escrita e a enquete ainda não foi respondida por todos, ela deve aparecer acima da enquete; ela só deve seguir o mesmo fluxo quando todos os jogadores tiverem respondido; enquetes também podem ser excluídas por quem criou ou pelo GM"

## Contexto

Hoje uma enquete entra no chat como qualquer mensagem: assim que alguém escreve, ela sobe e logo some da tela, e quem ainda não votou não a vê mais. A mesa quer que a enquete **em aberto** (alguém ainda não votou) fique sempre no fim do chat, com as mensagens novas entrando **acima** dela, até que todos tenham respondido. Também deve ser possível excluir uma enquete: quem a criou ou o mestre.

## Clarifications

### Session 2026-10-11

- Q: Quem precisa votar para a enquete contar como respondida por todos? → A: Cada personagem aprovado na campanha (um voto por personagem), sem contar o mestre.
- Q: Quando todos votam, onde a enquete fica? → A: Fica onde está — logo após a última entrada daquele momento; as entradas seguintes entram abaixo dela. Nada pula na tela.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enquete em aberto sempre no fim do chat (Priority: P1)

Enquanto falta alguém votar, a enquete fica na parte mais baixa do chat. Toda mensagem nova (texto, foto, áudio, rolagem, ação, narração, registros de turno) aparece acima dela. A enquete continua visível para todos sem precisar rolar a conversa.

**Why this priority**: É o problema central: a enquete some antes de todos votarem.

**Independent Test**: O mestre cria uma enquete numa mesa com dois jogadores. Um jogador vota, o outro não. Três mensagens são enviadas: as três aparecem acima da enquete, que continua sendo o último item do chat para todos.

**Acceptance Scenarios**:

1. **Given** uma enquete em que nem todos votaram, **When** qualquer participante envia uma mensagem, **Then** a mensagem aparece imediatamente acima da enquete e a enquete continua sendo o último item do chat.
2. **Given** uma enquete em aberto, **When** um participante abre o chat (ou recarrega a página), **Then** a enquete aparece no fim do chat, mesmo que tenha sido criada há muitas mensagens.
3. **Given** duas enquetes em aberto, **When** o chat é exibido, **Then** ambas ficam no fim, a mais antiga acima da mais nova, e todas as mensagens ficam acima delas.
4. **Given** uma enquete em aberto, **When** o participante já votou, **Then** ela continua fixada no fim (a regra é "todos votaram", não "eu votei").

---

### User Story 2 - Enquete respondida volta ao fluxo normal (Priority: P1)

Quando o último jogador que faltava vota, a enquete deixa de estar fixada e passa a se comportar como qualquer mensagem: as mensagens novas entram abaixo dela.

**Why this priority**: Sem isso a enquete ficaria presa no fim para sempre.

**Independent Test**: Na mesa do teste anterior, o segundo jogador vota. Uma nova mensagem é enviada e aparece abaixo da enquete.

**Acceptance Scenarios**:

1. **Given** uma enquete em aberto, **When** o último jogador que faltava vota, **Then** todos os participantes veem a enquete deixar de estar fixada, sem recarregar a página.
2. **Given** uma enquete que todos responderam, **When** alguém envia uma mensagem, **Then** a mensagem aparece abaixo da enquete.
3. **Given** uma enquete respondida por todos, **When** um jogador retira o voto, **Then** a enquete volta a ficar fixada no fim do chat.
4. **Given** uma enquete em aberto com mensagens acima dela, **When** o último voto que faltava é dado, **Then** a enquete fica exatamente onde está (logo após a última entrada daquele momento) e nada se move na tela; a próxima mensagem entra abaixo dela.
5. **Given** uma enquete que voltou a ficar em aberto (voto retirado) e depois é respondida de novo, **When** o último voto chega, **Then** ela passa a ficar logo após a última entrada desse novo momento.

---

### User Story 3 - Excluir enquete (Priority: P2)

Quem criou a enquete ou o mestre pode excluí-la pelo menu da mensagem (segurar a mensagem), como já acontece com textos, fotos e áudios. A enquete excluída mostra "Mensagem apagada" e deixa de estar fixada.

**Why this priority**: Pedido explícito; hoje não aparece a opção de apagar numa enquete.

**Independent Test**: Um jogador cria uma enquete e a exclui pelo menu; outro jogador tenta excluí-la e não vê a opção; o mestre exclui uma enquete de outro jogador.

**Acceptance Scenarios**:

1. **Given** uma enquete criada por um jogador, **When** ele segura a enquete, **Then** o menu oferece "Apagar" e, ao confirmar, a enquete aparece como apagada para todos.
2. **Given** uma enquete de outro jogador, **When** um jogador que não é o autor segura a enquete, **Then** o menu não oferece "Apagar".
3. **Given** qualquer enquete, **When** o mestre a segura, **Then** o menu oferece "Apagar".
4. **Given** uma enquete em aberto apagada, **When** o chat é exibido, **Then** ela não está mais fixada no fim.

---

### Edge Cases

- Jogador aprovado na campanha depois da criação da enquete: passa a contar como alguém que falta votar, então a enquete volta (ou continua) fixada até ele votar.
- Jogador removido da campanha: deixa de contar; se todos os restantes já votaram, a enquete sai da fixação.
- Campanha sem nenhum personagem aprovado: a enquete nunca fica fixada (não há quem falte).
- Um jogador com dois personagens aprovados precisa votar com os dois para a enquete ser respondida.
- O mestre pode votar como hoje, mas o voto dele não muda o estado em aberto/respondida.
- Enquete sussurrada não existe (enquetes não são sussurradas), então todos os participantes veem a mesma fixação.
- Responder (citar) uma enquete fixada: a resposta aparece acima dela, e tocar na citação leva à enquete no fim.
- Enquetes antigas, criadas antes desta mudança, seguem a mesma regra: se ainda falta alguém votar, ficam fixadas.
- Muitas enquetes em aberto ao mesmo tempo: todas ficam no fim, na ordem em que foram criadas.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Uma enquete MUST ser considerada **em aberto** enquanto algum personagem aprovado na campanha não tiver votado nela (um voto por personagem; o voto do mestre não conta nem é exigido).
- **FR-002**: Enquetes em aberto MUST ser exibidas no fim do chat, abaixo de todas as outras entradas, para todos os participantes.
- **FR-003**: Toda entrada nova do chat MUST ser exibida acima das enquetes em aberto.
- **FR-004**: Com várias enquetes em aberto, elas MUST ficar no fim na ordem de criação (mais antiga acima).
- **FR-005**: Quando uma enquete deixa de estar em aberto (todos votaram), ela MUST voltar ao fluxo normal do chat para todos os participantes conectados, sem recarregar a página, **na posição em que estava naquele momento**: logo após a última entrada existente quando o último voto foi dado; as entradas seguintes aparecem abaixo dela.
- **FR-006**: Uma enquete respondida que perde um voto (ou ganha um novo jogador que ainda não votou) MUST voltar a ficar em aberto e fixada.
- **FR-007**: A enquete em aberto MUST continuar fixada mesmo quando ainda não foi carregada na conversa (por ser antiga), sem que o participante precise rolar para trás.
- **FR-008**: O autor da enquete e o mestre MUST poder excluí-la pelo menu da mensagem; os demais não.
- **FR-009**: Uma enquete excluída MUST aparecer como apagada e não ficar fixada.
- **FR-010**: A contagem de mensagens não lidas e a notificação de nova enquete MUST continuar como hoje.

### Key Entities

- **Enquete**: mensagem do chat com pergunta, opções e votos; ganha o estado derivado **em aberto / respondida por todos** (votos × personagens aprovados) e o **momento em que foi respondida por todos**, que define sua posição no chat depois disso.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Enquanto falta alguém votar, a enquete é o último item visível do chat em 100% das vezes, para todos os participantes.
- **SC-002**: Quando o último voto que faltava é dado, todos os participantes conectados veem a enquete sair da fixação em até 3 segundos.
- **SC-003**: Quem ainda não votou encontra a enquete sem rolar o chat (0 rolagens).
- **SC-004**: O autor ou o mestre excluem uma enquete em no máximo 3 toques.

## Assumptions

- A fixação vale igualmente para todos (inclusive para quem já votou), já que o objetivo é que a mesa toda veja o que está pendente.
- "Respondida" significa ter escolhido uma opção; retirar o voto conta como não respondida.
- As regras de exclusão, apagamento e "Mensagem apagada" são as mesmas das outras mensagens de conversa.
- Nada muda nas enquetes pelo assistente de IA além de refletirem o estado em aberto/respondida nas leituras.
