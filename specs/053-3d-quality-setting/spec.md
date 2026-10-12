# Feature Specification: Qualidade da vista 3D

**Feature Branch**: `053-3d-quality-setting`
**Created**: 2026-10-12
**Status**: Draft
**Input**: User description: "Implemente a issue https://github.com/landim32/roll6/issues/31 — 3D: configuração de qualidade (padrão = atual, o usuário pode melhorar)"

## Contexto

A vista 3D desenha o mundo num quadro pequeno e o amplia sem suavização, no estilo retrô de Wolfenstein 3D. As **figuras** (as peças em pé, com suas imagens "2,5D") são desenhadas dentro desse mesmo quadro, a partir de cópias reduzidas das imagens, e por isso ficam **serrilhadas**, principalmente quando a câmera chega perto delas.

Uma tentativa anterior de melhorar as figuras (camada própria do tamanho da tela, amostragem suave, cópias reduzidas por distância) ficou boa, mas pesada demais para ser o padrão em qualquer aparelho, e foi desfeita. Quem tem um computador ou um celular mais forte, porém, aceitaria pagar esse custo pela nitidez. Esta feature dá essa escolha ao usuário **sem mudar nada para quem não escolher**.

## Clarifications

### Session 2026-10-12

- Q: Quantos níveis de qualidade? → A: Três — Padrão (atual), Alta (quadro mais fino, imagens das figuras no tamanho salvo com amostragem suave) e Ultra (camada própria das figuras do tamanho da tela, bilinear com cópias reduzidas por distância).
- Q: Onde fica o controle de qualidade? → A: Item "Qualidade do 3D" no menu do usuário, disponível sempre (também fora do 3D); nenhum botão novo entre os botões do mapa.
- Q: Incluir a sugestão automática de reduzir a qualidade quando a fluidez cai? → A: Não. Só a escolha manual e o aviso de custo no seletor; a sugestão por desempenho fica para uma issue futura, depois das medições.
- Q: O padrão em celulares é o atual ou um nível mais baixo? → A: Igual ao atual em todos os aparelhos: o celular abre em Padrão, com os três níveis disponíveis; o seletor só acrescenta o aviso de bateria.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Escolher a qualidade do 3D (Priority: P1)

O usuário abre o item **"Qualidade do 3D"** no menu do usuário (o menu do seu nome no topo, disponível a qualquer momento, com ou sem o 3D aberto) e escolhe entre **Padrão**, **Alta** e **Ultra**. Se um mapa estiver aberto em 3D, a vista muda na hora, sem recarregar o mapa nem perder a posição da câmera; se não, a escolha vale na próxima abertura do 3D. Em **Alta** as figuras ficam visivelmente mais nítidas que em Padrão; em **Ultra**, mais nítidas ainda, de perto e de longe, sem cintilar quando a câmera anda. Paredes, chão e céu mantêm o visual retrô em todos os níveis (apenas o quadro do mundo fica mais fino nos níveis altos).

**Why this priority**: É o pedido da issue: dar a quem tem aparelho forte a nitidez que a tentativa anterior provou ser possível, sem impor o custo a ninguém.

**Independent Test**: Abrir um mapa em 3D com várias peças em pé, trocar o nível pelo item do menu do usuário e comparar as figuras de perto e de longe em cada nível; sair e voltar ao 2D entre as trocas não é necessário.

**Acceptance Scenarios**:

1. **Given** o usuário logado, com ou sem o 3D aberto, **When** abre "Qualidade do 3D" no menu do usuário, **Then** vê os três níveis, com o atual marcado, e uma frase curta dizendo que os níveis altos exigem mais do aparelho (e, em celulares, que gastam mais bateria).
2. **Given** o nível Padrão, **When** o usuário escolhe Alta, **Then** a vista é redesenhada imediatamente no novo nível, a câmera fica onde estava e as figuras aparecem mais nítidas que antes.
3. **Given** o nível Alta, **When** o usuário escolhe Ultra, **Then** as figuras ficam mais nítidas que em Alta, com bordas suaves, e as figuras distantes não cintilam enquanto a câmera anda.
4. **Given** qualquer nível, **When** o usuário volta a Padrão, **Then** a vista fica idêntica à de antes desta feature (mesmo tamanho de quadro, mesmas imagens, mesmo filtro).
5. **Given** o mapa em 2D (ou nenhum mapa aberto), **When** o usuário escolhe Ultra no menu, **Then** nada muda na tela naquele momento e o próximo 3D abre em Ultra; os botões do mapa não ganham nenhum controle novo.

---

### User Story 2 - Lembrar a escolha neste aparelho (Priority: P2)

A escolha vale para o usuário **neste aparelho**: recarregar a página ou abrir outro mapa em 3D mantém o nível escolhido. Ela nunca é compartilhada com a mesa (cada participante tem a sua), não é enviada ao servidor e é esquecida ao sair da conta, como as outras preferências de tela.

**Why this priority**: Sem memória, o usuário teria de reescolher a cada abertura; mas a feature já entrega valor com a escolha imediata da história 1.

**Independent Test**: Escolher Ultra, recarregar a página e abrir um mapa em 3D (deve continuar Ultra); abrir outro mapa em 3D (Ultra); sair da conta e entrar de novo (volta ao Padrão).

**Acceptance Scenarios**:

1. **Given** o usuário escolheu Alta, **When** recarrega a página e abre um mapa em 3D, **Then** a vista abre em Alta.
2. **Given** o usuário escolheu Alta num mapa, **When** abre outro mapa em 3D, **Then** a vista abre em Alta (a escolha é por aparelho, não por mapa).
3. **Given** o usuário escolheu Ultra, **When** sai da conta e entra de novo, **Then** a vista abre em Padrão.
4. **Given** dois participantes da mesma mesa, **When** um escolhe Ultra, **Then** o outro continua no nível que escolheu (nada muda para ele).
5. **Given** o armazenamento do navegador indisponível ou corrompido, **When** o usuário abre o 3D, **Then** a vista abre em Padrão e a escolha ainda funciona durante a sessão.

---

### Fora do escopo

- **Sugestão automática por desempenho** (aviso quando a fluidez cai): fica para uma issue futura, depois das medições desta entrega. Nesta feature o nível só muda pela mão do usuário.
- Textura, iluminação ou sombras novas no mundo; suavização de paredes e chão (o visual retrô fica em todos os níveis).
- Qualquer detecção que **aumente** a qualidade sozinha.

### Edge Cases

- **Celulares**: o padrão é o mesmo de hoje (Padrão) e os três níveis ficam disponíveis; o texto do controle avisa que os níveis altos gastam mais bateria. Nenhum nível é escolhido ou escondido por tipo de aparelho.
- **Troca de nível com o 3D aberto**: as imagens das figuras no tamanho do novo nível podem levar um instante para chegar; enquanto isso a vista continua desenhando com o que já tem (nunca fica em branco nem some uma figura).
- **Memória no Padrão**: as imagens maiores das figuras só são lidas nos níveis que as usam; quem fica no Padrão não gasta mais memória do que hoje.
- **Valor desconhecido lembrado** (de uma versão futura ou de edição manual): é tratado como Padrão.
- **Tela muito estreita**: o quadro do mundo nunca é mais largo que a tela; nos níveis altos ele apenas deixa de ser reduzido tão cedo.
- **Figuras deitadas ou fora de combate** continuam fora do 3D em qualquer nível (regra existente, não muda).
- **Balões de fala e sombras** não dependem do nível: continuam iguais nos três.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A vista 3D MUST oferecer três níveis de qualidade — **Padrão**, **Alta** e **Ultra** — escolhidos pelo usuário no item **"Qualidade do 3D"** do menu do usuário, disponível a qualquer momento (com ou sem o 3D aberto); nenhum controle novo entra entre os botões do mapa.
- **FR-002**: O nível **Padrão** MUST produzir exatamente a vista de hoje: mesmo tamanho do quadro do mundo, mesmas cópias reduzidas das imagens das figuras e mesmo filtro, verificado por um teste de regressão do quadro.
- **FR-003**: Cada nível MUST ser uma combinação definida num só lugar de **finura do quadro do mundo**, **resolução das imagens das figuras** e **filtro das figuras**, com Alta mais nítida que Padrão e Ultra mais nítida que Alta.
- **FR-004**: Em **Ultra** as figuras MUST ser desenhadas com bordas suaves e com cópias reduzidas das imagens para as figuras distantes, de modo que não cintilem enquanto a câmera anda.
- **FR-005**: Paredes, chão e céu MUST manter o visual retrô (sem suavização) em todos os níveis.
- **FR-006**: A troca de nível MUST valer imediatamente, sem recarregar o mapa e sem mover a câmera.
- **FR-007**: A escolha MUST ser lembrada por usuário e por aparelho, valer para todos os mapas, nunca ser enviada ao servidor nem compartilhada com a mesa, e MUST ser esquecida ao sair da conta.
- **FR-008**: Sem escolha lembrada, com armazenamento indisponível ou com um valor desconhecido, a vista MUST abrir em Padrão, em qualquer aparelho, celular incluído.
- **FR-009**: O controle MUST dizer, em texto curto, que os níveis altos exigem mais do aparelho e, em celulares, que gastam mais bateria.
- **FR-010**: O nível MUST mudar apenas por ação do usuário no seletor: nenhuma escolha automática para cima nem para baixo, nenhuma sugestão por desempenho nesta entrega.
- **FR-011**: As imagens das figuras em resolução maior MUST ser lidas apenas nos níveis que as usam; o Padrão MUST não gastar mais memória do que hoje.
- **FR-012**: Durante a troca de nível, enquanto as imagens do novo nível ainda não chegaram, a vista MUST continuar desenhando com as imagens que já tem.
- **FR-013**: Balões de fala, sombras e as regras de quem aparece no 3D MUST não depender do nível.
- **FR-014**: Backend, API, MCP e banco MUST não mudar.
- **FR-015**: O desempenho de cada nível MUST ser medido e registrado na issue ou no PR: tempo médio de quadro com 50 peças, num computador comum e num celular médio.

### Key Entities

- **Nível de qualidade**: um dos valores Padrão, Alta ou Ultra; define a finura do quadro do mundo, a resolução das imagens das figuras e o filtro com que são desenhadas. Padrão é a vista atual.
- **Preferência de qualidade**: o nível escolhido pelo usuário neste aparelho; vale para todos os mapas, não é compartilhada e some ao sair da conta. Ausente ou inválida = Padrão.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sem escolher nada, o quadro do 3D é byte a byte idêntico ao de hoje no teste de regressão (0 diferenças).
- **SC-002**: Em um aparelho rápido, o usuário troca o nível e vê a vista redesenhada em menos de 1 segundo, sem a câmera se mover.
- **SC-003**: Em cada nível, uma figura a 2 hexes da câmera ocupa pelo menos o dobro de pontos de imagem do nível anterior (Alta ≥ 2× Padrão, Ultra ≥ 2× Alta), e em Ultra uma figura a 10 hexes não apresenta cintilação visível em 5 segundos de caminhada.
- **SC-004**: Após recarregar a página, 100% das aberturas do 3D no mesmo aparelho usam o nível escolhido; após sair da conta, 100% usam Padrão.
- **SC-005**: Em Padrão, o uso de memória das imagens das figuras e o tempo médio de quadro são iguais aos de hoje (variação dentro da margem de medição).
- **SC-006**: O relatório de desempenho do PR traz o tempo médio de quadro dos três níveis com 50 peças em pelo menos dois aparelhos (um computador comum e um celular médio).
- **SC-007**: Em nenhuma situação o nível muda sem uma ação do usuário (0 trocas automáticas nos testes).

## Assumptions

- **Três níveis** (Padrão, Alta, Ultra), como a tabela da issue sugere. Os números exatos de cada nível (largura do quadro, tamanho das imagens) são definidos no plano e ajustados pelas medições de desempenho; a especificação fixa só a ordem de nitidez e a identidade do Padrão com a vista atual.
- **Onde fica o controle**: item "Qualidade do 3D" no menu do usuário, ao lado das outras preferências do aparelho (Notificações, Instalar o Roll6), abrindo um seletor com os três níveis e o aviso. Escolhido para não acrescentar mais um botão aos controles do mapa, que já são muitos no celular; a troca com o 3D aberto continua valendo na hora.
- **Padrão em celular** igual ao atual em todos os aparelhos, conforme o critério 6 da issue; o aviso de bateria aparece apenas em telas de celular.
- A preferência é guardada no navegador, no mesmo padrão das outras preferências de tela (modo 2D/3D, layout), e apagada no logout.
- Nada muda no servidor: nenhuma rota, tela de configurações do servidor ou dado de campanha.
- O 2D não muda em nenhum nível.
