# Feature Specification: Modo GM — o Claude do mestre processa os turnos sozinho

**Feature Branch**: `096-campaign-gm-mode`
**Created**: 2026-10-19
**Status**: Draft
**Input**: User description: "Crie um modo GM: nesse modo, a IA faz o papel de GM; ela irá receber um chamado toda vez que os personagens fizerem uma ação; quando ela for ligada deve verificar se todos os personagens agiram; deve criar a skill "gm" na pasta c:\repos\gurps-adventure para funcionar com processar-turno, mas ela deve ser autônoma, não deve depender de aprovação do usuário; quando todos os PJs agirem ela deve processar o turno com a skill "gm"; essa skill deve voltar deslocamentos acima do permitido; o modo GM fica na campanha; ela é avisada através do console"

## Clarifications

### Session 2026-10-19

- Q: Para onde volta a peça que passou do Deslocamento? → A: Para o hex mais distante que o limite alcança no caminho
  que ela fez (o Roll6 guarda o antes e o depois do movimento, então o GM aproxima pelo caminho mais curto entre os
  dois).
- Q: O que o GM faz quando alguém ainda não agiu? → A: Só verifica quem falta; o Claude roda só quando todos agiram.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ligar o modo GM e ter o turno fechado sozinho (Priority: P1)

O mestre quer que a mesa ande sem ele ficar de guarda: os jogadores movem as peças e declaram as ações no Roll6 e,
quando o último agir, o turno é resolvido, narrado e fechado — pelo Claude que roda na máquina dele, pelo Roll6.Console,
com a skill **"gm"** do repositório da campanha. Ele liga o **Modo GM** na campanha e, dali em diante, cada ação dos
personagens avisa o GM; quando todos os personagens aprovados tiverem agido, o GM processa o turno como o mestre
faria com `processar-turno`, **sem pedir aprovação a ninguém**: resolve cada ação pelas regras, decide e resolve os
NPCs, aplica PV, Fadiga, status e posições, escreve a narração e abre o turno seguinte. A mesa vê tudo como vê hoje
quando o mestre processa: a narração no chat, o divisor do turno, os avisos de "Turno N terminado".

**Why this priority**: é o recurso em si — sem ele nada do resto tem valor.

**Independent Test**: com o console do mestre conectado e o Modo GM ligado numa campanha ativa com dois personagens
aprovados, os dois declaram ações; sem o mestre tocar em nada, em poucos minutos a narração aparece no chat, o turno
vira o seguinte e os valores dos personagens refletem o resultado.

**Acceptance Scenarios**:

1. **Given** o Modo GM desligado, **When** o mestre o liga na campanha, **Then** a campanha passa a mostrar que o Modo
   GM está ligado (para o mestre e para os jogadores) e o estado fica guardado — continua ligado ao reabrir a mesa.
2. **Given** o Modo GM ligado, o console conectado e três personagens aprovados dos quais dois já agiram, **When** o
   terceiro declara a ação, **Then** o GM começa a processar o turno e o chat mostra que ele está processando.
3. **Given** o GM processando, **When** ele termina, **Then** o turno é fechado com narração, valores e posições, sem
   nenhum passo de aprovação, e a mesa recebe os mesmos avisos de um turno fechado pelo mestre.
4. **Given** o Modo GM ligado e três personagens aprovados dos quais um ainda não agiu, **When** outro personagem age
   de novo (troca a ação), **Then** o GM é avisado mas **não** fecha o turno.
5. **Given** o Modo GM desligado, **When** o último personagem age, **Then** nada acontece além do que acontece hoje
   (o mestre fecha o turno quando quiser).

---

### User Story 2 - Verificar ao ligar o modo e ao conectar o console (Priority: P2)

O mestre liga o Modo GM no meio de um turno em que todos já agiram, ou liga o console depois de os jogadores terem
jogado enquanto ele estava fora. O GM não pode esperar a próxima ação: ao ser ligado — o modo ou o console — ele
verifica se todos os personagens já agiram e, se sim, processa o turno na hora.

**Why this priority**: sem isto o turno que ficou pronto enquanto o GM estava fora só sairia quando alguém agisse de
novo, e ninguém mais tem o que fazer.

**Independent Test**: com todos os personagens já tendo agido e o Modo GM desligado, o mestre liga o modo; em poucos
segundos o chat mostra o GM processando e o turno é fechado. Repetir com o modo ligado e o console desligado:
ligar o console produz o mesmo.

**Acceptance Scenarios**:

1. **Given** todos os personagens aprovados agiram e o console conectado, **When** o mestre liga o Modo GM, **Then** o
   processamento começa sem nenhuma ação nova.
2. **Given** o Modo GM ligado e o console desconectado, **When** o último personagem age, **Then** nada é processado e
   a campanha mostra que o GM está sem console; **When** o console conecta, **Then** o processamento começa.
3. **Given** o Modo GM ligado e um personagem ainda sem ação, **When** o console conecta, **Then** nada é processado.

---

### User Story 3 - Deslocamentos acima do permitido voltam (Priority: P2)

Um personagem foi movido além do que o seu Deslocamento permite no turno — pelo mestre, no modo livre, ou por uma
regra da ficha que o Roll6 não conhece (Carga, ferimento, terreno). Antes de resolver as ações, o GM confere o
movimento de cada personagem contra as regras do repositório (como `validar-movimento` já faz) e **devolve a peça**
de quem passou do limite, avisando a mesa de quem voltou e por quê. A ação declarada é então resolvida de onde a
peça ficou.

**Why this priority**: sem GM humano, ninguém mais impede um movimento indevido; é a regra que o mestre mais
confere.

**Independent Test**: no modo livre, um jogador anda 12 hexes com Deslocamento 5 e declara um ataque; o GM processa o
turno; a peça está dentro do limite, a narração diz que ela voltou, e o ataque foi resolvido de onde a peça ficou (ou
falhou por estar fora do alcance).

**Acceptance Scenarios**:

1. **Given** um personagem que se moveu mais do que o permitido, **When** o GM processa o turno, **Then** a peça termina
   no hex mais distante que o limite alcança no caminho feito, o chat diz quem voltou e de onde para onde, e o
   restante do turno é resolvido com a peça lá.
2. **Given** um personagem que se moveu dentro do permitido, **When** o GM processa, **Then** a peça não é tocada.
3. **Given** um personagem com uma manobra que muda o limite (por exemplo, correr), **When** o GM confere, **Then** usa o
   limite da manobra declarada, como as regras do repositório mandam.

---

### User Story 4 - Acompanhar e controlar o GM (Priority: P3)

Mestre e jogadores precisam saber o que o GM está fazendo, e o mestre precisa poder retomar o controle. A mesa mostra
que o Modo GM está ligado, se o GM tem console para trabalhar e quando está processando; o chat recebe uma linha
quando ele começa, quando termina (a própria narração) e quando falha. O mestre desliga o modo a qualquer momento —
inclusive no meio de um processamento, que é interrompido e deixa o turno aberto para ele fechar à mão. Um
processamento que falha ou demora demais também deixa o turno aberto e avisa o mestre.

**Why this priority**: dá confiança para deixar o GM ligado; sem isso o mestre não sabe se pode sair da frente.

**Independent Test**: com o GM processando, o mestre desliga o modo; o chat diz que o processamento foi interrompido, o
turno continua o mesmo e "Finalizar turno" funciona como sempre.

**Acceptance Scenarios**:

1. **Given** o Modo GM ligado, **When** qualquer participante olha a mesa, **Then** vê um sinal de Modo GM (e, para o
   mestre, se o console está conectado).
2. **Given** o GM processando, **When** o mestre desliga o modo, **Then** o processamento para, o chat avisa, o turno
   fica aberto e nada do que o GM ainda não tinha gravado é aplicado.
3. **Given** o GM processando, **When** o processamento falha ou passa do tempo limite, **Then** o turno fica aberto, o
   chat mostra a falha ao mestre e ele recebe uma notificação.
4. **Given** uma campanha que não está Ativa (preparando, pausada, finalizada), **When** o Modo GM está ligado e todos
   agem, **Then** nada é processado — o modo só trabalha em campanhas ativas.

---

### User Story 5 - A skill "gm" do repositório da campanha (Priority: P3)

O GM trabalha com a skill **"gm"** da pasta do repositório da campanha (`c:\repos\gurps-adventure`), criada por esta
feature: é o `processar-turno` em versão **autônoma** — lê a mesa, confere os movimentos, resolve, registra no
repositório e fecha o turno — e **nunca espera aprovação nem faz perguntas**: quando `processar-turno` pararia para
perguntar ao mestre, a "gm" decide pela opção mais conservadora das regras e deixa a dúvida registrada para o mestre
(na narração ou num aviso), sem travar a mesa.

**Why this priority**: é a peça que faz o GM saber jogar; sem ela o Roll6 só avisa e ninguém processa. Fica em
P3 porque é entregue junto com a P1 (uma não funciona sem a outra), mas pode ser testada à parte, no terminal.

**Independent Test**: no repositório da campanha, com um turno pronto no Roll6, rodar a skill "gm" no terminal fecha o
turno sem nenhuma pergunta e deixa o log, as anotações e a narração gravados como `processar-turno` deixaria.

**Acceptance Scenarios**:

1. **Given** um turno em que todos agiram, **When** a skill "gm" roda, **Then** fecha o turno sem pedir nada, com o mesmo
   registro no repositório que `processar-turno` faz.
2. **Given** um turno em que falta alguém agir, **When** a skill "gm" roda, **Then** não fecha nada e diz quem falta.
3. **Given** uma situação em que `processar-turno` pararia para perguntar, **When** a skill "gm" a encontra, **Then** decide
   pela opção conservadora, segue, e a dúvida aparece registrada para o mestre.

---

### Edge Cases

- Dois personagens agem quase ao mesmo tempo: o GM processa uma vez só; o segundo aviso, chegando durante o
  processamento, não começa outro.
- Um jogador troca ou reseta a ação depois de o GM ter começado: o GM trabalha com o que leu ao começar; se, ao ler,
  já não estiver todo mundo com ação, não fecha nada e volta a esperar.
- O mestre também joga com personagens: eles contam como PJs e o próprio mestre precisa agir com eles.
- O console do mestre cai no meio do processamento: o processamento falha, o turno fica aberto, o mestre é avisado;
  quando o console voltar, o GM verifica de novo (US2).
- O mestre pede uma pergunta ("Perguntar") enquanto o GM processa: os pedidos ao console são atendidos um por vez, na
  ordem; nenhum se perde.
- Campanha sem nenhum personagem aprovado: "todos agiram" nunca é verdade; nada é processado.
- Modo livre: as ações continuam existindo e o GM fecha o turno quando todos agirem, como o "Finalizar turno" faz no
  modo livre; o Roll6 não registra os movimentos nesse modo (não há "de onde saiu"), então a conferência de
  Deslocamento da US3 não tem rota para olhar e as peças ficam onde estão — a conferência vale no modo normal, onde
  o Roll6 só limita pelo Deslocamento da campanha e as regras da ficha (Carga, ferimentos, Fadiga, terreno) podem
  permitir menos.
- O GM tenta fechar o turno e o Roll6 recusa (campanha mudou de status, turno já fechado pelo mestre): o GM termina
  sem fechar e o mestre vê o motivo.
- O turno é processado pelo mestre à mão enquanto o GM trabalha: o fechamento do GM falha (turno já fechado) e o chat
  diz isso; nada é aplicado duas vezes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O mestre MUST poder ligar e desligar o **Modo GM** de cada campanha sua, em qualquer status da campanha;
  o estado fica guardado com a campanha e é visto por todos os participantes.
- **FR-002**: Com o Modo GM ligado, toda ação declarada por um personagem (nova, trocada ou convertida de mensagem)
  MUST avisar o GM da campanha pelo console do mestre.
- **FR-003**: Ao ser avisado, o GM MUST verificar se **todos os personagens aprovados** da campanha têm uma ação válida
  no turno em andamento — a mesma regra que hoje lista quem falta para o "Finalizar turno".
- **FR-004**: Quando todos agiram, a campanha está Ativa e o console do mestre está conectado, o sistema MUST iniciar
  **um** processamento do turno com a skill "gm"; nunca mais de um por campanha ao mesmo tempo; um aviso que chega
  durante um processamento não inicia outro.
- **FR-005**: O processamento MUST ser autônomo: nenhum passo pede aprovação ou resposta ao mestre; ao terminar, o
  turno está fechado com narração, valores, status e posições, exatamente como o mestre fecha hoje
  (`processar-turno` + `process_turn`).
- **FR-006**: O que o GM faz MUST aparecer na mesa como feito pelo mestre (autor do log, da narração e dos avisos), e
  MUST produzir os mesmos avisos aos jogadores que um turno fechado pelo mestre produz.
- **FR-007**: Antes de resolver as ações, o GM MUST conferir o movimento de cada personagem contra o Deslocamento que as
  regras do repositório lhe dão no turno e **voltar** a peça de quem passou do limite para o hex mais distante que o
  limite alcança no caminho feito (aproximado pelo caminho mais curto entre o hex de onde saiu e o hex onde parou,
  já que só esses dois são guardados), avisando a mesa de quem voltou e de onde para onde; a ação do personagem é
  resolvida de onde a peça ficou.
- **FR-008**: Ao ligar o Modo GM, e ao conectar o console do mestre com o modo ligado, o sistema MUST fazer a
  verificação da FR-003 e, se todos agiram, iniciar o processamento sem esperar uma ação nova.
- **FR-009**: Enquanto um personagem ainda não agiu, um aviso de ação MUST apenas verificar quem falta: o Claude do
  mestre só roda quando todos agiram; nenhuma rodada acontece com o turno incompleto.
- **FR-010**: A mesa MUST mostrar a todos que o Modo GM está ligado e, ao mestre, se há console conectado; o chat MUST
  receber uma linha quando o GM começa a processar o turno N, e quando falha ou é interrompido (o fim bem-sucedido é
  a própria narração).
- **FR-011**: O mestre MUST poder desligar o modo a qualquer momento, inclusive durante um processamento, que é
  interrompido; o turno fica aberto e nada que o GM ainda não tinha gravado é aplicado.
- **FR-012**: Um processamento que falha, perde o console ou passa de **10 minutos** MUST terminar com o turno aberto,
  uma linha no chat e uma notificação ao mestre, para ele fechar o turno à mão ou deixar o GM tentar de novo.
- **FR-013**: Com a campanha fora do status Ativa, o Modo GM MUST ficar ligado sem processar nada; ao voltar a Ativa, a
  verificação da FR-003 acontece na próxima ação (ou ao religar o modo).
- **FR-014**: A skill **"gm"** MUST existir no repositório da campanha (`c:\repos\gurps-adventure`), reutilizando
  `processar-turno` e `validar-movimento`: lê a mesa, confere os movimentos (FR-007), resolve, registra no repositório
  e fecha o turno; MUST nunca esperar aprovação nem fazer perguntas — onde `processar-turno` pararia para perguntar,
  decide pela opção mais conservadora e deixa a dúvida registrada para o mestre.
- **FR-015**: Se, ao ler a mesa, o GM encontrar alguém sem ação (a situação mudou desde o aviso), MUST não fechar nada
  e dizer quem falta.
- **FR-016**: O GM MUST atuar só nas campanhas em que o dono do console é o mestre, com as permissões do mestre, e
  nunca em outra campanha.

### Key Entities *(include if feature involves data)*

- **Campanha**: ganha o estado **Modo GM** (ligado/desligado), guardado com ela, ao lado de "Livre" e do aviso de quem
  falta jogar.
- **Processamento do GM**: a execução, por campanha e turno, do fechamento autônomo — quando começou, quando terminou,
  o desfecho (concluído, falhou, interrompido, sem console) e o motivo de uma falha; no máximo um em andamento por
  campanha.
- **Skill "gm"**: a receita no repositório da campanha que o Claude do mestre segue; versão autônoma de
  `processar-turno`, com a conferência de movimento.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Com o Modo GM ligado e o console conectado, um turno em que todos agiram é fechado com narração **sem
  nenhum toque do mestre** em 100% dos casos de teste, em até 10 minutos (tipicamente em até 3).
- **SC-002**: Nenhum turno é fechado pelo GM enquanto algum personagem aprovado está sem ação (0 ocorrências em teste).
- **SC-003**: Toda peça movida além do Deslocamento permitido termina dentro do limite antes de a ação ser resolvida, e a
  mesa é avisada, em 100% dos casos de teste.
- **SC-004**: Ligar o modo (ou conectar o console) com o turno pronto inicia o processamento em até 10 segundos.
- **SC-005**: Mestre e jogadores identificam de relance, na mesa, que o Modo GM está ligado e se o GM está processando.
- **SC-006**: Um processamento interrompido, falho ou expirado deixa o turno aberto e o mestre avisado em até 1 minuto;
  "Finalizar turno" continua funcionando normalmente.
- **SC-007**: A skill "gm" fecha um turno pronto, no terminal, sem fazer nenhuma pergunta, com o mesmo registro no
  repositório que `processar-turno` deixa.

## Assumptions

- O GM é o Claude do mestre rodando pelo Roll6.Console já existente (086/093): o aviso chega pelo console, com a
  chave do mestre e na pasta de trabalho do repositório da campanha; sem console conectado nada é processado.
- "Todos os PJs agiram" é a regra atual de pendência: todo personagem aprovado da campanha com uma ação válida no turno
  em andamento (ações canceladas e resets não contam); NPCs não contam — o GM decide por eles ao processar.
- O processamento usa o que já existe para fechar um turno (os dados do turno e o fechamento em lote com narração);
  o GM não ganha poderes novos sobre a mesa.
- No modo livre o GM também fecha o turno quando todos agirem (como o "Finalizar turno" faz lá).
- Um processamento tem o tempo limite de 10 minutos (as perguntas têm 2; um turno envolve regras e dados).
- Os pedidos ao console (perguntas, editor de animação, gerador de mapas e o GM) continuam atendidos um por vez, na
  ordem de chegada.
- A skill "gm" é criada como arquivos no repositório da campanha (`.claude/skills/gm/`), sem alterar as skills
  existentes e sem ser commitada por esta feature (o repositório é do mestre).
- As decisões conservadoras da skill "gm" seguem as regras já escritas em `processar-turno`/`acao` (dado rolado,
  regra do livro, ficha intocada); a lista do que é "conservador" fica na própria skill.
