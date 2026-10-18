# Feature Specification: Editor de animações na web com o Claude local

**Feature Branch**: `086-web-animation-editor`
**Created**: 2026-10-18
**Status**: Draft
**Input**: User description: "Abra a spec com tudo: refatore todo o roll6anime para a web, com um programa console para conectar ele ao Claude local. Deve abrir no Roll6, no menu Usuário → Animações → na animação selecionada. Deve abrir uma nova aba, não deve ter nada da tela principal (mapas, personagem, livre, Finalizar turno etc.), apenas a logomarca do Roll6."

## Contexto

O **roll6anime** (062–067) é uma ferramenta de desktop para Windows: mostra um modelo 3D tocando os arquivos de animação de uma pasta, tem uma linha do tempo, um esqueleto sobreposto com edição de pose, prints com marcação e uma conversa com o **Claude Code da máquina do usuário** (logado com a conta, sem chave de API), que escreve os arquivos pela skill `criar-animacao` do projeto da mesa. Ele vive fora do site: só "Enviar ao Roll6" leva a animação para a biblioteca.

Esta feature traz o roll6anime para **dentro do Roll6**, como uma página do site aberta a partir da biblioteca de animações, e substitui a janela de desktop por um **agente**: um programa de console que o usuário roda na própria máquina e que liga o editor web ao Claude local. O navegador nunca executa o Claude; ele conversa com o servidor do Roll6, e o servidor repassa os pedidos ao agente da mesma conta, que roda o Claude e devolve as respostas e as versões novas da animação.

A animação editada é a **da biblioteca do Roll6** (059): cada versão que o Claude ou o usuário produz vira o conteúdo daquela animação, com o mesmo id, de modo que os tokens que a usam já tocam a versão nova e nada precisa ser "enviado" depois.

## Clarifications

### Session 2026-10-18

- Q: O que acontece com o roll6anime de desktop (WPF) depois desta entrega? → A: Sai do repositório; a janela WPF, o
  WebView2 e o `viewer/` são removidos depois que o editor web os substitui.
- Q: O programa de console sabe de animações? → A: Não. Ele é o **`Roll6.Console`**, um aplicativo separado cuja única
  função é ligar o site ao Claude Code da máquina do usuário: receber um pedido pronto (instruções, texto, imagens,
  sessão), rodar o Claude, devolver a resposta aos poucos, e, a pedido do servidor, gravar e acompanhar arquivos na
  pasta de trabalho. Tudo o que é de animação — o arquivo, o contexto para o Claude, a validação, as versões — fica no
  servidor e na página. Assim o mesmo console serve a qualquer tela futura do Roll6 que precise do Claude local.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Abrir o editor de uma animação e vê-la tocando num modelo (Priority: P1)

No menu do usuário, em "Animações", cada animação do próprio usuário tem a ação "Editar no editor". Ela abre **uma nova aba** com uma página só do editor: no alto, a logomarca do Roll6, o nome da animação e o estado do agente; nada da tela principal (mapa, painéis, combo de campanha, personagem atual, modo livre, "Finalizar turno", chat). O usuário escolhe em qual modelo quer ver a animação — um dos seus tokens com modelo 3D — e o modelo passa a tocá-la como tocaria na mesa. Uma linha do tempo mostra o instante; ele pausa, arrasta até um instante e vê a pose daquele momento, e o editor diz em qual pose-chave (ou entre quais) está.

**Why this priority**: é a porta de entrada e o que substitui o "enviar para ver como ficou". Sem o agente, esta história já serve para conferir qualquer animação da biblioteca.

**Independent Test**: em "Animações", abrir uma animação própria no editor; ver a nova aba só com a logomarca e o editor; escolher um token com modelo 3D; ver a animação tocar, pausar, arrastar a barra e ler "Pose 2 de 5".

**Acceptance Scenarios**:

1. **Given** a janela "Animações" com uma animação do usuário, **When** ele aciona "Editar no editor", **Then** uma nova aba abre na página do editor dessa animação, sem nenhum elemento da tela principal além da logomarca do Roll6.
2. **Given** a página do editor, **When** o usuário escolhe um dos seus tokens com modelo 3D, **Then** o modelo aparece tocando a animação em loop (ou uma vez, se a animação não for de loop), com a mesma conversão de esqueleto que a mesa usa.
3. **Given** a animação tocando, **When** o usuário pausa e arrasta a linha do tempo, **Then** a pose do instante é mostrada e o editor diz "Pose N de M" ou "Entre as poses N e N+1 (de M)".
4. **Given** a aba do editor aberta, **When** o usuário recarrega a página ou abre o link diretamente, **Then** o editor abre de novo na mesma animação, pedindo login se preciso.
5. **Given** uma animação de outro usuário, **When** alguém tenta abrir o editor dela, **Then** a página diz que só o dono edita e oferece voltar.
6. **Given** uma animação sem o agente conectado, **Then** tudo desta história funciona; só a conversa fica indisponível, com o aviso de como ligar o agente.

---

### User Story 2 - Conversar com o Claude da minha máquina pelo agente (Priority: P1)

O usuário roda na sua máquina o **agente do Roll6**, um programa de console: ele se conecta ao Roll6 com a chave de API do usuário e fica esperando. Na aba do editor, o estado muda para "agente conectado". O usuário escreve um pedido ("faça ele andar mais devagar"), e o editor manda o pedido ao agente, que roda o Claude Code local no projeto da mesa, com a skill de animações, sobre a animação aberta. A resposta chega aos poucos na conversa; quando o Claude grava uma versão nova do arquivo, o agente a envia para a biblioteca e o modelo na aba passa a tocar a versão nova, mantendo o instante e o ângulo da câmera. Cada animação tem a sua conversa, retomada quando o editor dela é aberto de novo, e "Nova conversa" recomeça do zero.

**Why this priority**: é o motivo do roll6anime existir — fechar o ciclo pedido → arquivo → resultado num só lugar — agora dentro do site.

**Independent Test**: rodar o agente, abrir o editor, ver "agente conectado", pedir uma mudança e ver a resposta chegar e o modelo tocar a versão nova sem recarregar; fechar o agente e ver o estado mudar para "desconectado".

**Acceptance Scenarios**:

1. **Given** o agente rodando com a chave de API do usuário, **When** o editor abre, **Then** o estado mostra "agente conectado" em poucos segundos; ao fechar o agente, "agente desconectado".
2. **Given** o agente conectado, **When** o usuário envia um pedido, **Then** a resposta do Claude aparece aos poucos na conversa, com o que ele está fazendo, até terminar.
3. **Given** um pedido em andamento, **When** o Claude grava uma versão válida da animação, **Then** em poucos segundos o modelo na aba toca a versão nova, no mesmo instante e ângulo, e a versão fica na biblioteca com o mesmo id.
4. **Given** um pedido em andamento, **When** o Claude grava um arquivo inválido, **Then** o editor mostra o erro e continua tocando a última versão válida.
5. **Given** o agente desconectado, **When** o usuário tenta enviar um pedido, **Then** o campo fica desabilitado com a instrução de rodar o agente, e nada é perdido do que ele digitou.
6. **Given** a mesma animação aberta de novo (outra aba, outro dia), **Then** a conversa anterior reaparece e o próximo pedido continua a mesma conversa com o Claude; "Nova conversa" recomeça.
7. **Given** um pedido que leva muito tempo, **When** o usuário quer parar, **Then** "Parar" interrompe o Claude e a conversa diz que foi interrompido.
8. **Given** dois agentes rodando para a mesma conta, **Then** o editor usa um deles e diz qual (nome da máquina); o outro fica em espera.
9. **Given** o agente de outro usuário conectado, **Then** ele nunca recebe pedidos desta conta.

---

### User Story 3 - Esqueleto e edição de pose, com histórico (Priority: P2)

O usuário liga "Esqueleto": os ossos aparecem sobre o modelo (âmbar onde a animação os move, ciano nos demais) e passar o mouse diz o nome do osso. Ele clica numa junta, a animação pausa, e um gizmo de rotação deixa girar o osso; ao soltar, o giro é gravado na pose daquele instante, a animação ganha uma versão nova na biblioteca e o modelo toca a versão nova. Cada versão — do Claude, do usuário ou enviada por outro programa — entra num histórico; Ctrl+Z e Ctrl+Y (e os botões ↶ ↷) andam por ele, restaurando o conteúdo exato da versão.

**Why this priority**: é o ajuste fino que evita um pedido ao Claude para cada detalhe. Funciona sem o agente.

**Independent Test**: ligar o esqueleto, girar o braço com o gizmo, ver a pose gravada e tocando; desfazer e refazer; recarregar e ver a última versão.

**Acceptance Scenarios**:

1. **Given** "Esqueleto" ligado, **Then** os ossos aparecem sobre o modelo a 35% de opacidade, âmbar onde a animação os move, e o nome do osso ao passar o mouse.
2. **Given** um clique numa junta, **Then** a animação pausa e o gizmo de rotação aparece naquele osso.
3. **Given** o gizmo solto, **Then** o giro vira a pose daquele instante (substituindo a pose-chave ou criando uma nova), a animação é salva como versão nova na biblioteca e o modelo a toca; a animação continua válida.
4. **Given** versões no histórico, **When** Ctrl+Z / Ctrl+Y, **Then** a versão anterior/seguinte é restaurada exatamente como era, salva na biblioteca e tocada.
5. **Given** um pedido ao Claude em andamento, **Then** a edição de pose fica bloqueada até ele terminar, com aviso.
6. **Given** o agente desconectado, **Then** a edição de pose e o histórico funcionam do mesmo jeito.

---

### User Story 4 - Prints com marcação na conversa (Priority: P2)

Para explicar um detalhe ao Claude, o usuário tira um print da vista 3D no instante e ângulo atuais. O print abre numa janela de marcação com lápis, retângulo e círculo pontilhados e seta, em vermelho, com Desfazer e Limpar; "Concluir" anexa o print à próxima mensagem (até 5), "Cancelar" descarta. Cada print leva uma legenda automática: animação, instante, lado da câmera, pose-chave e se o esqueleto estava visível, mais a nota de que as marcas vermelhas são do usuário. Na conversa, a mensagem mostra as miniaturas.

**Why this priority**: é como o roll6anime diz "este braço aqui"; sem isso, os pedidos ficam vagos.

**Independent Test**: tirar um print, desenhar uma seta, concluir, enviar com um pedido e ver a miniatura na mensagem e o Claude citando o que foi marcado.

**Acceptance Scenarios**:

1. **Given** a vista 3D, **When** "Anexar print", **Then** a janela de marcação abre com a imagem do instante e ângulo atuais.
2. **Given** a janela de marcação, **When** o usuário desenha com as quatro ferramentas e desfaz, **Then** as marcas aparecem e somem na ordem.
3. **Given** "Concluir", **Then** a miniatura entra na lista de anexos da próxima mensagem (no máximo 5) e um clique nela reabre a marcação.
4. **Given** a mensagem enviada com prints, **Then** o Claude os recebe com a legenda, e a mensagem na conversa mostra as miniaturas.

---

### User Story 5 - O console: uma ponte simples e segura entre o site e o Claude local (Priority: P2)

O `Roll6.Console` é um programa de console para a máquina do usuário, separado de tudo o que é animação. Ele lê um arquivo de configuração (endereço do Roll6, pasta de trabalho do projeto da mesa, ferramentas permitidas ao Claude) e a chave de API do Roll6 de uma variável de ambiente. Ao iniciar, confere a chave, o Claude Code instalado e logado, e mostra "Conectado ao Roll6 como {nome}". Ele só atende pedidos da própria conta, roda o Claude com permissões restritas, dentro do projeto configurado, grava e acompanha os arquivos que o servidor pedir, e reconecta sozinho quando a rede cai. Ele não interpreta o que o Claude produz: devolve os eventos e os arquivos alterados, e o servidor decide o resto.

**Why this priority**: sem uma ponte fácil de rodar e segura, a US2 não acontece; separada da animação, ela serve a qualquer tela futura.

**Independent Test**: configurar, rodar, ver a mensagem de conectado; rodar com chave errada e ver o erro claro; derrubar a rede e ver reconectar.

**Acceptance Scenarios**:

1. **Given** a configuração e a chave válidas, **When** o agente inicia, **Then** ele imprime a conta, a pasta de trabalho e "conectado", e o editor passa a vê-lo.
2. **Given** uma chave inválida ou revogada, **Then** o agente para com uma mensagem clara, sem tentar reconectar.
3. **Given** o Claude Code ausente ou deslogado, **Then** o agente avisa ao iniciar e não aceita pedidos.
4. **Given** a rede caindo, **Then** o agente reconecta sozinho e o editor volta a mostrar "conectado".
5. **Given** um pedido de outra conta, **Then** o agente nunca o recebe.
6. **Given** o Claude rodando, **Then** ele só grava arquivos (nada mais), só na pasta do projeto, com as ferramentas permitidas na configuração.
7. **Given** o console, **Then** ele não tem nenhuma regra de animação: o servidor manda o pedido pronto (instruções, texto, imagens, sessão, arquivos a gravar antes e a acompanhar) e recebe de volta os eventos do Claude e o conteúdo de cada arquivo acompanhado que mudar.

---

### Edge Cases

- **Aba do editor sem token com modelo 3D**: a página explica que é preciso um token com modelo 3D e aponta para a biblioteca de tokens; a conversa e os prints ficam desabilitados até escolher um.
- **Modelo sem esqueleto Mixamo**: a animação não toca e o editor avisa (como o formulário do token).
- **Animação apagada enquanto o editor está aberto**: o editor avisa e desabilita tudo.
- **Duas abas do mesmo editor**: ambas mostram a versão mais nova; a conversa é a mesma e os pedidos entram na ordem.
- **Versão chegando enquanto o usuário arrasta o gizmo**: a versão nova é aplicada quando ele soltar; a edição que ele estava fazendo vale sobre a versão nova.
- **Agente cai no meio de um pedido**: a conversa diz que o agente caiu; o pedido pode ser reenviado quando ele voltar.
- **Pedidos em sequência**: um pedido por vez por animação; o campo fica desabilitado até o anterior terminar ou ser parado.
- **O Claude cria uma animação nova em vez de alterar a aberta**: o editor diz que um arquivo novo foi criado e oferece abri-lo (criando-o na biblioteca com o nome do arquivo).
- **Tamanho dos prints**: cada print é reduzido antes de ir ao Claude; ao todo não passam do limite de uma mensagem.
- **Telefone**: a página funciona para ver e conversar; esqueleto, gizmo e marcação são para desktop e ficam escondidos abaixo da largura de desktop.

## Requirements *(mandatory)*

### Functional Requirements

**Página do editor**

- **FR-001**: "Animações" no menu do usuário MUST oferecer, em cada animação do próprio usuário, a ação "Editar no editor", que abre o editor **em nova aba**.
- **FR-002**: A página do editor MUST ter endereço próprio por animação, MUST exigir login e MUST ser acessível só ao dono da animação (outros veem o aviso).
- **FR-003**: A página MUST mostrar apenas a logomarca do Roll6, o nome da animação, o estado do agente e o editor — nenhum elemento da tela principal.
- **FR-004**: O editor MUST deixar escolher um token do usuário com modelo 3D para mostrar a animação, e MUST lembrar o último escolhido neste navegador.
- **FR-005**: O modelo MUST tocar a animação como a mesa toca (mesma conversão de esqueleto), com tocar/pausar, uma linha do tempo arrastável e a indicação da pose-chave do instante.
- **FR-006**: A vista 3D MUST girar em torno do personagem (arrastar) e aproximar (roda, pinça, botões), e MUST manter o instante e o ângulo quando uma versão nova chega.

**Conversa e versões**

- **FR-007**: O editor MUST mostrar o estado do agente da conta (conectado, com o nome da máquina; desconectado, com a instrução de como rodar) e atualizá-lo em poucos segundos.
- **FR-008**: Com o agente conectado, o usuário MUST poder enviar um pedido em texto, com até 5 prints, e ver a resposta chegar aos poucos, com os passos do Claude, até terminar; "Parar" MUST interromper.
- **FR-009**: Cada versão válida gravada pelo Claude MUST virar o conteúdo da animação na biblioteca (mesmo id) em poucos segundos e MUST ser tocada na aba sem recarregar; uma versão inválida MUST ser mostrada como erro sem substituir a válida.
- **FR-010**: Cada animação MUST ter uma conversa própria, guardada no Roll6, retomada ao abrir o editor; "Nova conversa" MUST recomeçar.
- **FR-011**: Um pedido por vez por animação; pedidos de outras animações da mesma conta MUST esperar o agente ficar livre (fila).

**Esqueleto, pose e histórico**

- **FR-012**: "Esqueleto" MUST desenhar os ossos sobre o modelo (movidos pela animação em destaque), com o nome do osso ao passar o mouse, e MUST ser lembrado neste navegador.
- **FR-013**: Clicar numa junta MUST pausar e abrir um gizmo de rotação; soltar MUST gravar o giro na pose do instante, salvar a versão na biblioteca e tocá-la, sempre gerando uma animação válida.
- **FR-014**: Toda versão da animação (Claude, usuário, outro programa) MUST entrar num histórico de até 100 versões por sessão da aba; Ctrl+Z / Ctrl+Y e os botões MUST restaurar o conteúdo exato e salvá-lo.
- **FR-015**: Enquanto um pedido ao Claude está em andamento, a edição de pose MUST ficar bloqueada com aviso.

**Prints**

- **FR-016**: "Anexar print" MUST capturar a vista 3D no instante e ângulo atuais e abrir a marcação (lápis, retângulo, círculo, seta, Desfazer, Limpar, Concluir, Cancelar), em vermelho.
- **FR-017**: Cada print anexado MUST levar a legenda automática (animação, instante, lado da câmera, pose-chave, esqueleto visível, marcas do usuário) e MUST aparecer como miniatura na mensagem.

**Console (agente)**

- **FR-018**: O agente MUST ser o projeto .NET `Roll6.Console`, um programa de console separado e sem conhecimento de animações, configurado por arquivo (endereço do Roll6, pasta do projeto, ferramentas permitidas) e pela chave de API em variável de ambiente, nunca gravada por ele.
- **FR-019**: Ao iniciar, o agente MUST validar a chave, o Claude Code instalado e logado, e informar conta, pasta e estado; chave inválida MUST parar com mensagem; Claude ausente MUST avisar.
- **FR-020**: O agente MUST se conectar de saída ao Roll6 (nenhuma porta aberta na máquina), reconectar sozinho e atender só pedidos da própria conta, um por vez.
- **FR-021**: O agente MUST rodar o Claude Code com a conta local, no projeto configurado, com as instruções que o servidor mandar no pedido (ele não monta contexto algum), com permissões restritas às ferramentas configuradas, e MUST retransmitir a saída aos poucos.
- **FR-022**: Antes de rodar, o agente MUST gravar na pasta de trabalho os arquivos que o pedido trouxer; durante e logo após o pedido MUST acompanhar os caminhos que o pedido indicar e devolver ao servidor o conteúdo de cada um que mudar, sem validar nem interpretar nada. O servidor MUST montar o pedido da animação (o arquivo com a versão da biblioteca, o contexto, os caminhos a acompanhar) e MUST validar cada conteúdo devolvido antes de guardá-lo como versão.
- **FR-023**: O servidor MUST repassar pedidos e respostas apenas entre as conexões de uma mesma conta e MUST guardar as conversas; o agente de outra conta MUST ser invisível.

**Continuidade**

- **FR-024**: As animações continuam no formato e na biblioteca de hoje (059); os tokens que usam uma animação editada MUST tocar a versão nova sem mudança.
- **FR-025**: A skill `criar-animacao` do projeto da mesa MUST continuar funcionando como hoje; o agente usa a mesma skill.
- **FR-026**: O aplicativo de desktop roll6anime MUST ser removido do repositório, sem perda de nenhuma de suas capacidades (SC-007); a documentação MUST apontar para o editor web e para o console.

### Key Entities

- **Agente (`Roll6.Console`)**: um programa na máquina do usuário, ligado à conta pela chave de API; tem nome (a máquina), estado (conectado/ocupado/desconectado) e a pasta de trabalho. Genérico: executa pedidos ao Claude e grava/acompanha arquivos a pedido do servidor. Uma conta pode ter mais de um; o editor usa um por vez.
- **Pedido ao Claude**: o que o servidor monta para o agente a partir da animação e da conversa — instruções, texto do usuário, prints com legendas, sessão do Claude, arquivos a gravar antes e caminhos a acompanhar — e o que volta: eventos e arquivos alterados.
- **Conversa da animação**: a sequência de pedidos do usuário (texto + prints) e respostas do Claude de uma animação, guardada no Roll6, com a identificação da sessão do Claude para continuar; "Nova conversa" começa outra.
- **Versão da animação**: um conteúdo válido da animação, de origem Claude, usuário (pose) ou outro programa, com o instante; a versão atual é o conteúdo da animação na biblioteca; o histórico da aba guarda as recentes.
- **Print**: imagem da vista 3D com as marcas do usuário e a legenda automática, anexada a um pedido.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Da janela "Animações" ao modelo tocando a animação no editor, em menos de 30 segundos, sem nenhum elemento da tela principal na aba nova.
- **SC-002**: Com o agente rodando, um pedido ao Claude mostra o início da resposta em menos de 10 segundos e o modelo toca a versão nova em menos de 5 segundos depois de o Claude gravá-la, mantendo instante e ângulo.
- **SC-003**: O estado do agente na aba reflete conectar/desconectar em menos de 10 segundos.
- **SC-004**: Um giro de osso pelo gizmo vira uma versão válida e salva em menos de 2 segundos; Ctrl+Z restaura a anterior exatamente.
- **SC-005**: Um usuário instala e roda o agente, com as instruções da página, em menos de 10 minutos.
- **SC-006**: Pedidos de uma conta nunca chegam ao agente de outra (100% dos casos).
- **SC-007**: Tudo o que o roll6anime de desktop faz hoje (tocar, linha do tempo, pose-chave, esqueleto, gizmo, histórico, prints com marcação, conversa por animação, envio ao Roll6) está disponível no editor web.

## Assumptions

- O Claude usado é o Claude Code instalado e logado na máquina do usuário (conta, não chave de API da Anthropic), rodando no projeto da mesa (`C:\repos\gurps-adventure`) com a skill `criar-animacao`, como no roll6anime.
- O agente (`Roll6.Console`) recebe do roll6anime só a parte genérica (execução do Claude, leitura do stream, gravação e acompanhamento de arquivos); o contexto da animação e a validação passam para o servidor. A chave de API é a do Roll6 (019). O aplicativo de desktop é removido do repositório nesta entrega.
- A animação da biblioteca é a fonte de verdade; a pasta de animações da máquina é a área de trabalho do Claude, sincronizada pelo agente.
- O modelo 3D do editor é um token do usuário com modelo (055); o editor não recebe arquivos `.glb` soltos.
- O agente roda em Windows, Linux ou macOS onde houver .NET 8 e o Claude Code; o primeiro alvo é o Windows do usuário.
- As conversas ficam no Roll6, por animação e por usuário, sem limite fixo nesta entrega; os prints anexados não ficam guardados depois de enviados.
- A edição de pose e o histórico funcionam sem agente; só a conversa depende dele.
- A vista 3D do editor reaproveita o visual das prévias do site (fundo, luz, disco), não a mesa.
- Fora do escopo: editar várias animações ao mesmo tempo, mais de um pedido simultâneo por conta, compartilhar o editor com outros usuários, e o Claude gerar modelos.
