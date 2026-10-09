# Feature Specification: Chat da campanha (turno e conversa numa linha só)

**Feature Branch**: `041-campaign-chat`  
**Created**: 2026-10-08  
**Status**: Draft (reestruturada em 2026-10-08: turno e chat unificados)  
**Input**: User description: "Crie a spec do chat, sem PWA e web push notification -> https://github.com/landim32/roll6/issues/32" — *Chat da campanha (texto, foto e áudio) no lugar do log.* A instalação como aplicativo (#38) e as notificações Web Push (#39) estão fora desta spec.

## Contexto

Hoje a campanha tem duas coisas separadas:

- **O log do turno:** movimentos, ações, resultados de ação, mudanças de personagem e narrações. Aparece no console do rodapé, na janela "Turno N" e nos balões sobre as peças.
- **Nenhuma conversa:** quem quer falar com a mesa usa outro aplicativo.

Esta feature junta tudo numa **única linha do tempo da campanha, o chat**. Cada registro é uma mensagem: o que as pessoas escrevem (texto, foto, áudio) e tudo o que acontece no turno (movimento, ação, resultado, mudança de personagem, narração, fim de turno). **O log do turno deixa de existir como coisa separada.** As regras de turno (um movimento por turno, agir, desfazer o turno, finalizar) passam a funcionar sobre essas mensagens. Cada tipo de registro tem a sua aparência. Movimentos, ações e mudanças de personagem aparecem de forma discreta, para que a conversa e a narração se destaquem.

O chat convive com o mapa. O usuário escolhe ver só o mapa (ou o 3D), o mapa e o chat juntos, ou só o chat.

## Clarifications

### Session 2026-10-08

- Q: Quais acontecimentos do turno aparecem no chat por padrão? → A: Todos — movimento, ação, resultado de ação, mudança de personagem, narração e fim de turno, sem filtro.
- Q: A divisão entre mapa e chat é fixa ou ajustável? → A: Fixa, metade para cada parte.
- Q: O "sussurro ao mestre" entra nesta versão? → A: Não, fica para depois.
- Decisão do usuário: **turno e chat são uma coisa só.** O log dos turnos deixa de existir como registro separado e tudo é mostrado no chat. Cada tipo de registro aparece de um jeito diferente, e movimentos e ações de personagens de forma mais discreta.
- Q: O que acontece com as ferramentas e a API de turno usadas pelos assistentes de IA? → A: Continuam com os mesmos contratos (nomes, parâmetros e respostas), lendo e gravando no chat, e ganham a companhia das ferramentas novas de chat.
- Q: O jogador pode declarar a ação do turno pelo chat? → A: Sim — o campo do chat tem um seletor **Conversa / Ação**; "Ação" grava a ação do turno do personagem atual, com as mesmas regras do "Agir" do mapa.
- Q: O mestre registra resultado de ação e narração pelo chat? → A: Não — resultados e narrações continuam só pela API e pelos assistentes de IA; no chat o mestre só conversa (e apaga, conforme FR-016).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Conversar com a mesa por texto (Priority: P1)

Durante a sessão, um jogador escreve no chat da campanha. A mensagem aparece na hora para o mestre e para os outros jogadores aprovados, com a foto e o nome do personagem que ele está usando. O mestre responde como "Mestre (GM)". Ao subir na conversa, as mensagens antigas carregam.

**Why this priority**: é o núcleo do pedido e o que tira a mesa de um aplicativo externo.

**Independent Test**: dois navegadores, o mestre e um jogador aprovado. O jogador escreve e a mensagem aparece para o mestre em menos de 2 segundos, com a foto e o nome do personagem. O mestre responde como "Mestre (GM)". Um usuário de fora da campanha não vê nada.

**Acceptance Scenarios**:

1. **Given** um jogador com personagem aprovado escolhido em "Personagem atual", **When** ele envia "Abro a porta devagar", **Then** a mensagem aparece para todos com a foto e o nome do personagem e a hora.
2. **Given** o mestre com "Mestre (GM)" escolhido, **When** ele envia uma mensagem, **Then** ela aparece como "Mestre (GM)" com o nome do usuário.
3. **Given** um jogador com dois personagens aprovados, **When** ele troca o "Personagem atual" e envia, **Then** a mensagem sai com o personagem escolhido no momento do envio.
4. **Given** uma campanha com milhares de mensagens, **When** o usuário abre o chat, **Then** ele vê as mais recentes e, ao rolar para cima, as anteriores carregam por páginas, sem pular nem repetir.
5. **Given** um usuário que não é mestre nem tem personagem aprovado, **When** tenta ler ou escrever, **Then** a ação é recusada e ele não recebe nada em tempo real.
6. **Given** um texto com mais de 4000 caracteres, **When** o usuário tenta enviar, **Then** o envio é recusado com um aviso e o texto continua no campo.

---

### User Story 2 - O turno acontece dentro do chat (Priority: P1)

Tudo o que acontece no turno vira uma mensagem do chat no momento em que acontece, no lugar onde antes ficava o log:

- **Discretas:** o movimento de uma peça, a ação de um personagem (o "Agir") e as mudanças de personagem.
- **Em destaque:** o resultado que o mestre dá a uma ação, que aparece como uma resposta clara do mestre.
- **Narração:** a narração do mestre, como um bloco grande e formatado.
- **Fim de turno:** um divisor "Turno N finalizado" que separa os turnos na conversa.

As regras de turno continuam as mesmas, agora sobre essas mensagens:

- cada peça se move uma vez por turno;
- "Resetar turno" apaga o movimento e a ação da peça no turno e desfaz o movimento;
- "Finalizar turno" lista quem ainda não agiu;
- os assistentes de IA continuam lendo e processando o turno.

O console de narrações e a janela "Turno N" deixam de existir. Os balões de ação sobre as peças continuam.

**Why this priority**: é a decisão central desta versão. O turno passa a viver no chat, e sem isso o chat seria só um bate-papo ao lado de um log.

**Independent Test**: com o chat visível, um jogador move a peça e age, o mestre dá o resultado, muda a vida de um personagem, narra e finaliza o turno. Cada registro aparece na hora, na ordem e com a aparência do seu tipo. Um segundo movimento da mesma peça no turno é recusado como hoje. "Resetar turno" faz o movimento e a ação somirem do chat e a peça voltar. As ferramentas de turno dos assistentes de IA devolvem os mesmos dados de antes.

**Acceptance Scenarios**:

1. **Given** o chat visível, **When** um jogador move a peça, **Then** aparece uma linha discreta: "Aria moveu de (3, 2) para (4, 4), olhando para o Sul — 3 pontos de movimento".
2. **Given** um jogador que usa "Agir" com "Ataco o goblin", **When** a ação é gravada, **Then** aparece uma linha discreta com o personagem e a ação, e o balão aparece sobre a peça.
3. **Given** a ação de um jogador, **When** o mestre registra o resultado, **Then** ele aparece em destaque como resposta do mestre, ligado ao personagem.
4. **Given** o mestre que muda a vida de Aria de 12 para 8, **When** a mudança é salva, **Then** aparece uma linha discreta "Vida de Aria de 12 para 8 (por GM)".
5. **Given** o mestre que narra, **When** a narração é gravada, **Then** ela aparece como bloco em destaque, com a formatação (Markdown) preservada.
6. **Given** o mestre que finaliza o turno, **When** o turno avança, **Then** aparece o divisor "Turno N finalizado", e as mensagens seguintes pertencem ao turno N+1.
7. **Given** uma peça que já se moveu no turno, **When** alguém tenta movê-la de novo, **Then** o movimento é recusado como hoje.
8. **Given** "Resetar turno" numa peça, **When** é confirmado, **Then** o movimento e a ação dela no turno somem do chat para todos e a peça volta para onde estava (se o hex estiver livre), como hoje.
9. **Given** um assistente de IA que lê os dados do turno, pede o resumo ou processa o turno em lote, **When** ele usa as ferramentas de turno, **Then** elas funcionam como antes, e o que o lote grava aparece no chat como se tivesse sido feito na tela.
10. **Given** um jogador com o chat aberto (inclusive no modo Chat, sem o mapa), **When** ele escolhe **Ação** no campo do chat e envia "Ataco o goblin", **Then** a ação é gravada para o personagem atual exatamente como pelo "Agir": aparece como linha discreta de ação, o balão aparece sobre a peça e o personagem deixa de ser pendente em "Finalizar turno".
11. **Given** a campanha antes desta mudança, **When** a mudança entra no ar, **Then** todo o registro de turno antigo (movimentos, ações, resultados, mudanças e narrações) aparece no chat, no lugar e na ordem certa.

---

### User Story 3 - Ver o chat junto com o mapa (Priority: P1)

Um botão com três ícones escolhe como a tela aparece:

- **Mapa/3D:** como hoje, sem o chat.
- **Mapa/3D e Chat:** a tela dividida ao meio na vertical, com o mapa ou o 3D em cima e o chat embaixo.
- **Chat:** o chat no lugar do mapa.

**Why this priority**: sem lugar na tela o chat (e agora o turno) não pode ser acompanhado, e ele precisa conviver com o mapa sem atrapalhar o jogo.

**Independent Test**: alternar os três modos no computador e no celular. No modo dividido, o mapa em cima mantém pan, zoom, clique na peça, arrastar cartões, mover peças e câmera do 3D, e nada do mapa fica coberto. No modo Chat, o mapa para de desenhar e volta com o mesmo zoom, posição e câmera.

**Acceptance Scenarios**:

1. **Given** a mesa aberta, **When** o usuário escolhe **Mapa/3D**, **Then** a tela é igual à de hoje.
2. **Given** **Mapa/3D e Chat**, **When** ativo, **Then** a área abaixo do menu é dividida ao meio, com o mapa em cima e o chat embaixo, e os painéis de personagens e NPCs, os botões do mapa, o rodapé e o joystick ficam dentro da metade do mapa, sem ser cobertos.
3. **Given** **Chat**, **When** ativo, **Then** o mapa e o 3D não são desenhados, e ao voltar mantêm o zoom, a posição e a câmera.
4. **Given** um celular com o teclado aberto, **When** o usuário escreve, **Then** o campo de digitar fica visível acima do teclado.
5. **Given** um modo escolhido, **When** o usuário recarrega ou volta outro dia no mesmo aparelho, **Then** o modo é o mesmo. Ao sair da conta ele é esquecido. A primeira vez é **Mapa/3D**.
6. **Given** o botão dos três ícones, **When** visto, **Then** a opção ativa está destacada e cada ícone tem nome acessível ("Mapa", "Mapa e chat", "Chat").

---

### User Story 4 - Saber que há novidades (Priority: P2)

Com o chat escondido, o ícone do chat mostra quantas mensagens novas chegaram. Ao abrir o chat, o contador zera e a conversa abre na primeira não lida, com a marca "Novas mensagens".

**Why this priority**: sem isso, quem está olhando o mapa perde a conversa e o turno. Depende de US1 a US3.

**Independent Test**: com o chat escondido, outro participante envia 3 mensagens e o ícone mostra "3". Ao mostrar o chat, o contador some e a marca aparece antes da primeira das três.

**Acceptance Scenarios**:

1. **Given** o modo **Mapa/3D**, **When** chegam mensagens de outras pessoas ou registros do turno feitos por outros, **Then** o ícone mostra o número de não lidas (até "99+").
2. **Given** não lidas pendentes, **When** o usuário mostra o chat, **Then** o contador some e as mensagens ficam lidas para esse usuário em todos os aparelhos dele.
3. **Given** um usuário que volta depois de dias, **When** abre o chat, **Then** ele abre na primeira não lida, com a marca "Novas mensagens".
4. **Given** as próprias mensagens e os próprios movimentos e ações, **When** o usuário os faz, **Then** eles não contam como não lidos para ele.

---

### User Story 5 - Enviar foto e áudio (Priority: P3)

Além de texto, o usuário envia uma **foto** (galeria ou câmera) e **grava um áudio** de até 2 minutos: toca para gravar, ouve antes de enviar e manda. A foto aparece em miniatura e abre maior, e o áudio tem player. Funciona no computador, no Android e no iPhone.

**Why this priority**: enriquece a conversa, mas o chat já tem valor só com texto e o turno.

**Independent Test**: no Android e no iPhone, enviar uma foto da câmera e um áudio de 20 segundos. Os dois aparecem para os outros, a foto abre maior e o áudio toca nos dois sistemas.

**Acceptance Scenarios**:

1. **Given** uma foto PNG, JPEG ou WebP de até 10 MB, **When** enviada, **Then** aparece em miniatura e abre maior ao clicar.
2. **Given** uma foto maior que 10 MB ou de outro formato, **When** o usuário tenta enviar, **Then** é recusada com um aviso.
3. **Given** o botão de gravar, **When** tocado pela primeira vez, **Then** o navegador pede o microfone. Se for negado, aparece como liberar.
4. **Given** um áudio gravado, **When** o usuário o ouve, **Then** pode enviar ou descartar.
5. **Given** um áudio gravado no iPhone, **When** tocado no Android (e vice-versa), **Then** toca normalmente.
6. **Given** a gravação chega a 2 minutos, **When** o limite é atingido, **Then** ela para sozinha e fica pronta para ouvir ou enviar.
7. **Given** um envio que falha, **When** o usuário vê o aviso de falha, **Then** pode tentar de novo sem refazer a mídia.

---

### User Story 6 - Apagar mensagens (Priority: P3)

O autor apaga a própria mensagem de conversa, e o mestre apaga qualquer mensagem de conversa e qualquer narração. A mensagem apagada vira "Mensagem apagada" para todos.

**Why this priority**: moderação e correção de erros. Pode vir depois do resto.

**Independent Test**: um jogador apaga a própria mensagem, e o mestre apaga a de outro e uma narração. Viram "Mensagem apagada" para todos, na hora. Um jogador não consegue apagar a mensagem de outro.

**Acceptance Scenarios**:

1. **Given** a própria mensagem de texto, foto ou áudio, **When** o autor a apaga, **Then** ela vira "Mensagem apagada" para todos.
2. **Given** qualquer mensagem de conversa ou narração, **When** o mestre a apaga, **Then** ela vira "Mensagem apagada" para todos.
3. **Given** a mensagem de outro jogador, **When** um jogador tenta apagá-la, **Then** a opção não existe e a tentativa é recusada.
4. **Given** um movimento, uma ação, um resultado, uma mudança de personagem ou um fim de turno, **When** alguém procura apagá-lo no chat, **Then** a opção não existe. Movimento e ação saem por "Resetar turno", e os demais seguem as ferramentas de correção de turno do mestre (API e assistentes de IA), como hoje.

---

### Edge Cases

- **Personagem excluído, transferido ou que sai da campanha:** as mensagens antigas mantêm o nome e a foto de quando foram feitas.
- **Usuário que perde o acesso:** deixa de ler e receber na hora, e as mensagens dele ficam.
- **Mestre que também tem personagem:** fala como "Mestre (GM)" ou como o personagem, pela escolha de "Personagem atual".
- **Sem personagem escolhido:** o campo de digitar fica desativado com "Escolha um personagem aprovado para falar". Movimentos e ações continuam pelo mapa como hoje.
- **Mensagem vazia:** não é enviada.
- **Mensagens no mesmo instante:** todos veem a mesma ordem.
- **Reconexão:** o que foi perdido aparece ao reconectar, sem duplicar, inclusive registros desfeitos nesse meio tempo (que somem).
- **Muitos registros de uma vez** (processamento de turno em lote, dezenas de movimentos): chegam na ordem, sem travar o chat, e as linhas discretas não empurram a conversa para fora da tela de forma incômoda.
- **Correção de turno pelo mestre** (mudar o texto, o turno ou a posição de um registro): a mensagem muda para todos. Se mudar de turno, ela aparece no lugar do turno novo.
- **Voltar o turno descartando registros:** as mensagens dos turnos descartados somem para todos.
- **Campanha excluída:** o chat inteiro e a mídia são excluídos junto.
- **Texto com HTML ou script:** exibido como texto e Markdown seguro, nunca executado.
- **Navegador sem gravação de áudio:** o botão de áudio não aparece.

## Requirements *(mandatory)*

### Functional Requirements

**Linha do tempo única**

- **FR-001**: Cada campanha MUST ter uma única linha do tempo de mensagens, o chat, que guarda **todos** os registros: mensagens de pessoas (texto, foto, áudio) e registros do turno (movimento, ação, resultado de ação, mudança de personagem, narração, fim de turno). Não existe outro registro de turno separado.
- **FR-002**: Toda mensagem MUST pertencer a um número de turno (o turno em andamento quando foi criada, ou o corrigido pelo mestre) e MUST indicar quem a fez (usuário) e, quando houver, o personagem ou NPC envolvido.
- **FR-003**: Os registros de turno existentes antes desta mudança MUST ser preservados como mensagens do chat, no mesmo turno e na mesma ordem. Nenhum dado de turno pode se perder.
- **FR-004**: Ler, escrever e receber mensagens em tempo real MUST ser permitido só ao mestre e aos usuários com personagem aprovado na campanha.

**Conversa**

- **FR-005**: O usuário MUST poder falar só como um personagem seu aprovado na campanha ou, se for o mestre, como "Mestre (GM)". Nome e foto exibidos ficam gravados como eram no envio.
- **FR-006**: O usuário MUST poder enviar texto de 1 a 4000 caracteres, exibido como Markdown seguro.
- **FR-007**: O usuário MUST poder enviar foto PNG, JPEG ou WebP de até 10 MB (galeria ou câmera) e gravar áudio de até 2 minutos (pedido de microfone só ao tocar em gravar, ouvir antes de enviar, parada automática no limite). Áudios do Android, do iPhone e do computador MUST tocar nos três.
- **FR-008**: O envio MUST mostrar o estado (enviando, falhou) e permitir tentar de novo.

**Turno dentro do chat**

- **FR-009**: Mover uma peça de personagem ou NPC, agir, registrar o resultado de uma ação, mudar um personagem ou uma ocorrência de NPC (vida, energia, status, postura, ficha, nome, deslocamento e o que mais o turno registra hoje), narrar e finalizar o turno MUST criar, no momento em que acontecem, a mensagem do tipo correspondente.
- **FR-010**: As regras de turno MUST continuar valendo sobre as mensagens: um movimento por peça de personagem ou NPC por turno; "Resetar turno" apaga as mensagens de movimento e de ação da peça no turno em andamento e desfaz o movimento se o hex estiver livre; "Finalizar turno" lista os personagens aprovados sem ação no turno, a menos que forçado; o número do turno avança ao finalizar.
- **FR-011**: As correções de turno do mestre (criar um registro em qualquer turno até o atual, mudar o texto, o turno ou os campos de um registro, apagar um registro, definir o turno atual com ou sem descartar os posteriores) MUST continuar disponíveis e passar a agir sobre as mensagens, refletindo para todos na hora.
- **FR-012**: Todas as operações de turno da API e dos assistentes de IA (ler o estado, os dados, o resumo, a narração e o histórico do turno; agir; resetar; finalizar; processar em lote; criar, corrigir e apagar registros; definir o turno atual) MUST manter os mesmos contratos (nomes, parâmetros e respostas) e o mesmo conteúdo, lendo e gravando nas mensagens do chat.
- **FR-013**: O console de narrações e a janela "Turno N" MUST sair da interface. Os balões de ação sobre as peças e o aviso de "Turno N finalizado" no sino MUST continuar.
- **FR-013a**: O campo do chat MUST ter um seletor **Conversa / Ação**, disponível quando o "Personagem atual" é um personagem do usuário aprovado na campanha (não para "Mestre (GM)"). Em **Ação**, o envio MUST gravar a ação do turno desse personagem com as mesmas regras, o mesmo resultado e as mesmas respostas do "Agir" do mapa, inclusive o balão sobre a peça e a contagem para "Finalizar turno". A ação é só texto (sem foto nem áudio), com o limite de tamanho das ações de hoje.

**Aparência por tipo**

- **FR-014**: Cada tipo de mensagem MUST ter aparência própria:
  - **Conversa (texto, foto, áudio):** balão com foto e nome de quem fala e a hora; as próprias mensagens alinhadas do outro lado.
  - **Movimento:** linha **discreta** (texto pequeno, cor apagada, ícone de movimento), com o personagem ou NPC, origem, destino, direção e pontos gastos.
  - **Ação:** linha **discreta** (texto pequeno, ícone de ação), com o personagem e o texto da ação.
  - **Mudança de personagem:** linha **discreta**, com o que mudou, de quanto para quanto e quem mudou.
  - **Resultado de ação:** bloco **visível** do mestre, ligado ao personagem que agiu.
  - **Narração:** bloco **em destaque**, largo e com Markdown, identificado como do mestre.
  - **Fim de turno:** divisor centralizado "Turno N finalizado".
  - **Apagada:** "Mensagem apagada", sem conteúdo.
- **FR-015**: Linhas discretas seguidas da mesma pessoa ou do mesmo turno MUST ficar compactas (sem repetir foto e nome a cada linha), para não empurrar a conversa para fora da tela.

**Apagar**

- **FR-016**: O autor MUST poder apagar a própria mensagem de conversa, e o mestre qualquer mensagem de conversa e qualquer narração. Apagadas, aparecem como "Mensagem apagada" para todos, sem texto nem mídia.
- **FR-017**: Movimento, ação, resultado, mudança de personagem e fim de turno MUST NOT ser apagados pelo chat. Saem só por "Resetar turno" ou pelas correções de turno do mestre (FR-011).

**Não lidas**

- **FR-018**: O sistema MUST guardar, por usuário e campanha, até onde ele leu, compartilhado entre aparelhos. O que o próprio usuário fez não conta como não lido.
- **FR-019**: Com o chat escondido, o ícone MUST mostrar o número de não lidas (até "99+"). Ao mostrar o chat, MUST marcar como lidas e esconder o contador. O chat MUST abrir na primeira não lida, com a marca "Novas mensagens".

**Layout da tela**

- **FR-020**: Um botão com três ícones no menu superior MUST escolher entre **Mapa/3D**, **Mapa/3D e Chat** e **Chat**, com a opção ativa destacada e nome acessível em cada ícone.
- **FR-021**: Em **Mapa/3D** a tela MUST ser a de hoje. Em **Mapa/3D e Chat** a área abaixo do menu MUST ser dividida ao meio, de forma fixa (mapa ou 3D em cima, chat embaixo), com todas as interações do mapa. Em **Chat** o chat MUST ocupar a área.
- **FR-022**: Os painéis, botões, rodapé e joystick do mapa MUST ficar dentro da área do mapa, nunca cobertos pelo chat.
- **FR-023**: No modo **Chat**, o mapa e o 3D MUST parar de desenhar e, ao voltar, manter zoom, posição e câmera.
- **FR-024**: O modo MUST ser lembrado no aparelho e esquecido ao sair da conta, com **Mapa/3D** na primeira vez. O campo de digitar MUST ficar visível acima do teclado do celular.

**Assistentes de IA e armazenamento**

- **FR-025**: Assistentes de IA MUST poder ler o chat (incluindo os registros de turno) e enviar mensagens de conversa como o mestre ou como um personagem do dono da chave, com as regras de FR-005, além das ferramentas de turno de FR-012.
- **FR-026**: Mensagens e mídia MUST ser guardadas enquanto a campanha existir e excluídas junto com ela.
- **FR-027**: Toda mensagem MUST ser visível a todos os participantes da campanha. Não há mensagens privadas nem sussurro nesta versão.

### Key Entities

- **Mensagem da campanha**: o único registro da linha do tempo.
  - **Pertence a:** uma campanha e a um número de turno.
  - **Tipos:** texto, foto, áudio, movimento, ação, resultado de ação, mudança de personagem, narração, fim de turno.
  - **Autor e identidade:** quem fez (usuário) e a identidade exibida (personagem, NPC ou "Mestre (GM)", com nome e foto do momento).
  - **Conteúdo, conforme o tipo:** texto ou Markdown; mídia (foto, ou áudio com duração); posição antes e depois, direção e pontos gastos (movimento); lista de mudanças (campo, antes, depois); mapa onde aconteceu.
  - **Datas:** criação e, se apagada, quando.
- **Leitura do chat**: por usuário e campanha, até onde leu.
- **Preferência de layout**: por aparelho, o modo da tela.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma mensagem ou registro de turno aparece para os outros participantes conectados em até 2 segundos em 95% dos casos.
- **SC-002**: 100% dos registros de turno anteriores à mudança aparecem no chat, no turno e na ordem certos, e as ferramentas de turno dos assistentes de IA devolvem o mesmo conteúdo de antes para os mesmos turnos.
- **SC-003**: As regras de turno (um movimento por turno, resetar, finalizar com pendentes, processar em lote, corrigir) passam em 100% dos testes que já existem, adaptados à nova fonte.
- **SC-004**: Numa sessão com 20 movimentos e ações entre duas falas, as duas falas continuam visíveis na mesma tela do chat no computador, graças às linhas discretas.
- **SC-005**: Em 100% das tentativas, quem não participa da campanha não lê nem recebe nada.
- **SC-006**: No modo dividido, todas as interações do mapa de hoje funcionam e nenhum controle do mapa fica coberto. No modo Chat, o mapa e o 3D não desenham nada.
- **SC-007**: Fotos e áudios de Android, iPhone e computador abrem e tocam nos três em 100% dos testes.

## Assumptions

- **Fora do escopo** (pedido do usuário): instalação como aplicativo (#38) e notificações fora do app (#39). O conceito de "chat visível" desta spec é o que a #39 vai usar.
- **Um chat por campanha.**
- **Ferramentas de turno** (confirmado em Clarifications): as da API e dos assistentes de IA continuam com os mesmos contratos, agora sobre as mensagens, para que nenhum assistente configurado quebre. O "log" que deixa de existir é o registro separado e a interface dele (console e janela "Turno N").
- **Migração:** os registros de turno existentes viram mensagens do chat, com o autor, o personagem ou NPC, o turno e a data que tinham. A identidade exibida (nome e foto) desses registros antigos é preenchida com o nome e a foto atuais na hora da migração.
- **Fim de turno:** hoje não há registro de "turno finalizado" no log. Os turnos já finalizados antes da mudança ganham o divisor na migração, posicionado depois do último registro de cada turno.
- **Resultados e narrações** (confirmado em Clarifications): continuam sendo escritos só pela API e pelos assistentes de IA, como hoje. O seletor do chat não aparece para "Mestre (GM)", que no chat só conversa.
- **Ação pelo mapa ou pelo chat** (confirmado em Clarifications): o "Agir" do menu da peça continua, e o seletor **Conversa / Ação** do chat faz o mesmo. Se as regras do "Agir" exigem uma peça do personagem no mapa atual, a ação pelo chat segue a mesma exigência e mostra o mesmo erro.
- **Nome e foto gravados** como eram no momento, nas mensagens novas.
- **Guarda e limites:** mensagens e mídia ficam enquanto a campanha existir, sem cota por campanha, só os limites por arquivo (foto 10 MB, áudio 2 minutos).
- **Botão no menu superior**, padrão **Mapa/3D**, escolha **por aparelho**.
- **Fora do escopo:** reações, edição de conversa, respostas encadeadas, menções, busca, sussurros e mensagens privadas, salas por mapa ou grupo, chamadas de voz ou vídeo, recibo de leitura por mensagem, filtro de tipos e divisória arrastável.
