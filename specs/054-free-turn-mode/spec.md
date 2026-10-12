# Feature Specification: Modo livre do turno

**Feature Branch**: `054-free-turn-mode`
**Created**: 2026-10-12
**Status**: Draft
**Input**: User description: "Crie um modo livre: uma flag "Livre" q o GM pode ativa no menu; esse modo que dizer q o turno é livre; o personagem pode ter multiplas ações no turno; mas no mapa fica registrado apenas a ultima; a ferramenta de processar turno tb não muda; enquanto estiver ativo não fica aparecendo a lista de personagem q ainda não fizeram ações; todo personagem pode mover livremente no mapa, sem ficar o rastro; não precisa ter um contando de movimento; quando o GM desmarcar o modo livre, deve configurar de seja finalizar o turno livre; se sim deve fechar o turno antes de voltar para o modo de turnos ativos"

## Contexto

Hoje toda campanha ativa joga em **turnos**: cada personagem tem uma ação válida por turno (a anterior é cancelada), um único movimento por turno limitado pelo seu Deslocamento e desenhado como rastro no mapa, e o mestre vê quem ainda não agiu antes de finalizar o turno. Isso é bom para combate, mas pesado para as cenas de exploração, conversa e viagem, em que a mesa quer apenas conversar e andar pelo mapa sem contar pontos nem esperar todo mundo.

O **modo livre** é uma chave que o mestre liga na campanha para dizer "este turno é livre": várias ações por personagem, movimento sem limite e sem rastro, nenhuma cobrança de quem falta. Tudo continua sendo registrado na linha do tempo da campanha, e a ferramenta de processar o turno continua funcionando exatamente como hoje. Ligar ou desligar a chave não mexe no turno: o turno em andamento segue o mesmo, só as regras mudam; ao ligar, os rastros de movimento somem do mapa e cada peça fica onde está.

## Clarifications

### Session 2026-10-12

- Q: Os movimentos feitos em modo livre entram na linha do tempo? → A: Não. Nenhum movimento é registrado; o resumo e os dados do turno mostram só as posições atuais; "Resetar turno" só cancela ações.
- Q: Ao desligar o modo livre, o turno deve ser finalizado? → A: Não, e nem se pergunta: desligar a chave só devolve as regras normais; o turno em andamento continua como está e o mestre o finaliza quando quiser.
- Q: O que acontece com os rastros de movimento ao ligar o modo livre? → A: Desaparecem do mapa; as peças mantêm a posição atual.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mestre liga e desliga o modo livre (Priority: P1)

O mestre encontra no menu da mesa a chave **"Livre"**. Ligada, a campanha entra em modo livre e todos os participantes veem que o turno está livre; os rastros de movimento somem do mapa e cada peça fica onde está. Desligada, a mesa volta às regras normais de turno **no mesmo turno em andamento**, sem pergunta e sem fechar nada: o mestre finaliza o turno quando quiser, pelo botão de sempre.

**Why this priority**: Sem a chave não existe o modo; é a base das outras histórias e já entrega o aviso à mesa de que as regras mudaram.

**Independent Test**: O mestre liga "Livre"; um jogador em outra sessão vê a indicação de turno livre sem recarregar. O mestre desliga: a indicação some para todos e o número do turno não muda.

**Acceptance Scenarios**:

1. **Given** uma campanha em modo de turnos, **When** o mestre liga a chave "Livre", **Then** a campanha passa ao modo livre e todos os participantes conectados veem a indicação "Turno livre" sem recarregar a página.
2. **Given** um mapa com rastros de movimento do turno em andamento, **When** o mestre liga a chave "Livre", **Then** os rastros desaparecem do mapa para todos e cada peça permanece exatamente onde estava.
3. **Given** uma campanha em modo livre, **When** o mestre desliga a chave, **Then** nenhuma pergunta é feita: a campanha volta ao modo de turnos no mesmo turno em andamento, com tudo o que já foi feito nele, e o número do turno não muda.
4. **Given** uma campanha que acabou de sair do modo livre, **When** o mestre quer fechar o turno, **Then** usa "Finalizar turno" como sempre (com a lista de pendentes de hoje).
5. **Given** uma campanha que acabou de sair do modo livre, **When** os participantes olham o mapa, **Then** nenhum rastro aparece para os movimentos feitos durante o período livre; só os movimentos feitos depois voltam a deixar rastro.
6. **Given** um jogador participante, **When** ele olha o menu da mesa, **Then** vê a indicação do modo livre, mas não tem como ligá-lo ou desligá-lo.
7. **Given** uma campanha em modo livre, **When** o mestre finaliza o turno pelo botão de sempre ou processa o turno com a ferramenta de assistente, **Then** o turno fecha e a campanha **continua** em modo livre no turno seguinte.
8. **Given** uma campanha que sai e depois volta para o modo livre, **When** os participantes recarregam a página, **Then** veem o estado atual da chave (o modo é da campanha, não da sessão de quem o ligou).

---

### User Story 2 - Várias ações por personagem no turno livre (Priority: P1)

Em modo livre, um personagem (ou um NPC, pelo mestre) pode registrar quantas ações quiser no mesmo turno. Cada ação entra na linha do tempo da campanha como hoje e o mestre é avisado de cada uma. No **mapa**, o balão de fala do personagem mostra apenas a **última** ação; o resumo do turno e os dados do turno lidos pela ferramenta de processar listam **todas** as ações válidas, na ordem em que aconteceram.

**Why this priority**: É o motivo do modo: conversar e agir várias vezes sem cancelar o que veio antes.

**Independent Test**: Em modo livre, um jogador registra três ações seguidas; as três aparecem no chat como ações válidas, o balão no mapa mostra só a terceira e o resumo do turno lista as três.

**Acceptance Scenarios**:

1. **Given** modo livre e um personagem que já agiu no turno, **When** o jogador registra outra ação (pelo mapa, pelo chat em modo Ação, convertendo uma mensagem em ação ou por um assistente), **Then** a nova ação é aceita e a anterior **não** é cancelada: as duas ficam válidas na linha do tempo.
2. **Given** modo livre e um personagem com várias ações no turno, **When** alguém olha o mapa, **Then** o balão de fala da peça mostra apenas a última ação válida.
3. **Given** modo livre e um personagem com várias ações no turno, **When** o mestre abre o resumo do turno ou um assistente lê os dados do turno, **Then** todas as ações válidas do personagem aparecem, na ordem em que foram feitas.
4. **Given** modo livre, **When** o mestre processa o turno com a ferramenta de assistente, **Then** o processamento funciona exatamente como hoje (alterações, posições, narração e fechamento do turno), tendo visto todas as ações.
5. **Given** modo livre e um personagem com várias ações, **When** o jogador apaga uma delas pelo chat, **Then** apenas aquela é cancelada; as outras continuam válidas e o balão passa a mostrar a última que restou.
6. **Given** modo livre e um personagem com várias ações, **When** o jogador usa "Resetar turno", **Then** todas as ações do personagem no turno são canceladas e a peça fica onde está.
7. **Given** uma campanha que voltou ao modo de turnos sem fechar o turno, com um personagem que tem várias ações válidas do período livre, **When** esse personagem registra uma nova ação, **Then** a regra normal volta a valer: as ações anteriores do turno são canceladas e só a nova fica válida.
8. **Given** modo livre, **When** um NPC do mestre registra uma segunda ação no turno, **Then** vale o mesmo que para os personagens.

---

### User Story 3 - Ninguém é cobrado no turno livre (Priority: P2)

Em modo livre não existe "quem ainda não agiu": as figuras dos personagens pendentes sobre o chat não aparecem, "Finalizar turno" fecha o turno sem a lista de pendentes nem o "Finalizar mesmo assim", e o aviso de maioria ("Falta apenas você e …") não é enviado.

**Why this priority**: Sem isso o modo livre continuaria cobrando os jogadores por algo que o modo não exige.

**Independent Test**: Em modo livre com dois personagens aprovados, um age e o outro não; nenhuma figura de pendente aparece sobre o chat e "Finalizar turno" fecha o turno de imediato, sem perguntar.

**Acceptance Scenarios**:

1. **Given** modo livre e personagens aprovados que ainda não agiram, **When** qualquer participante olha o chat, **Then** as figuras dos pendentes não aparecem.
2. **Given** modo livre e personagens que ainda não agiram, **When** o mestre finaliza o turno, **Then** o turno fecha de imediato, sem a lista de pendentes e sem pedir confirmação.
3. **Given** modo livre, **When** metade dos personagens aprovados já agiu, **Then** nenhum aviso de "Falta apenas você…" é enviado aos demais.
4. **Given** a campanha de volta ao modo de turnos, **When** há personagens sem ação válida no turno, **Then** as figuras dos pendentes e a lista do "Finalizar turno" voltam a aparecer como hoje.

---

### User Story 4 - Movimento livre, sem rastro e sem contador (Priority: P2)

Em modo livre, todo personagem (e NPC, pelo mestre) pode mover a sua peça quantas vezes quiser no turno, para qualquer hex livre do mapa, sem limite de pontos de Deslocamento. O mapa não desenha o rastro do movimento nem mostra o contador de pontos durante o "Mover"; a peça apenas vai para o destino e aponta para onde o jogador escolheu.

**Why this priority**: Andar livremente é a segunda metade do modo; depende da chave da história 1 mas não das ações da história 2.

**Independent Test**: Em modo livre, um jogador move seu personagem do canto ao canto oposto de um mapa grande (muito além do seu Deslocamento) e em seguida move de novo; os dois movimentos são aceitos, sem rastro e sem contador.

**Acceptance Scenarios**:

1. **Given** modo livre e um jogador com seu personagem no mapa, **When** ele escolhe um destino mais distante do que o seu Deslocamento permitiria, **Then** o movimento é aceito.
2. **Given** modo livre e uma peça que já se moveu no turno, **When** o jogador escolhe "Mover" de novo, **Then** a opção está disponível e o novo movimento é aceito.
3. **Given** modo livre, **When** um jogador está escolhendo o destino do movimento, **Then** o caminho não é desenhado como rastro, o contador de pontos não aparece e nenhum destino é mostrado como "fora do alcance" — apenas um hex ocupado ou fora da grade continua indisponível.
4. **Given** modo livre e uma peça movida, **When** qualquer participante olha o mapa ou o chat, **Then** nenhum rastro de movimento é desenhado para essa peça e nenhuma linha de movimento entra na linha do tempo.
5. **Given** modo livre, **When** o mestre move uma peça de NPC ou de objeto, **Then** vale o mesmo: sem limite, sem rastro, sem contador.
6. **Given** a campanha de volta ao modo de turnos, **When** um jogador tenta um segundo movimento no mesmo turno ou um destino além do Deslocamento, **Then** a recusa de hoje volta a valer (o movimento feito no período livre não conta como "o movimento do turno").
7. **Given** uma campanha fora do status Ativa, **When** um jogador tenta mover em modo livre, **Then** continua recusado como hoje — o modo livre não afrouxa o status da campanha.

---

### Edge Cases

- O mestre liga o modo livre com personagens que já agiram ou se moveram no turno em andamento: nada é cancelado; a partir daí valem as regras do modo livre e o rastro dos movimentos anteriores deixa de ser desenhado.
- O mestre desliga o modo livre com personagens que têm várias ações válidas: elas continuam válidas até a próxima ação de cada um (cenário 2.7); o balão continua mostrando a última.
- Dois mestres não existem, mas o mesmo mestre em duas abas: a chave muda em uma e a outra atualiza sem recarregar.
- Um assistente (integração) registra ações ou movimentos durante o modo livre: as mesmas regras valem, pois são regras da campanha e não da tela.
- O mestre processa o turno com a ferramenta de assistente em modo livre: o turno fecha, o modo livre permanece ligado.
- Voltar o turno atual ou avançá-lo pela administração do registro em modo livre: funciona como hoje; o modo não muda.
- Modo livre ligado numa campanha que depois é pausada ou finalizada: a chave permanece ligada, mas nada pode ser feito até a campanha voltar a Ativa.
- "Cutucar" em modo livre: continua disponível e cutuca os jogadores cujos personagens ainda não registraram nenhuma ação no turno (é um gesto do mestre, não uma cobrança automática).
- Whispers, respostas, reações, enquetes e o chat de conversa: inalterados.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A campanha MUST ter um estado "modo livre" (ligado/desligado), desligado por padrão, guardado na campanha e visível a todos os participantes.
- **FR-002**: Somente o mestre MUST poder ligar ou desligar o modo livre, por uma chave "Livre" no menu da mesa; para os demais participantes a chave aparece apenas como indicação.
- **FR-003**: Toda mudança do modo livre MUST chegar aos participantes conectados sem recarregar a página, e as sessões que recarregam MUST ver o estado atual.
- **FR-004**: Ligar ou desligar o modo livre MUST NOT alterar o turno em andamento (nem finalizá-lo, nem avançar o número, nem cancelar ações) e MUST NOT pedir confirmação; ao ligar, os rastros de movimento do turno MUST desaparecer do mapa para todos e as peças MUST manter a posição atual.
- **FR-005**: Finalizar o turno, processar o turno por assistente ou avançar o turno pela administração do registro MUST NOT desligar o modo livre.
- **FR-006**: Em modo livre, registrar uma ação MUST NOT cancelar as ações válidas anteriores do mesmo ator no turno; todas ficam válidas na linha do tempo.
- **FR-007**: Em modo livre, o balão de fala de uma peça no mapa (2D e 3D) MUST mostrar apenas a última ação válida do ator no turno.
- **FR-008**: O resumo do turno e os dados do turno lidos por assistentes MUST listar todas as ações válidas de cada ator, na ordem em que foram registradas, em modo livre.
- **FR-009**: A ferramenta de processar o turno MUST funcionar em modo livre exatamente como fora dele (mesmas entradas, mesmas alterações, mesmo fechamento do turno).
- **FR-010**: Em modo livre, apagar uma ação pelo chat MUST cancelar apenas aquela ação; "Resetar turno" MUST cancelar todas as ações do ator no turno (sem mover a peça, pois não há movimentos registrados).
- **FR-011**: Em modo livre, as figuras dos personagens pendentes sobre o chat MUST NOT aparecer, "Finalizar turno" MUST fechar o turno sem lista de pendentes nem confirmação, e o aviso de maioria ("Falta apenas você…") MUST NOT ser enviado.
- **FR-012**: Em modo livre, mover uma peça MUST ser aceito sem limite de pontos de Deslocamento e sem limite de um movimento por turno, para qualquer destino dentro da grade que esteja livre para a forma da peça; isso vale para jogadores (nos próprios personagens), para o mestre e para assistentes.
- **FR-013**: Em modo livre, durante o "Mover" o mapa MUST NOT mostrar o contador de pontos nem marcar destinos como "fora do alcance", e MUST NOT desenhar rastros de movimento no mapa (nem dos movimentos feitos antes de ligar o modo).
- **FR-014**: Ao voltar ao modo de turnos (sempre no mesmo turno em andamento), as regras normais MUST valer a partir da próxima ação ou movimento de cada ator: a próxima ação cancela as anteriores do turno, e o movimento volta a ser um por turno e limitado pelo Deslocamento, sem que os movimentos do período livre contem como "o movimento do turno".
- **FR-015**: O modo livre MUST NOT afrouxar o status da campanha: fora de Ativa, ações e movimentos continuam recusados como hoje, e a chave pode ser ligada ou desligada em qualquer status.
- **FR-016**: As regras do modo livre MUST valer para toda forma de registrar ações e movimentos (mapa, chat, conversão de mensagem, assistentes/integrações), pois são regras da campanha.
- **FR-017**: Em modo livre, os movimentos de peças MUST NOT ser registrados na linha do tempo da campanha (nenhuma linha "moveu de X para Y" no chat); o resumo e os dados do turno MUST mostrar apenas as posições atuais das peças, e "Resetar turno" MUST cancelar apenas as ações, deixando a peça onde está.

### Key Entities

- **Campanha**: ganha o estado "modo livre" (ligado/desligado), mudado apenas pelo mestre e lido por todos os participantes.
- **Turno em andamento**: no modo livre pode conter várias ações válidas por ator; não é afetado por ligar ou desligar o modo, e ao fechar (por qualquer caminho) continua gerando o divisor e o aviso de turno terminado como hoje.
- **Ação do turno**: deixa de ser única por ator enquanto a campanha está em modo livre; a "última ação válida" passa a ser o que o mapa exibe.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O mestre liga ou desliga o modo livre com um único toque, e todos os participantes conectados veem a mudança em até 2 segundos.
- **SC-002**: Em modo livre, 100% das ações registradas por um personagem no mesmo turno permanecem válidas na linha do tempo e aparecem no resumo do turno; o mapa mostra apenas a última.
- **SC-003**: Em modo livre, 100% dos movimentos para hexes livres dentro da grade são aceitos, independentemente da distância e do número de movimentos no turno, e nenhum rastro ou contador aparece.
- **SC-004**: Em modo livre, nenhuma figura de pendente, lista de pendentes ou aviso de maioria é mostrado ou enviado em uma sessão de teste com personagens que não agiram.
- **SC-005**: Ao desligar o modo livre, o número do turno não muda e, a partir da próxima ação ou movimento de cada ator, as regras normais (uma ação válida, um movimento limitado) voltam a ser aplicadas em 100% das tentativas de teste.
- **SC-006**: Processar o turno por assistente em modo livre produz o mesmo resultado (alterações aplicadas, narração registrada, turno fechado) que fora dele, com todas as ações do turno disponíveis na leitura dos dados.

## Assumptions

- A chave "Livre" fica ao lado dos controles de turno do mestre no menu da mesa, e a indicação "Turno livre" para todos fica junto do número do turno (menu e rodapé do mapa).
- O modo livre é um estado da campanha (persiste entre sessões e turnos) e não um estado de um turno específico: ele continua ligado até o mestre desligá-lo.
- Ligar e desligar são ações imediatas, sem confirmação; fechar o turno continua sendo uma decisão separada do mestre ("Finalizar turno" ou processamento por assistente).
- Os avisos de ação ao mestre (uma notificação por ação) e de turno terminado aos jogadores continuam como hoje; apenas o aviso de maioria deixa de existir em modo livre.
- "Cutucar" continua disponível em modo livre e alcança os jogadores cujos personagens não têm nenhuma ação no turno.
- Os movimentos do período livre não constam na linha do tempo; ao voltar ao modo de turnos, as posições de partida do turno são as posições em que as peças estão nesse momento.
- Os pontos coloridos de "já agiu" nas cartas do grupo e dos NPCs continuam funcionando: um ator com pelo menos uma ação válida conta como "agiu".
- As regras de ocupação do mapa (forma da peça dentro da grade, hexes livres) não mudam: livre é o alcance, não a colisão.
- O movimento do mestre já era ilimitado; em modo livre ele apenas deixa de ser um por turno e de desenhar rastro, como para os jogadores.
- Integrações e assistentes que já usam as ferramentas de turno seguem as mesmas regras automaticamente, pois elas são aplicadas pela campanha e não pela tela.
