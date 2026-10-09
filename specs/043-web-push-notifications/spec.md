# Feature Specification: Notificações da mesa (Web Push)

**Feature Branch**: `043-web-push-notifications`
**Created**: 2026-10-09
**Status**: Draft
**Input**: User description: "Implemente a issue https://github.com/landim32/roll6/issues/39" — revisada com as regras de notificação definidas pelo dono do produto.

## Contexto

Hoje o jogador só vê o que acontece na campanha com o Roll6 aberto. Esta feature avisa no celular (Android e iPhone com o Roll6 instalado, #38) e no computador sobre o que importa para cada um: as mensagens do chat, as ações dos personagens (para o mestre), quem ainda falta agir, o fim do turno, mudanças de PV e de Fadiga do próprio personagem e um "Cutucar" para apressar quem não agiu. O chat continua sendo a fonte da verdade: a notificação é só um aviso, sem garantia de entrega.

## Clarifications

### Session 2026-10-09

- Q: Com o Roll6 aberto e à vista, como chegam os avisos pessoais (N3–N7)? → A: Com uma janela do Roll6 à vista naquela campanha, aparecem como aviso dentro do app (toast); senão, como notificação do sistema.
- Q: O "Cutucar" deve ficar registrado no chat? → A: Sim: uma linha discreta e cinza no chat, "Rodrigo cutucou Ana e Bruno" (primeiros nomes), além das notificações.
- Q: A "maioria" do "Falta apenas você…" conta jogadores ou personagens? → A: Personagens: ⌈metade dos personagens aprovados⌉; a lista mostra o primeiro nome dos donos dos personagens que faltam, sem repetir quem tem dois.

## Notificações (catálogo)

| # | Quando | Quem recebe | Texto |
|---|---|---|---|
| N1 | Mensagem nova no chat (texto, foto, áudio, rolagem de dados, narração do mestre) | Participantes da campanha, exceto o autor, que não estão com o chat dessa campanha à vista | Título: nome de quem falou · campanha. Corpo: o texto da mensagem (começo, ≤ 120 caracteres); "enviou uma foto"; "enviou um áudio"; "rolou 3d6: total N"; narração: "Narração: " + começo do texto |
| N2 | Um personagem registra sua ação no turno | Só o mestre da campanha (se não for ele o autor e não estiver com o chat à vista) | Título: nome do personagem · campanha. Corpo: o texto da ação |
| N3 | A maioria dos personagens aprovados da campanha já agiu no turno (metade arredondada para cima; conta personagens, não jogadores) | Cada jogador que ainda tem personagem sem ação nesse turno | "Falta apenas você e Bruno" (primeiro nome dos outros jogadores que faltam) ou "Falta apenas você" |
| N4 | O turno termina | Os jogadores da campanha (não quem terminou o turno) | "Turno 12 terminado. Pode agir novamente" |
| N5 | Os PV atuais do personagem mudam na campanha | O dono do personagem (se não foi ele quem mudou) | "Você está com -3/13 PV" (atual/total) |
| N6 | A Fadiga atual do personagem muda na campanha | O dono do personagem (se não foi ele quem mudou) | "Você está com 5/11 de Fadiga" (atual/total) |
| N7 | Alguém usa "Cutucar" | Cada jogador com personagem que ainda não agiu no turno (exceto quem cutucou) | "Rodrigo está cutucando você" (primeiro nome de quem cutucou) |

Não notificam: movimentos, mudanças de personagem que não sejam PV ou Fadiga (status, postura, ficha, deslocamento…), resultados de ação e, para os jogadores, as ações dos outros personagens.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ativar as notificações neste aparelho (Priority: P1)

Uma jogadora abre o menu do usuário, toca em "Notificações" e em "Ativar neste aparelho". O navegador pede a permissão; ela aceita e o Roll6 confirma que estão ligadas naquele aparelho. Pelo mesmo lugar ela desliga. Com a permissão bloqueada, o Roll6 explica como liberar; no iPhone fora do app instalado, mostra o guia de instalação.

**Why this priority**: Sem ativar nada acontece, e a permissão só pode ser pedida por um gesto do usuário.

**Independent Test**: Num Android com Chrome, ativar, ver "ativadas", desativar, ver "desativadas"; negar a permissão e ver as instruções.

**Acceptance Scenarios**:

1. **Given** o usuário logado, **When** abre "Notificações", **Then** vê se este aparelho está ativado e o botão para mudar.
2. **Given** desativadas, **When** toca em "Ativar neste aparelho" e aceita, **Then** este aparelho passa a receber (cada aparelho é ativado à parte).
3. **Given** a permissão bloqueada, **When** tenta ativar, **Then** vê como liberar nas configurações do navegador.
4. **Given** ativadas, **When** desativa, **Then** este aparelho deixa de receber; os outros continuam.
5. **Given** iPhone/iPad no navegador sem o Roll6 instalado, **When** toca em ativar, **Then** vê o guia de instalação (#38).
6. **Given** navegador sem suporte, **When** abre "Notificações", **Then** vê que não há suporte, sem botão.
7. **Given** a página acabou de abrir, **When** nada foi tocado, **Then** o navegador nunca pede a permissão sozinho.

---

### User Story 2 - Mensagens do chat e ações para o mestre (Priority: P1)

Quem não está com o chat da campanha à vista recebe as mensagens dos outros com o texto (N1). O mestre recebe também cada ação registrada pelos personagens, com o texto da ação (N2); os jogadores não recebem as ações. Tocar na notificação abre a campanha com o chat visível.

**Why this priority**: É o uso principal: acompanhar a conversa e, para o mestre, saber o que cada personagem fez para conduzir o turno.

**Independent Test**: Mestre M, jogadores A e B na mesma campanha, todos com notificações ativas e o app fechado. A escreve no chat → M e B recebem o texto. A registra uma ação → só M recebe, com o texto da ação.

**Acceptance Scenarios**:

1. **Given** B não está com o chat à vista, **When** A envia "Vamos pela ponte", **Then** B recebe "Aria · Tormento Vil" com o corpo "Vamos pela ponte".
2. **Given** foto, áudio ou rolagem, **When** B recebe, **Then** o corpo é "enviou uma foto", "enviou um áudio" ou "rolou 3d6: total N".
3. **Given** o mestre escreve uma narração, **When** os jogadores recebem, **Then** o corpo começa com "Narração:" e o começo do texto.
4. **Given** A registra a ação "Ataco o orc com a espada", **When** a ação é salva, **Then** o mestre recebe com o nome do personagem e esse texto; nenhum jogador recebe.
5. **Given** B está com o chat da campanha à vista em algum aparelho, **When** chega mensagem ou ação, **Then** B não recebe notificação de N1/N2.
6. **Given** quem escreveu ou agiu, **When** a mensagem/ação é salva, **Then** o autor nunca é notificado dela.
7. **Given** várias mensagens seguidas da campanha, **When** B ainda não abriu, **Then** a mais recente substitui a anterior (uma por campanha na bandeja).
8. **Given** a notificação, **When** tocada, **Then** o Roll6 abre (ou volta a uma janela aberta) na campanha com o chat visível.
9. **Given** o envio da mensagem/ação, **When** salvo, **Then** aparece no chat na mesma hora que antes (o aviso não atrasa nada).

---

### User Story 3 - Avisos do turno: falta você e turno terminado (Priority: P1)

Quando a maioria dos personagens já agiu, quem ainda falta recebe "Falta apenas você e Bruno" (ou "Falta apenas você"). Quando o mestre fecha o turno, os jogadores recebem "Turno 12 terminado. Pode agir novamente".

**Why this priority**: É o que faz o turno andar sem o mestre cobrar cada um no grupo de mensagens.

**Independent Test**: Campanha com 4 personagens aprovados de 4 jogadores; dois agem → os outros dois recebem "Falta apenas você e {o outro}". O mestre finaliza → os quatro recebem "Turno N terminado. Pode agir novamente".

**Acceptance Scenarios**:

1. **Given** N personagens aprovados na campanha, **When** a ação que faz o número de personagens que agiram chegar a ⌈N/2⌉ é registrada, **Then** cada jogador com personagem sem ação recebe N3, listando o primeiro nome dos **outros** jogadores que faltam ("Falta apenas você, Bruno e Ana"; só ele: "Falta apenas você").
2. **Given** N3 já foi enviado neste turno, **When** mais personagens agem, **Then** N3 não é enviado de novo no mesmo turno.
3. **Given** um jogador com dois personagens, um que agiu e um que não, **When** N3 é enviado, **Then** ele recebe uma vez e conta como "falta".
4. **Given** o turno é finalizado (pelo mestre, pelo processamento do turno ou avançando o turno), **When** isso acontece, **Then** cada jogador com personagem aprovado recebe "Turno {número que terminou} terminado. Pode agir novamente", exceto quem finalizou.
5. **Given** o jogador está com uma janela do Roll6 à vista nessa campanha (qualquer layout), **When** N3/N4 ocorrem, **Then** aparecem como aviso dentro do app (toast) e não como notificação do sistema; sem janela à vista, chegam como notificação do sistema.

---

### User Story 4 - PV e Fadiga do meu personagem (Priority: P2)

Quando os PV ou a Fadiga atuais do meu personagem mudam na campanha (o mestre aplicou dano, o turno foi processado), recebo "Você está com -3/13 PV" ou "Você está com 5/11 de Fadiga".

**Why this priority**: O jogador descobre na hora o que aconteceu com o personagem, sem abrir a ficha.

**Independent Test**: O mestre muda a vida atual do personagem de B de 13 para -3 → B recebe "Você está com -3/13 PV".

**Acceptance Scenarios**:

1. **Given** o mestre muda os PV atuais do personagem de B, **When** salva, **Then** B recebe "Você está com {atual}/{total} PV".
2. **Given** a Fadiga atual (energia) muda, **When** salva, **Then** B recebe "Você está com {atual}/{total} de Fadiga".
3. **Given** PV e Fadiga mudam juntos (por exemplo no processamento do turno), **When** salvo, **Then** B recebe as duas mensagens (ou uma só com as duas linhas).
4. **Given** o próprio B mudou os valores, **When** salva, **Then** B não é notificado.
5. **Given** outros campos mudaram (status, postura, ficha, deslocamento), **When** salvo, **Then** não há notificação.
6. **Given** NPCs, **When** os PV deles mudam, **Then** ninguém é notificado.

---

### User Story 5 - Cutucar quem não agiu (Priority: P2)

No clipe de papel do chat há "Cutucar". Qualquer participante (mestre ou jogador) toca nele e cada jogador com personagem que ainda não agiu no turno recebe "Rodrigo está cutucando você".

**Why this priority**: Um jeito leve de apressar a mesa sem depender do mestre.

**Independent Test**: B e C não agiram; A toca em "Cutucar" → B e C recebem "{primeiro nome de A} está cutucando você"; A vê a confirmação de quantos foram cutucados.

**Acceptance Scenarios**:

1. **Given** o chat da campanha, **When** o usuário abre o clipe de papel, **Then** vê "Cutucar" junto das outras opções (mestre e jogadores).
2. **Given** jogadores com personagem sem ação no turno, **When** alguém toca em "Cutucar", **Then** cada um deles recebe "{primeiro nome de quem cutucou} está cutucando você" (quem cutucou não recebe, mesmo que também falte).
3. **Given** todos já agiram, **When** alguém toca em "Cutucar", **Then** vê "Todos já agiram neste turno" e nada é enviado.
4. **Given** um cutucão enviado, **When** a mesma pessoa tenta de novo na mesma campanha em menos de 1 minuto, **Then** vê que precisa esperar e nada é enviado.
5. **Given** o cutucão, **When** enviado, **Then** quem cutucou vê a confirmação "Cutucou N jogador(es)" e todos na campanha veem no chat uma linha discreta e cinza "{quem cutucou} cutucou {nomes}" (primeiros nomes dos jogadores cutucados, "Ana e Bruno" / "Ana, Bruno e Caio").
6. **Given** a linha do cutucão no chat, **When** os outros a veem, **Then** ela não gera notificação de mensagem (N1) — só os cutucados recebem N7 — e não pode ser apagada pelo chat.

---

### User Story 6 - Silenciar uma campanha e limpeza automática (Priority: P3)

Na janela "Notificações", o usuário silencia e reativa cada campanha. Inscrições que não servem mais somem sozinhas, e sair da conta cancela a do aparelho.

**Why this priority**: Controle mínimo para não virar ruído e para aparelhos compartilhados.

**Independent Test**: Silenciar a campanha X → nada dela chega; Y continua. Sair da conta → aquele aparelho deixa de receber.

**Acceptance Scenarios**:

1. **Given** a campanha X silenciada, **When** qualquer notificação de X ocorreria (N1–N7), **Then** não é enviada; as outras campanhas continuam.
2. **Given** a preferência mudada num aparelho, **When** outro aparelho do usuário recebe, **Then** vale a mesma preferência.
3. **Given** o serviço de notificações do navegador diz que a inscrição não existe mais, **When** o Roll6 tenta enviar, **Then** ela é removida.
4. **Given** um aparelho ativado, **When** o usuário sai da conta nele, **Then** aquele aparelho deixa de receber.
5. **Given** um usuário que perdeu o acesso à campanha, **When** algo acontece nela, **Then** não é notificado.

---

### Edge Cases

- Mestre que também tem personagem aprovado: recebe N2 (ações dos outros) e os avisos pessoais do próprio personagem (N3–N6), nunca duas notificações do mesmo evento.
- Avisos pessoais com o Roll6 à vista em outra campanha: chegam como notificação do sistema (o toast só aparece na janela da campanha do aviso).
- Turno resetado por um personagem (ação apagada) depois de N3: N3 não é reenviado no mesmo turno.
- Campanha com 1 personagem: ⌈1/2⌉ = 1, então quando ele age não falta ninguém e N3 não é enviado.
- Personagem sem dono com notificações ativas: o aviso simplesmente não chega a ninguém.
- Mensagem apagada depois do envio: a notificação enviada não é retirada.
- Serviço de notificações fora do ar: a ação/mensagem é salva normalmente; o aviso pode não chegar.
- Texto longo: corpo cortado em ~120 caracteres com reticências; markdown vira texto simples.
- PV/Fadiga mudados por um assistente de IA (chave de API) em nome do mestre: notifica o dono normalmente.
- iOS: só chega com o Roll6 instalado (iOS 16.4+).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O usuário MUST poder ativar e desativar as notificações por aparelho em "Notificações" no menu do usuário; a permissão do navegador MUST ser pedida só depois de um toque.
- **FR-002**: Permissão bloqueada → instruções de como liberar; sem suporte → aviso de que não há suporte; iPhone/iPad fora do app instalado → guia de instalação (#38).
- **FR-003**: N1 — cada mensagem nova do chat (texto, foto, áudio, rolagem, narração) MUST notificar os participantes da campanha (mestre e jogadores com personagem aprovado), exceto o autor e quem estiver com o chat dessa campanha à vista em algum aparelho, com o texto da mensagem como corpo (ou os textos fixos de foto, áudio, rolagem e narração do catálogo).
- **FR-004**: N2 — cada ação registrada por um personagem no turno MUST notificar **só o mestre** da campanha, com o nome do personagem e o texto da ação, exceto se o mestre for o autor ou estiver com o chat à vista. Jogadores MUST NOT ser notificados de ações.
- **FR-005**: N3 — na ação que faz o número de personagens aprovados que agiram no turno atingir ⌈N/2⌉ (N = personagens aprovados na campanha), cada jogador com pelo menos um personagem sem ação MUST receber "Falta apenas você" ou "Falta apenas você e {nomes}", com o primeiro nome dos outros jogadores que faltam ("A e B", "A, B e C"); uma única vez por turno.
- **FR-006**: N4 — quando um turno termina (finalizar, processar ou avançar o turno), cada jogador com personagem aprovado, exceto quem terminou, MUST receber "Turno {n} terminado. Pode agir novamente".
- **FR-007**: N5/N6 — quando os PV atuais ou a Fadiga atual de um personagem mudam numa campanha, o dono MUST receber "Você está com {atual}/{total} PV" / "Você está com {atual}/{total} de Fadiga", exceto se foi ele quem mudou. Outros campos e NPCs MUST NOT notificar.
- **FR-008**: N7 — o clipe de papel do chat MUST ter "Cutucar", disponível ao mestre e aos jogadores com acesso ao chat; cutucar MUST notificar cada jogador com personagem sem ação no turno (exceto quem cutucou) com "{primeiro nome} está cutucando você"; com todos já tendo agido, MUST informar "Todos já agiram neste turno"; a mesma pessoa MUST esperar 1 minuto entre cutucões na mesma campanha; cada cutucão MUST ficar registrado no chat como uma linha discreta e cinza "{quem cutucou} cutucou {nomes}" (primeiros nomes), vista por todos, que não gera N1 e não pode ser apagada; quem cutucou MUST ver quantos foram cutucados.
- **FR-009**: Os avisos pessoais (N3–N7) MUST chegar ao destinatário mesmo com o chat à vista: se ele tiver uma janela do Roll6 visível com aquela campanha aberta (qualquer layout), como aviso dentro do app (toast, sem notificação do sistema); caso contrário, como notificação do sistema. N1 e N2 MUST respeitar o chat à vista (sem aviso algum para quem o está vendo).
- **FR-010**: "Chat à vista" MUST significar uma janela do Roll6 visível com essa campanha aberta no layout "Mapa e chat" ou "Só o chat".
- **FR-011**: As notificações MUST usar o primeiro nome dos usuários onde aparecem nomes de pessoas (N3, N7 e "Mestre (GM) — {primeiro nome}") e o nome do personagem quando quem fala é um personagem; o título MUST incluir o nome da campanha.
- **FR-012**: Notificações N1/N2 da mesma campanha MUST substituir umas às outras em cada aparelho; N3–N7 MUST aparecer separadas das mensagens (não substituídas por elas).
- **FR-013**: Tocar numa notificação MUST abrir o Roll6 (ou focar uma janela aberta) na campanha, com o chat visível.
- **FR-014**: O usuário MUST poder silenciar e reativar cada campanha; silenciada, nada dela notifica (N1–N7). Preferências valem para todos os aparelhos do usuário.
- **FR-015**: Nenhuma ação do usuário (enviar mensagem, agir, finalizar turno, mudar PV) MUST ficar mais lenta por causa das notificações; falhas no envio MUST ser registradas e não afetar a mesa.
- **FR-016**: Inscrições recusadas pelo serviço de notificações como inexistentes/expiradas MUST ser removidas; sair da conta MUST cancelar a inscrição do aparelho.
- **FR-017**: Só participantes com acesso à campanha no momento do evento MUST ser notificados.
- **FR-018**: Ativar/desativar um aparelho MUST exigir a sessão do usuário (não chave de API); cutucar e silenciar campanhas MAY ser feitos também por assistentes de IA com a chave do usuário.
- **FR-019**: Nenhum serviço de terceiros com conta ou custo MUST ser necessário: o Roll6 usa o mecanismo padrão de notificações dos navegadores, identificado por um par de chaves próprio guardado como segredo do servidor.
- **FR-020**: Todos os textos MUST estar em português (pt-BR).

### Key Entities

- **Inscrição de notificações**: um aparelho/navegador de um usuário apto a receber avisos — dono, endereço de entrega do navegador e suas chaves, criação e último uso. Um endereço pertence a uma única inscrição.
- **Preferência da campanha**: por usuário e campanha — silenciada (sim/não). Sem registro: não silenciada.
- **Marca de "falta você" do turno**: por campanha, o último turno em que N3 já foi enviado (para não repetir no mesmo turno).
- **Cutucão**: uma entrada da linha do tempo do chat — quem cutucou, quando, em qual turno e quais jogadores foram cutucados; também serve para o intervalo de 1 minuto entre cutucões da mesma pessoa na mesma campanha.
- **Presença**: em memória, quais conexões do usuário estão com uma janela visível de qual campanha e se o chat está à vista nela.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário ativa as notificações em até 3 toques a partir do menu do usuário.
- **SC-002**: Em rede normal, os avisos chegam em menos de 10 segundos em 95% dos casos testados.
- **SC-003**: Nos cenários de teste, jogadores recebem 0 notificações de ações dos outros e o mestre recebe 1 por ação.
- **SC-004**: "Falta apenas você…" chega uma única vez por turno a cada jogador que falta, no momento em que a maioria agiu.
- **SC-005**: 100% dos jogadores (exceto quem fechou) recebem o aviso de turno terminado nos testes.
- **SC-006**: Zero notificações de mensagem/ação para o autor e para quem está com o chat da campanha à vista.
- **SC-007**: O tempo para salvar mensagens, ações e mudanças de PV não muda de forma perceptível.
- **SC-008**: Funciona no Chrome do Android (navegador e instalado), no Chrome/Edge/Firefox de computador e no iPhone com iOS 16.4+ e o Roll6 instalado.

## Assumptions

- "Jogador" = usuário dono de pelo menos um personagem aprovado na campanha; "personagem que agiu" = tem uma Ação registrada no turno atual (como no "Finalizar turno").
- A maioria conta personagens aprovados (não jogadores); a lista de quem falta usa o primeiro nome dos jogadores donos, sem repetir quem tem dois personagens.
- Fadiga é a energia atual do personagem na campanha (atual/total).
- Silenciar é liga/desliga por campanha; não há silenciar por tempo nem outras preferências por tipo nesta versão (as regras do catálogo são fixas).
- O cutucão fica no chat como uma linha discreta (é parte da linha do tempo da campanha, como os registros do turno), mas não é um registro do turno: não aparece no resumo, nos dados do turno nem conta como ação.
- O lugar das escolhas é a janela "Notificações" do menu do usuário (aparelho atual + campanhas da mesa do usuário).
- A presença do chat é mantida pelo canal de tempo real já existente; sem tempo real conta como "não está à vista". Uma única instância da API em produção.
- O par de chaves das notificações é gerado uma vez e guardado como segredo de produção junto dos atuais.
- Notificações por e-mail e outros acontecimentos fora deste catálogo estão fora do escopo.
