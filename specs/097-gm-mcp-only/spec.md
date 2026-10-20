# Feature Specification: Modo GM só pelo MCP — a skill gm sem a campanha local, a campanha anunciada pelo console e o log completo

**Feature Branch**: `097-gm-mcp-only`
**Created**: 2026-10-20
**Status**: Draft
**Input**: User description: "Correções no modo GM: a skill gm não funcionou porque o modelo tentou executar dentro da campanha atual — o gm não deve funcionar em cima da campanha local; deve pegar qualquer dado do MCP; deve usar apenas a leitura das regras pelos livros; a situação atual deve ser armazenada no status dos personagens/NPCs e na situação do mapa; para saber a situação atual da campanha deve usar os logs da campanha, o status dos personagens/NPCs e os mapas; o processar-turno e as outras skills devem continuar funcionando, tanto local como só através do MCP; alterar na pasta c:\repos\gurps-adventure. O console deve receber e informar o modelo sobre qual campanha está sendo jogada. No console, deve exibir um log completo de tudo que ele executa."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - O GM joga só com o que está no Roll6 (Priority: P1)

O mestre liga o Modo GM numa campanha do Roll6. Quando o turno fica pronto, o Claude dele recebe o pedido e **trabalha
só com a mesa do Roll6**: quem são os personagens e os NPCs, as fichas que o Roll6 guarda, o que cada um declarou, onde
cada peça está, PV, Fadiga e **status** de cada um, o **mapa** da cena e o **log da campanha** (as narrações e os
registros dos turnos anteriores). Ele **não lê nem escreve nada da campanha guardada no repositório** — nem o capítulo
em andamento, nem a saúde local, nem as anotações, nem o plano local, nem o mapeamento `campanha/roll6.json` — e, para
as regras, usa **só os livros** (as regras de GURPS do repositório) e as skills que as aplicam (rolar dados, testes,
ataques, defesas, reações). O resultado do turno volta para o Roll6 e **só para lá**: PV, Fadiga, o status tático de
cada personagem e NPC, as posições no mapa e a narração — que é a memória da campanha para o próximo turno.

**Why this priority**: foi o que falhou — o GM tentou jogar a campanha "atual" do repositório em vez da campanha do
pedido; sem isto o Modo GM não é confiável.

**Independent Test**: com o Modo GM ligado numa campanha do Roll6 que **não** é a do `campanha/roll6.json` do
repositório, um turno completo é fechado corretamente; nenhum arquivo de `campanha/`, `personagens/` ou `historico/`
do repositório muda, e a narração, os status e as posições aparecem no Roll6.

**Acceptance Scenarios**:

1. **Given** o Modo GM ligado numa campanha do Roll6 diferente da campanha local do repositório, **When** o turno fica
   pronto, **Then** o GM processa **essa** campanha do Roll6, e nenhum arquivo da campanha local é lido ou alterado.
2. **Given** um personagem cuja ficha está só no Roll6 (sem pasta em `personagens/`), **When** o GM resolve a ação
   dele, **Then** usa a ficha do Roll6 (a ficha da campanha da participação) e as regras dos livros.
3. **Given** um NPC da campanha do Roll6, **When** o GM decide e resolve a ação dele, **Then** usa a ficha e o status do
   NPC no Roll6; sem a ficha, usa o que o status, o nome e o log dizem, e registra a lacuna para o mestre.
4. **Given** um turno resolvido, **When** o GM fecha, **Then** o status de cada personagem e NPC que mudou carrega a
   situação tática atual (ferido, caído, arma na mão, apontando, condição que vale para o próximo turno), as peças
   movidas pela resolução têm a posição nova no mapa, e a narração conta o que aconteceu com a conta das jogadas.
5. **Given** o turno seguinte, **When** o GM começa, **Then** descobre a situação atual lendo o log da campanha (as
   narrações e os registros dos turnos anteriores), os status e os mapas — nunca um arquivo local.
6. **Given** o GM precisando de uma regra, **When** a procura, **Then** lê os livros do repositório; uma regra que não
   está nos livros não é inventada (sem efeito, dúvida registrada).

---

### User Story 2 - O console diz ao modelo qual campanha está em jogo (Priority: P1)

Cada pedido do Modo GM chega ao console do mestre **com a campanha** — qual é, pelo nome e pela identidade no Roll6 — e
o console **mostra isso na tela** e **repassa ao modelo** de forma inequívoca, antes de qualquer outra coisa: "esta é a
campanha; só ela existe para este pedido". O modelo nunca precisa adivinhar a campanha por um arquivo do repositório,
e um repositório apontado para outra campanha não muda nada.

**Why this priority**: é a outra metade da falha — o modelo precisa saber, sem ambiguidade, de que campanha o pedido
é.

**Independent Test**: com o console conectado e o Modo GM ligado em duas campanhas do mesmo mestre, cada pedido mostra
no console a campanha certa e o modelo processa a campanha do pedido, mesmo com `campanha/roll6.json` apontando para
uma terceira.

**Acceptance Scenarios**:

1. **Given** um pedido do Modo GM, **When** o console o recebe, **Then** imprime a campanha (nome e identidade) e o
   turno antes de começar a rodar o modelo.
2. **Given** o modelo rodando o pedido, **When** lê as instruções, **Then** a campanha está nelas, identificada, com a
   ordem de usar só ela.
3. **Given** o repositório apontando para outra campanha, **When** o pedido chega, **Then** o modelo processa a campanha
   do pedido; o mapeamento local é ignorado.

---

### User Story 3 - O console mostra tudo o que executa (Priority: P2)

O mestre acompanha, na tela do console, **tudo** o que o modelo faz num pedido: o início (campanha, turno, pedido), cada
ferramenta usada com o que ela recebeu (o arquivo lido ou editado, o comando executado com os argumentos, a chamada ao
Roll6 com a ferramenta e os parâmetros), cada trecho de texto que o modelo produziu, cada arquivo acompanhado que
mudou, cada ferramenta recusada, e o desfecho (terminou, parou, falhou — e por quê). Hoje o console mostra só uma linha
resumida por ferramenta ("Lendo …", "Editando …", "Executando python …"); o mestre não consegue saber, por exemplo,
que chamada ao Roll6 foi feita nem com que dados.

**Why this priority**: sem isso o mestre não sabe o que o GM fez nem por que falhou — foi assim que a falha desta
feature demorou a ser entendida.

**Independent Test**: um pedido do Modo GM rodado com o console à vista; cada chamada ao Roll6 feita pela skill, cada
script executado (com os argumentos) e o texto final do modelo aparecem no console, na ordem em que aconteceram.

**Acceptance Scenarios**:

1. **Given** um pedido em andamento, **When** o modelo chama uma ferramenta, **Then** o console mostra a ferramenta e
   o que ela recebeu (caminho, comando e argumentos, ou a chamada ao Roll6 com os parâmetros), na hora.
2. **Given** um pedido em andamento, **When** o modelo escreve texto, **Then** o console mostra o texto (completo, não
   só o final).
3. **Given** um pedido que falhou ou foi parado, **When** termina, **Then** o console mostra o motivo e as ferramentas
   recusadas.
4. **Given** o log de um pedido, **When** o mestre o lê, **Then** consegue reconstituir o que o GM fez — de que dados
   partiu, que jogadas fez, o que gravou no Roll6.

---

### User Story 4 - As outras skills continuam funcionando, local e só pelo MCP (Priority: P2)

O mestre que joga **com o repositório** (a campanha local, o capítulo, a saúde, as anotações) continua usando
`processar-turno`, `acao`, `campanha` e as demais skills como hoje, à mão, com o registro local. O mesmo mestre, ou o
GM, usa essas skills **só pelo MCP** quando a campanha em jogo não é a do repositório: aí elas leem e gravam só no
Roll6 e não tocam em nada local. As duas formas convivem na mesma pasta.

**Why this priority**: é o que impede a correção do GM de quebrar a mesa jogada à mão.

**Independent Test**: `processar-turno` à mão na campanha do repositório grava o capítulo e a saúde locais como antes;
`processar-turno` apontado para outra campanha do Roll6 fecha o turno sem tocar em arquivo local algum.

**Acceptance Scenarios**:

1. **Given** a campanha do repositório, **When** o mestre roda `processar-turno` à mão, **Then** tudo funciona como
   antes: contexto local, registro local, `process_turn`.
2. **Given** outra campanha do Roll6 (ou o pedido do GM), **When** uma skill roda só pelo MCP, **Then** nenhum arquivo
   de `campanha/`, `personagens/` ou `historico/` é lido como estado nem escrito; fichas, status, posições e log vêm
   do Roll6 e voltam para o Roll6.
3. **Given** uma skill no modo só-MCP, **When** precisa guardar algo que antes ia para um arquivo local (saúde
   acumulada, anotação tática), **Then** guarda no status do personagem/NPC ou na narração do turno.

---

### Edge Cases

- A campanha do pedido **é** a do `campanha/roll6.json`: o GM continua só pelo MCP mesmo assim (a regra é do Modo GM,
  não da coincidência) — a campanha local só é tocada pelo mestre, à mão.
- O status de um personagem tem limite de tamanho: o GM escreve o essencial do estado tático (o que vale para o
  próximo turno) e deixa o resto para a narração, que é o log.
- Um NPC sem ficha no Roll6: o GM joga com o que o status, o nome e o log dizem, decide pelo conservador e registra a
  lacuna em "Dúvidas para o mestre".
- O log da campanha é longo: o GM lê o necessário para a cena atual (os turnos recentes e as narrações que descrevem
  a situação), não a campanha inteira.
- Um pedido sem campanha identificada (console antigo, pedido malformado): o modelo não processa nada e responde que
  a campanha não foi informada; o console mostra o erro.
- O log do console fica extenso num turno grande: cada linha é curta, com hora e prefixo do pedido, para ser lida em
  ordem; texto longo do modelo é mostrado inteiro, não cortado.
- Um pedido do GM e uma pergunta ("Perguntar") no mesmo console: cada um tem o seu número de pedido no log, e as
  linhas não se misturam.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A skill `gm` MUST trabalhar exclusivamente com os dados da campanha do pedido no Roll6 — personagens,
  participações e fichas da campanha, NPCs e suas fichas, declarações, movimentos, posições, PV, Fadiga, status, mapa
  e log (narrações e registros dos turnos) — e MUST NOT ler nem escrever os arquivos da campanha do repositório
  (`campanha/`, `personagens/`, `historico/`, `campanha/roll6.json`), em nenhuma situação.
- **FR-002**: Para as regras, a skill `gm` MUST usar só os livros de regras do repositório e as skills que as aplicam
  (rolar dados, testes, disputas, ataques, defesas, reações, validação de movimento); uma regra que não está nos
  livros não produz efeito e vira dúvida para o mestre.
- **FR-003**: A situação atual da campanha MUST ser guardada no Roll6 ao fechar cada turno: o status tático de cada
  personagem e NPC (o que vale para o próximo turno, dentro do limite do campo), PV e Fadiga, as posições das peças e
  a narração com a conta das jogadas.
- **FR-004**: Para descobrir a situação atual, a skill `gm` MUST ler o log da campanha (narrações e registros dos
  turnos anteriores, o necessário para a cena), os status dos personagens e NPCs e os mapas, nunca arquivos locais.
- **FR-005**: `processar-turno` e as skills que ela usa (contexto, registro, saúde, anotações, validação de movimento)
  MUST continuar funcionando com a campanha local do repositório exatamente como hoje, e MUST ter uma forma só-MCP em
  que nada local é lido como estado nem escrito, usada pela `gm` e por quem jogar outra campanha do Roll6.
- **FR-006**: No modo só-MCP, o que antes ia para um arquivo local MUST ir para o Roll6: saúde para PV/Fadiga e status,
  anotações táticas para o status ou para a narração, acontecimentos para a narração.
- **FR-007**: As alterações das skills MUST ser feitas na pasta `c:\repos\gurps-adventure` (como arquivos; o
  repositório não é commitado pela feature).
- **FR-008**: Todo pedido do Modo GM MUST chegar ao console com a campanha identificada (identidade no Roll6 e nome) e
  o turno; o console MUST mostrá-los na tela ao receber o pedido e MUST repassá-los ao modelo nas instruções do
  pedido, com a ordem de trabalhar só nessa campanha.
- **FR-009**: Um pedido do Modo GM sem campanha identificada MUST ser recusado pelo modelo (resposta clara, nada
  processado) e mostrado como erro no console.
- **FR-010**: O console MUST mostrar, para cada pedido, um log completo e em ordem: o início (pedido, campanha, turno,
  modo), cada ferramenta usada com o que ela recebeu (caminho lido ou editado, comando e argumentos, chamada ao Roll6
  com a ferramenta e os parâmetros), cada texto produzido pelo modelo (inteiro), cada arquivo acompanhado que mudou,
  cada ferramenta recusada e o desfecho com o motivo.
- **FR-011**: O log MUST identificar cada linha com a hora e o número do pedido, para pedidos de origens diferentes
  (GM, perguntas, editor) não se misturarem na leitura.
- **FR-012**: O log MUST nunca mostrar a chave de API do mestre nem outros segredos, mesmo quando um comando ou uma
  chamada os usaria.

### Key Entities *(include if feature involves data)*

- **Pedido do GM**: um turno a fechar, com a campanha (identidade e nome) e o número do turno; chega ao console e
  ao modelo com essa identificação.
- **Situação da campanha (no Roll6)**: o conjunto que o GM lê e escreve — status, PV e Fadiga de personagens e NPCs,
  posições e mapa, narrações e registros dos turnos.
- **Modo das skills**: local (a campanha do repositório: lê e grava arquivos locais) ou só-MCP (tudo no Roll6); o
  Modo GM é sempre só-MCP.
- **Log do console**: a sequência de linhas de um pedido — início, ferramentas, textos, arquivos, recusas, desfecho.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um turno fechado pelo Modo GM numa campanha que não é a do repositório não altera nenhum arquivo do
  repositório (0 arquivos modificados em `campanha/`, `personagens/`, `historico/`) em 100% dos casos de teste.
- **SC-002**: Em 100% dos pedidos, a campanha mostrada no console e a campanha processada pelo modelo são a do pedido,
  mesmo com o repositório apontando para outra.
- **SC-003**: Lendo só o log do console de um pedido, o mestre identifica toda chamada ao Roll6 feita (ferramenta e
  parâmetros), todo script executado e o motivo de uma falha — sem abrir outro arquivo.
- **SC-004**: `processar-turno` à mão na campanha do repositório produz os mesmos registros locais de antes (capítulo,
  saúde, anotações) em 100% dos casos de teste.
- **SC-005**: No turno seguinte a um fechado pelo GM, a situação lida do Roll6 (status, posições, narração) basta para o
  GM resolver as ações sem perguntar nada.

## Assumptions

- "Os livros" são as regras de GURPS guardadas no repositório (`livros/`); as skills de regra (rolar dados, testes,
  ataques, defesas, reações, validação de movimento) são a aplicação desses livros e continuam sendo usadas — elas não
  são dados da campanha.
- As fichas vêm do Roll6: a ficha da campanha de cada participação e a ficha de cada NPC; o plano da campanha, quando
  existir no Roll6, pode ser lido por lá.
- A skill `gm` recebe a campanha do pedido (e não do `campanha/roll6.json`), e nunca entra no modo local; o pedido do
  Modo GM traz a identidade e o nome da campanha e o turno.
- As demais skills continuam decidindo o modo como hoje decidem a campanha "fora do repositório"; a forma exata de
  escolher o modo só-MCP fica para o plano.
- O log do console é mostrado na tela; guardá-lo também em arquivo é opcional e não é exigido por esta feature.
- O console não precisa de segredos novos: a chave do mestre segue como está e nunca aparece no log.
- A feature altera arquivos no repositório da mesa sem commitá-los (o repositório é do mestre), e nada mais nele.
