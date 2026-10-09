# Feature Specification: Metadados do mapa e favicon da marca

**Feature Branch**: `040-map-page-metadata`  
**Created**: 2026-10-08  
**Status**: Draft  
**Input**: User description: "implemente https://github.com/landim32/roll6/issues/35 e crie tb um favicon baseado no simbolo da logomarca" — issue #35: *Incluir metadados da campanha e do mapa na página do mapa: exibir os dados da campanha associados ao mapa, os dados do mapa e incluir a imagem do mapa.*

## Clarifications

### Session 2026-10-08

- Q: Quem pode ver a prévia do link (nome, campanha e imagem do mapa)? → A: Qualquer pessoa com o link, em qualquer campanha; só nome, campanha, mestre, grade e imagem — nada da mesa (peças, NPCs, fichas, turnos).
- Q: O que são os "metadados" da issue? → A: Prévia do link (aplicativos de mensagem, redes sociais) e título da aba. Nenhum painel novo dentro da mesa.
- Q: Os buscadores podem indexar as páginas de mapa e campanha? → A: Sim — indexação permitida normalmente, sem pedido de "não indexar".

## Contexto

Cada mapa de campanha tem um endereço próprio, `/map/{slug}`, que os jogadores compartilham entre si (no WhatsApp, por exemplo). Hoje, para quem recebe esse endereço e para o navegador, toda página do site é igual: título "Roll6", nenhuma descrição, nenhuma imagem e nenhum ícone na aba. Um link colado numa conversa aparece sem prévia. Numa aba entre outras, não dá para saber de qual campanha ou mapa se trata.

A issue pede que a página do mapa traga **metadados** com os dados da campanha, os dados do mapa e a imagem do mapa. O pedido também inclui um **favicon** feito a partir do símbolo da logomarca (o hexágono com o dado), para o site ter ícone na aba, nos favoritos e na tela inicial do celular.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - O link do mapa mostra uma prévia (Priority: P1)

O mestre copia o endereço do mapa da sessão e cola no grupo da campanha. A conversa mostra uma prévia com a imagem do mapa, o nome do mapa como título e a campanha (nome e mestre) na descrição. Quem recebe sabe do que se trata antes de abrir.

**Why this priority**: é o uso mais visível dos metadados pedidos na issue ("dados da campanha", "dados do mapa", "imagem do mapa") e é como o link do mapa circula entre os jogadores.

**Independent Test**: colar o endereço de um mapa num validador de prévia de links (ou numa conversa). Aparecem o título com o nome do mapa e da campanha, a descrição e a imagem do mapa.

**Acceptance Scenarios**:

1. **Given** o endereço de um mapa de campanha, **When** ele é colado num aplicativo de mensagens ou rede social, **Then** a prévia mostra como título "{nome do mapa} — {nome da campanha}", uma descrição com a campanha, o mestre e o tamanho da grade, e a imagem do mapa.
2. **Given** um mapa sem imagem, **When** o link é compartilhado, **Then** a prévia usa a imagem da marca Roll6 no lugar.
3. **Given** um endereço de mapa que não existe ou foi apagado, **When** é compartilhado, **Then** a prévia é a genérica do Roll6 (nome e descrição do site, imagem da marca), sem erro.
4. **Given** o endereço `/campaign/{slug}`, **When** é compartilhado, **Then** a prévia mostra o nome da campanha e o mestre, com a imagem do mapa atual da campanha quando houver.

---

### User Story 2 - A aba do navegador diz qual mapa está aberto (Priority: P2)

Com o mapa aberto, a aba do navegador mostra "{nome do mapa} — {nome da campanha} | Roll6". Ao trocar de mapa ou de campanha, o título acompanha. Fora de um mapa, aparece "{campanha} | Roll6" ou só "Roll6".

**Why this priority**: é o metadado que o próprio usuário vê o tempo todo, ajuda quem tem várias abas e completa a issue dentro do site.

**Independent Test**: abrir um mapa, trocar de mapa, abrir só uma campanha e sair. O título da aba muda em cada passo.

**Acceptance Scenarios**:

1. **Given** um mapa de campanha aberto, **When** o usuário olha a aba, **Then** ela mostra "{mapa} — {campanha} | Roll6".
2. **Given** o mestre troca o mapa atual e o jogador acompanha, **When** o mapa muda, **Then** o título da aba muda junto.
3. **Given** um modelo de mapa aberto fora de campanha, só a campanha selecionada ou a tela de login, **When** o usuário olha a aba, **Then** ela mostra respectivamente "{nome do modelo} | Roll6", "{campanha} | Roll6" ou "Roll6".

---

### User Story 3 - O site tem ícone com o símbolo da marca (Priority: P2)

A aba do navegador, os favoritos e o atalho na tela inicial do celular mostram o símbolo da logomarca Roll6 (hexágono com o dado), na versão escura, nítido em qualquer tamanho.

**Why this priority**: foi pedido junto com a issue e é a mesma identidade que aparece nas prévias. É barato, independente e visível em toda página.

**Independent Test**: abrir o site e conferir o ícone na aba e nos favoritos. No celular, adicionar à tela inicial e conferir o atalho.

**Acceptance Scenarios**:

1. **Given** qualquer página do site, **When** o usuário olha a aba, **Then** ela mostra o símbolo da marca, legível em 16 e 32 pixels.
2. **Given** um celular, **When** o usuário adiciona o site à tela inicial, **Then** o atalho usa o símbolo sobre o fundo escuro da marca, sem borda branca nem recorte.
3. **Given** um navegador que só procura o ícone no endereço padrão do site, **When** abre qualquer página, **Then** encontra o símbolo.

---

### Edge Cases

- **Mapa ou campanha com nomes muito longos:** o título e a descrição da prévia são cortados com reticências no limite de caracteres que as prévias costumam mostrar, nunca no meio de uma palavra.
- **Imagem do mapa muito grande ou em formato pouco comum:** a prévia usa uma versão que os aplicativos de mensagem aceitem (tamanho e peso razoáveis), sem quebrar.
- **Endereço de imagem com validade curta:** o link da imagem precisa continuar funcionando enquanto a prévia for montada e guardada pelos aplicativos (eles costumam guardar a prévia por dias).
- **Mapa apagado:** a prévia é a genérica, e o título da aba volta ao da campanha.
- **Usuário sem acesso à campanha** que recebe o link: ele vê a prévia completa, com a imagem do mapa, mas ao abrir o site continua recebendo as mesmas mensagens de hoje (precisa entrar, sem permissão, não encontrado).
- **Caracteres especiais nos nomes** (aspas, `<`, `&`): aparecem corretamente na prévia e na aba, sem quebrar a página.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Ao ser lido por um aplicativo de mensagens, uma rede social ou um buscador, o endereço `/map/{slug}` de um mapa de campanha MUST trazer metadados de prévia com o título "{nome do mapa} — {nome da campanha}", uma descrição (campanha, mestre e grade do mapa) e a imagem do mapa.
- **FR-002**: O endereço `/campaign/{slug}` MUST trazer metadados de prévia com o nome da campanha, o mestre e, quando houver, a imagem do mapa atual da campanha.
- **FR-003**: Sem mapa, sem imagem ou com endereço inexistente ou apagado, os metadados MUST cair para a prévia genérica do Roll6 (nome do site, descrição curta e imagem da marca), e a página MUST continuar abrindo normalmente.
- **FR-004**: Os metadados de prévia MUST estar disponíveis para leitores que não executam scripts e não estão logados, como os robôs de prévia dos aplicativos de mensagem.
- **FR-005**: A prévia MUST mostrar os dados reais (nome do mapa, campanha, mestre, grade e imagem do mapa) a qualquer pessoa com o link, em campanhas abertas ou fechadas. Peças, NPCs, fichas, turnos e qualquer outro dado da mesa MUST NOT aparecer na prévia.
- **FR-006**: O título da aba do navegador MUST mostrar "{mapa} — {campanha} | Roll6" com um mapa de campanha aberto, "{modelo} | Roll6" com um modelo fora de campanha, "{campanha} | Roll6" só com a campanha e "Roll6" nos outros casos, atualizando a cada troca.
- **FR-007**: A imagem usada na prévia MUST continuar acessível pelo endereço publicado na prévia por pelo menos 7 dias.
- **FR-008**: Títulos e descrições MUST ser limitados (título até 70 caracteres e descrição até 200, cortados com reticências) e protegidos contra caracteres especiais.
- **FR-009**: O site MUST ter favicon criado a partir do símbolo da logomarca na versão escura, nos tamanhos de aba (16 e 32), de favoritos e atalho de celular (180) e no endereço padrão do ícone do site, mais a cor de tema escura da marca.
- **FR-010**: Nenhuma regra de acesso às páginas, mapas ou campanhas MUST mudar: a prévia não dá acesso ao mapa e abrir o link continua exigindo login e permissão como hoje.
- **FR-011**: As páginas de mapa e campanha MUST NOT pedir aos buscadores para não indexá-las. A indexação é permitida, com o endereço canônico de cada página.

### Key Entities

- **Metadados de prévia**: título, descrição, imagem, endereço canônico e nome do site, gerados a partir do mapa (nome, grade, imagem) e da campanha (nome, mestre, mapa atual).
- **Favicon**: o símbolo da logomarca em vários tamanhos, mais a cor de tema.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos endereços de mapa válidos colados nos validadores de prévia mais usados (por exemplo, o do WhatsApp/Facebook e o do X) mostram título, descrição e imagem corretos.
- **SC-002**: 100% dos endereços inválidos ou apagados mostram a prévia genérica, sem erro.
- **SC-003**: O título da aba corresponde ao mapa e à campanha abertos em 100% das trocas de mapa e de campanha.
- **SC-004**: O símbolo da marca aparece na aba, nos favoritos e no atalho do celular nos navegadores principais (Chrome, Safari, Firefox, Edge).
- **SC-005**: Abrir o site continua tão rápido quanto antes: o carregamento inicial não fica mais de 10% mais lento.

## Assumptions

- **"Metadados" = metadados da página** (confirmado em Clarifications): são os dados que descrevem a página para quem a recebe ou para o navegador, ou seja, a prévia de link e o título da aba. Não há painel novo dentro da mesa, que já mostra o nome do mapa e da campanha no seletor da mesa.
- **Favicon:** o símbolo é recortado da logomarca escura de `docs/logomarca`, como na branch `038-brand-layout-refresh`, que ainda não foi mergeada. Esta feature parte da `main` e entrega o favicon por conta própria. Se a 038 entrar antes, os arquivos coincidem e o conflito é só de nomes.
- **Prévia de campanha:** está incluída porque `/campaign/{slug}` é o outro endereço compartilhável da mesa e usa os mesmos dados.
- **Idioma:** os textos da prévia são em português, como o site.
- **Buscadores** (confirmado em Clarifications): podem indexar as páginas de mapa e campanha. O que fica indexável é o mesmo da prévia (nome, campanha, mestre, grade e imagem).
- **Privacidade da prévia** (confirmado em Clarifications): a imagem e o nome de um mapa ficam visíveis para quem tiver o link, mesmo sem login. O slug é difícil de adivinhar e o link é compartilhado de propósito, então isso é aceito. O resto da mesa continua protegido.
