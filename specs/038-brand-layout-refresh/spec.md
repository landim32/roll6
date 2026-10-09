# Feature Specification: Novo visual e logomarca do Roll6

**Feature Branch**: `038-brand-layout-refresh`  
**Created**: 2026-10-08  
**Status**: Draft  
**Input**: User description: "Crie uma spec para a issue https://github.com/landim32/roll6/issues/36" — *Atualizar o layout do site e implementar a nova logomarca: modernizar o layout mantendo a interface leve e simples, alinhar as cores à identidade visual da marca Roll6 e adotar a nova logomarca (`docs/logomarca`), usando somente a versão escura.*

## Contexto

Hoje o nome "Roll6" aparece só como texto dourado, no cartão de login e no início do menu superior. A cor de destaque do site é esse mesmo dourado, sobre fundos cinza-azulados escuros, e a aba do navegador não tem ícone. A nova logomarca, nas versões horizontal e vertical em fundo escuro, é formada por um dado branco dentro de um hexágono, com hexágonos verdes e azul-ardósia em volta, e pelo texto "roll" em branco com o "6" em verde (degradê de verde-claro para verde-água). Ela não combina com o dourado de hoje, e o site precisa passar a falar a mesma língua visual da marca sem ficar mais pesado.

## Clarifications

### Session 2026-10-08

- Q: Até onde vai a mudança de "layout"? → A: Visual em todo o site **e** a tela de login redesenhada (fundo com a identidade, cartão novo, logomarca vertical em destaque); as demais telas só mudam o acabamento, sem mudar de estrutura.
- Q: Como separar o verde da marca do verde de "válido" (caminho do movimento, sucesso)? → A: Não separar: o verde da marca passa a ser também o verde de "válido/ok" (um único verde no site).
- Q: Que marca aparece no menu do celular? → A: Só o símbolo (hexágono com o dado) em telas com menos de 768 px; a logomarca horizontal no desktop.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A marca aparece onde o usuário chega (Priority: P1)

Quem abre o Roll6 vê a nova logomarca. Na tela de login, a versão vertical aparece no lugar do título em texto. Depois de entrar, a versão horizontal aparece no início do menu superior. A aba do navegador mostra o símbolo da marca (o hexágono com o dado) e o título "Roll6".

**Why this priority**: é o pedido central da issue e o que o usuário percebe primeiro. Sem a logomarca, a troca de cores não tem referência.

**Independent Test**: abrir a tela de login, entrar no site e olhar a aba do navegador. O login redesenhado mostra a logomarca vertical, o menu mostra a horizontal e a aba mostra o símbolo, sempre a versão escura e sem distorção. Entrar continua funcionando exatamente como antes.

**Acceptance Scenarios**:

1. **Given** um visitante sem sessão, **When** abre o site, **Then** vê a tela de login redesenhada: fundo com a identidade da marca (tons escuros da marca com um padrão discreto de hexágonos), a logomarca vertical em destaque e, abaixo dela, um cartão novo com os mesmos campos e ações de hoje. A logomarca tem o texto alternativo "Roll6".
2. **Given** a tela de login num celular, **When** ela abre, **Then** logomarca e cartão cabem na tela sem rolagem horizontal, e o teclado aberto não esconde o botão de entrar.
3. **Given** um usuário logado, **When** está na mesa, **Then** o menu superior começa com a logomarca horizontal, na altura do menu e sem empurrar os outros controles.
4. **Given** um celular (menos de 768 px de largura), **When** o usuário está logado, **Then** o menu mostra só o símbolo da marca (o hexágono com o dado), que cabe na primeira linha do menu sem cortar os outros controles.
5. **Given** qualquer página, **When** o usuário olha a aba ou a lista de favoritos do navegador, **Then** aparece o símbolo da marca.
6. **Given** qualquer tela, **When** a logomarca aparece, **Then** é sempre a versão escura. A versão clara não é usada em nenhum lugar do site.

---

### User Story 2 - As cores do site seguem a marca (Priority: P2)

O site troca o destaque dourado pelas cores da marca: o verde do "6" e dos hexágonos como cor de destaque (botões principais, links, itens ativos, foco), o azul-escuro do contorno da logo como base dos fundos e o azul-ardósia dos hexágonos escuros para superfícies e bordas. O texto continua claro sobre fundo escuro.

**Why this priority**: é o segundo pedido da issue e o que faz o site parecer da mesma marca. Depende de a logomarca estar lá (US1) para ser percebido.

**Independent Test**: percorrer login, menu, janelas (campanhas, mapas, personagem, tokens, configurações), painéis laterais, menu da peça e rodapé do mapa. Nenhum dourado antigo sobra, os botões principais e itens ativos estão no verde da marca e todos os textos continuam legíveis.

**Acceptance Scenarios**:

1. **Given** qualquer janela com um botão principal (Salvar, Entrar, Criar), **When** ela abre, **Then** o botão está na cor de destaque da marca, com texto legível sobre ele.
2. **Given** abas, itens selecionados de menus e listas, links e campos com foco, **When** aparecem, **Then** usam a cor de destaque da marca de forma consistente em todas as telas.
3. **Given** o fundo da página, o menu, as janelas e os painéis, **When** aparecem, **Then** usam os tons escuros da marca, com contraste suficiente entre fundo, superfície e borda para separar as áreas.
4. **Given** o mapa, **When** o usuário move uma peça, **Then** o caminho válido aparece no verde da marca e o excedido continua vermelho, e as outras cores com significado próprio continuam distinguíveis entre si: discos de personagem, NPC e objeto, barras de vida e energia, avisos de erro e de aviso.
5. **Given** um aviso de sucesso, **When** aparece, **Then** usa o mesmo verde da marca.
6. **Given** o site inteiro, **When** é inspecionado, **Then** não sobra nenhum uso do dourado antigo como cor de destaque.

---

### User Story 3 - Layout mais limpo sem ficar pesado (Priority: P3)

O menu superior, o cartão de login, as janelas e os painéis ganham um acabamento mais moderno e uniforme: espaçamentos e cantos consistentes, títulos com hierarquia clara e bordas e sombras discretas. Nada novo compete com o mapa. O usuário encontra tudo onde já estava.

**Why this priority**: melhora a percepção de qualidade, mas o site já é usável. Vem depois da marca e das cores.

**Independent Test**: comparar antes e depois em desktop e celular. Os mesmos controles estão nos mesmos lugares, o mapa ocupa pelo menos a mesma área de antes, e as janelas e os painéis têm espaçamento, cantos e títulos iguais entre si.

**Acceptance Scenarios**:

1. **Given** a mesa em desktop, **When** o usuário compara com a versão anterior, **Then** o menu superior não ficou mais alto e a área do mapa não diminuiu.
2. **Given** duas janelas diferentes (por exemplo, "Mapas" e "Personagem na Campanha"), **When** são abertas, **Then** título, abas, espaçamentos, botões do rodapé e cantos seguem o mesmo padrão.
3. **Given** um celular, **When** o usuário usa a mesa, **Then** o menu em duas linhas, os painéis laterais e os controles do mapa continuam funcionando como antes, sem rolagem horizontal.
4. **Given** qualquer tela, **When** o usuário procura uma ação que já existia, **Then** ela está no mesmo lugar e com o mesmo nome.

---

### Edge Cases

- **Logomarca não carrega** (rede lenta ou arquivo indisponível): aparece o texto "Roll6" no lugar, e o layout não quebra nem fica sem nome.
- **Telas muito estreitas ou muito largas**: a logomarca nunca é esticada nem achatada, mantém a proporção e reduz até um tamanho mínimo legível.
- **Telas de alta densidade (retina)**: a logomarca aparece nítida, sem serrilhado.
- **Peso da página**: as imagens da marca no site são versões otimizadas, não os PNGs originais de 2000 px da pasta `docs/`, para que o carregamento não fique mais lento.
- **Verde da marca e verde de "válido"** (decidido em Clarifications): há um único verde no site. Destaque da marca, caminho válido do movimento e avisos de sucesso usam o mesmo tom, e o verde precisa continuar visível sobre mapas claros e escuros e bem diferente do vermelho de "excedido".
- **Elementos desenhados sobre o mapa** (grade, destaque do hex, balões, trilhas): a grade e o hex em destaque continuam visíveis sobre imagens de mapa claras e escuras.
- **Captura para compartilhar o mapa**: a imagem gerada usa o fundo escuro novo, sem diferença de cor para a tela.
- **Modo claro do sistema operacional**: o site continua só escuro; a preferência do sistema não troca a logomarca nem as cores.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A tela de login MUST ser redesenhada: fundo com a identidade da marca (tons escuros da marca com um padrão discreto de hexágonos, sem imagem pesada), a logomarca vertical, versão escura, em destaque no lugar do título em texto (texto alternativo "Roll6"), e um cartão novo com os mesmos campos, ações, mensagens e comportamento de hoje.
- **FR-002**: O menu superior MUST começar com a logomarca horizontal, versão escura, cabendo na altura atual do menu. Em telas com menos de 768 px MUST mostrar só o símbolo da marca, cabendo na primeira linha.
- **FR-003**: O site MUST ter o símbolo da marca (hexágono com o dado) como ícone da aba e dos favoritos, e o título "Roll6".
- **FR-004**: O site MUST usar somente a versão escura da identidade visual. As versões claras da logomarca MUST NOT aparecer em nenhuma tela.
- **FR-005**: A cor de destaque do site (botões principais, links, abas e itens ativos, foco, marcas do mapa que hoje usam o dourado) MUST passar a ser o verde da logomarca. Nenhum uso do dourado antigo como destaque MUST permanecer.
- **FR-006**: Os fundos, superfícies e bordas MUST usar tons escuros derivados da logomarca (o azul-escuro do contorno e o azul-ardósia dos hexágonos escuros), definidos uma única vez e reutilizados em todas as telas.
- **FR-007**: Todo texto e todo controle MUST manter contraste de pelo menos 4.5:1 para texto normal e 3:1 para texto grande e ícones, inclusive o texto sobre botões na cor de destaque.
- **FR-008**: O verde da marca MUST ser o único verde do site: destaque, caminho válido do movimento e avisos de sucesso usam o mesmo tom. As demais cores com significado próprio (movimento excedido, tipos de peça, vida e energia, aviso e erro, posturas) MUST continuar distinguíveis entre si e desse verde.
- **FR-009**: Janelas, painéis laterais, menu superior, menus suspensos e rodapé do mapa MUST seguir um padrão único de espaçamento, cantos, bordas, sombras e hierarquia de títulos.
- **FR-010**: Fora da tela de login, a atualização MUST NOT mudar a estrutura das telas nem a posição, o nome ou o comportamento de nenhuma ação existente, nem aumentar a altura do menu superior ou do rodapé do mapa.
- **FR-011**: A logomarca MUST manter a proporção em todos os tamanhos, aparecer nítida em telas de alta densidade e ser servida em versão otimizada para a web.
- **FR-012**: Se a imagem da logomarca não carregar, o site MUST mostrar o texto "Roll6" no lugar dela.
- **FR-013**: A imagem compartilhada do mapa MUST usar o fundo escuro novo.

### Key Entities

- **Identidade visual**: a logomarca (vertical, horizontal e o símbolo isolado, só versões escuras) e a paleta derivada dela: destaque verde, base azul-escura, superfície e borda azul-ardósia e texto claro. É definida uma vez e usada por todas as telas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% das telas (login, mesa, todas as janelas e painéis) a logomarca e as cores da marca aparecem, e nenhuma usa o dourado antigo nem a logomarca clara.
- **SC-002**: 100% dos pares texto/fundo e controle/fundo atingem o contraste do FR-007.
- **SC-003**: A área visível do mapa em desktop (1366×768 e 1920×1080) e em celular (390×844) é igual ou maior que antes.
- **SC-004**: O primeiro carregamento da tela de login não fica mais de 10% mais lento que antes, e as imagens da marca somam no máximo 100 KB.
- **SC-005**: Um usuário que já usava o site encontra qualquer ação existente no mesmo lugar, sem precisar procurar, em 100% das ações verificadas no teste manual.
- **SC-006**: Em uma revisão lado a lado, título, abas, rodapé e cantos são iguais em pelo menos 95% das janelas.

## Assumptions

- **Escopo do "layout"** (confirmado em Clarifications): a tela de login é redesenhada. Nas demais, a atualização é só visual (cores, logomarca, espaçamentos, cantos, tipografia, bordas e sombras): telas, fluxos e a posição das ações não mudam, e nenhuma tela nova é criada.
- **Tema:** o site continua só escuro, como hoje. A issue pede a versão escura da identidade, e não haverá alternância de tema.
- **Símbolo isolado:** o ícone da aba e a marca compacta do celular são recortes do símbolo (hexágono com o dado) das próprias logomarcas escuras. Não é desenhado nenhum ícone novo.
- **Paleta:** as cores são tiradas das próprias logomarcas: verde do "6" e dos hexágonos para destaque, azul-escuro do contorno para o fundo e azul-ardósia dos hexágonos escuros para superfícies e bordas. Os valores exatos ficam para o plano, respeitando o contraste do FR-007.
- **Fonte:** não é obrigatório adotar uma fonte nova. Se o plano escolher uma, ela precisa ser leve e não pode prejudicar o carregamento (SC-004).
- **Desenhos do mapa:** a grade, o destaque do hex, os balões e as trilhas só mudam de cor onde hoje usam o dourado. O desenho e a lógica não mudam, e a vista 3D só herda as cores da interface em volta.
- **Arquivos de origem:** os PNGs de `docs/logomarca` são a fonte. O site usa cópias otimizadas.
