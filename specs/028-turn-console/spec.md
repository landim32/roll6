# Feature Specification: Console de turnos na barra inferior

**Feature Branch**: `028-turn-console`
**Created**: 2026-09-28
**Status**: Draft
**Input**: User description: "Crie uma espécie de console na barra inferior: botão no meio da barra inferior com seta para cima ou para baixo; ao clicar abre um espaço tipo log, com fonte pequena e meio transparente; opção de ampliar que abre uma modal ocupando toda a tela, como o modal de campanha; exibe as informações mais recentes dos turnos; lista infinita, ao rolar para baixo carrega os mais antigos; atualizado por socket, quando o turno finalizar ele deve ser atualizado."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Abrir o console de turnos sobre o mapa (Priority: P1)

Durante o jogo, o mestre e os jogadores querem acompanhar o que aconteceu nos turnos sem sair do mapa. No meio da
barra inferior há um botão com uma seta: para cima quando o console está fechado, para baixo quando está aberto. Ao
clicar, abre-se sobre a parte de baixo do mapa uma faixa tipo "log", com letra pequena e fundo semitransparente (o
mapa continua visível por trás), mostrando o histórico dos turnos, o mais recente no topo.

**Why this priority**: É a funcionalidade em si; sem o console não há o que ampliar nem atualizar.

**Independent Test**: Com uma campanha que já teve turnos, clicar na seta abre o console com o histórico; clicar de
novo fecha; o estado (aberto/fechado) é lembrado ao recarregar a página.

**Acceptance Scenarios**:

1. **Given** o mapa aberto numa campanha, **When** o usuário clica na seta do meio da barra inferior, **Then** o console abre acima da barra e a seta passa a apontar para baixo.
2. **Given** o console aberto, **When** o usuário clica na seta, **Then** o console fecha e a seta volta a apontar para cima.
3. **Given** o console aberto, **When** o usuário olha o mapa, **Then** o mapa continua visível por trás do console (fundo semitransparente, letra pequena) e continua utilizável fora da área do console.
4. **Given** o console aberto, **When** a página é recarregada, **Then** ele volta aberto (a preferência é lembrada por usuário/navegador).
5. **Given** um usuário que não participa da campanha (nem mestre, nem aprovado), **When** abre o mapa, **Then** o botão do console não aparece.

---

### User Story 2 - Histórico infinito, do mais recente ao mais antigo (Priority: P1)

O console mostra as informações mais recentes primeiro e, ao rolar para baixo, vai carregando as mais antigas, sem
limite, até o primeiro turno da campanha.

**Why this priority**: Sem isso o console mostraria só um pedaço fixo do histórico.

**Independent Test**: Numa campanha com muitos turnos, rolar até o fim do console carrega mais itens mais antigos, até
chegar ao início, quando aparece "Início da campanha".

**Acceptance Scenarios**:

1. **Given** o console aberto, **When** ele carrega, **Then** mostra um **bloco por turno finalizado**, do mais recente ao mais antigo: título "Turno N" e as ações do turno no texto do resumo (movimentos, ações, resultados, alterações e a narração, quando houver). O turno em andamento não aparece até ser finalizado.
2. **Given** o fim da lista visível, **When** o usuário rola até embaixo, **Then** mais itens antigos são carregados e adicionados ao final, com um indicador de carregamento.
3. **Given** que não há mais turnos antigos (chegou ao turno 1), **When** rola até o fim, **Then** aparece "Início da campanha" e nada mais é pedido.
4. **Given** uma falha ao carregar mais itens, **When** acontece, **Then** aparece uma mensagem com opção de tentar de novo, sem perder o que já estava na lista.

---

### User Story 3 - Atualização em tempo real (Priority: P1)

Quando o turno é finalizado (pelo mestre ou por um assistente), o console de todos os participantes conectados é
atualizado na hora, sem recarregar.

**Why this priority**: Pedido explícito; sem isso o console mostraria informação velha durante o jogo.

**Independent Test**: Com o mestre e um jogador com o console aberto, o mestre finaliza o turno: o console dos dois
mostra o turno finalizado no topo em poucos segundos.

**Acceptance Scenarios**:

1. **Given** o console aberto em duas telas, **When** o turno é finalizado, **Then** ambas passam a mostrar o bloco desse turno no topo sem recarregar.
5. **Given** registros novos no turno em andamento (movimentos, ações), **When** acontecem, **Then** o console não muda — ele só se atualiza quando o turno é finalizado.
2. **Given** o usuário rolado para baixo lendo turnos antigos, **When** chega uma atualização, **Then** a posição de leitura não pula; um aviso "Novidades" no topo permite voltar ao mais recente.
3. **Given** a conexão em tempo real indisponível, **When** o turno é finalizado, **Then** o console se atualiza na próxima verificação periódica (como o resto da mesa já faz).
4. **Given** o console fechado, **When** o turno é finalizado, **Then** ao abrir ele já mostra o turno novo.

---

### User Story 4 - Ampliar o console em tela cheia (Priority: P2)

No canto do console há um botão "Ampliar" que abre o mesmo histórico numa janela ocupando toda a tela, no mesmo estilo
da janela de configurações da campanha, com letra normal para leitura confortável e a mesma rolagem infinita.

**Why this priority**: Conforto de leitura; o console compacto já entrega o essencial.

**Independent Test**: Clicar em "Ampliar" abre a janela em tela cheia com o mesmo conteúdo; fechar volta ao mapa com o
console como estava.

**Acceptance Scenarios**:

1. **Given** o console aberto, **When** o usuário clica em "Ampliar", **Then** abre uma janela em tela cheia com o histórico (mais recente no topo), rolagem infinita e atualização em tempo real.
2. **Given** a janela ampliada, **When** o usuário a fecha, **Then** volta ao mapa com o console no estado anterior.

---

### Edge Cases

- Campanha ainda no turno 1 (nenhum turno finalizado): o console mostra "Nenhum turno finalizado ainda".
- Turno finalizado sem nenhum registro: aparece o bloco com "Nenhuma ação registrada.".
- Troca de campanha com o console aberto: o conteúdo é trocado pelo da nova campanha.
- Registros muito longos (narrações): quebram linha dentro do console; na versão compacta podem ser truncados com "…" e lidos por completo na ampliada.
- Usuário perde o acesso à campanha (personagem removido): o console fecha e o botão some.
- Tela pequena (celular): o console ocupa no máximo uma fração da altura, deixando o mapa utilizável.
- Nomes e textos são mostrados como texto (sem virar formatação).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A barra inferior do mapa DEVE ter, no centro, um botão com seta para cima (console fechado) ou para baixo (console aberto) que abre e fecha o console.
- **FR-002**: O console DEVE abrir acima da barra inferior, sobre o mapa, com letra pequena e fundo semitransparente, sem bloquear o uso do mapa fora da sua área.
- **FR-003**: O estado aberto/fechado DEVE ser lembrado no navegador do usuário.
- **FR-004**: O console DEVE mostrar um bloco por turno **finalizado** da campanha atual (título "Turno N" + as ações do turno no texto do resumo), do mais recente ao mais antigo; o turno em andamento não aparece.
- **FR-005**: O console DEVE carregar itens mais antigos à medida que o usuário rola para baixo (lista infinita), até o início da campanha, indicando carregamento, fim e falhas com opção de tentar de novo.
- **FR-006**: O console DEVE ser atualizado em tempo real quando um turno for finalizado, para todos os participantes conectados, sem mudar a posição de leitura de quem está lendo itens antigos.
- **FR-007**: Sem conexão em tempo real, o console DEVE se atualizar pela verificação periódica já existente da mesa.
- **FR-008**: O console DEVE ter um botão "Ampliar" que abre o mesmo conteúdo numa janela em tela cheia, no estilo da janela de configurações da campanha, com a mesma lista infinita e atualização.
- **FR-009**: Somente o mestre e os participantes aprovados da campanha DEVEM ver o console (mesma regra de leitura dos turnos).
- **FR-010**: O conteúdo de cada item DEVE usar o mesmo texto legível do resumo do turno (mesmos rótulos, direções e autores).

### Key Entities

- **Bloco de turno**: um turno finalizado (número e texto das ações do resumo), na ordem do mais recente ao mais antigo.
- **Página de histórico**: um lote de turnos mais antigos carregado ao rolar.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Abrir o console leva 1 clique e mostra as informações mais recentes em menos de 1 segundo.
- **SC-002**: Rolar até o fim carrega o próximo lote de itens antigos em menos de 1 segundo, até o início da campanha.
- **SC-003**: Participantes conectados veem o bloco de um turno finalizado no console em até 5 segundos.
- **SC-004**: Com o console aberto, 100% do mapa fora da área do console continua utilizável.

## Clarifications

### Session 2026-09-28

- Q: O que é cada item do console? → A: Um bloco por turno finalizado (resumo das ações e narração), atualizado só quando o turno finaliza.

## Assumptions

- O console fica disponível na tela do mapa (onde está a barra inferior) e segue a campanha atual.
- O mais recente fica no topo, pois o usuário pediu "ao rolar para baixo, carregar os mais antigos".
- O lote carregado a cada rolagem é pequeno o bastante para ser rápido (por exemplo, alguns turnos por vez).
- A janela ampliada reaproveita o estilo das janelas grandes já existentes (configurações da campanha).
