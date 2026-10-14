# Feature Specification: Tamanho do modelo 3D do token

**Feature Branch**: `063-token-model-scale`
**Created**: 2026-10-14
**Status**: Draft
**Input**: User description: "Implemente uma escala (Tamanho) para o modelo 3D, coloque esse campo na aba 3D do token"

## Clarifications

### Session 2026-10-14

- Q: Formato do campo Tamanho? → A: porcentagem sobre a altura automática, 25%–400% em passos de 5%, padrão 100% (= hoje).
- Q: A foto da pose ("Gerar imagem") respeita o Tamanho? → A: não; continua enquadrando o modelo na imagem inteira.

## Contexto

Hoje o modelo 3D de um token fica sempre com a mesma altura na vista 3D do mapa: a da silhueta da figura 2,5D que ele
substitui, que depende só de quantos hexágonos a peça ocupa. Um ogro e um goblin de 1 hexágono ficam do mesmo
tamanho, e um modelo exportado com poses ou acessórios altos (uma arma erguida, um chapéu) fica com o corpo menor do
que deveria. O dono do token precisa de um campo **Tamanho** na aba "3D" para deixar o modelo maior ou menor.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ajustar o tamanho do modelo no token (Priority: P1)

O dono de um token com modelo 3D abre o token, vai à aba "3D", muda o campo **Tamanho** e vê na prévia o modelo
crescer ou diminuir em relação à base da peça. Ao salvar, o valor fica guardado no token.

**Why this priority**: é o pedido em si — sem o campo e a gravação, nada mais existe.

**Independent Test**: editar um token com modelo, mudar o Tamanho, salvar, reabrir o token e ver o mesmo valor e a
prévia no mesmo tamanho.

**Acceptance Scenarios**:

1. **Given** um token com modelo 3D e Tamanho no valor padrão, **When** o dono muda o Tamanho para um valor maior,
   **Then** a prévia da aba "3D" mostra o modelo maior em relação à base da peça, na hora, sem salvar.
2. **Given** o Tamanho alterado, **When** o dono salva o token e o abre de novo, **Then** o campo mostra o valor salvo
   e a prévia mostra o modelo nesse tamanho.
3. **Given** um token sem modelo 3D, **When** o dono abre a aba "3D", **Then** o campo Tamanho não aparece (ou fica
   desativado) e nada é salvo para ele.
4. **Given** um token criado antes desta funcionalidade, **When** é lido, **Then** o Tamanho dele é o padrão e o modelo
   aparece exatamente como antes.
5. **Given** o dono digita um valor fora do intervalo permitido, **When** tenta salvar, **Then** recebe uma mensagem
   clara dizendo o intervalo, e nada é salvo.

---

### User Story 2 - O mapa 3D respeita o tamanho (Priority: P1)

Na vista 3D do mapa, cada peça cujo token tem modelo aparece com a altura automática multiplicada pelo Tamanho do
token: em pé, andando e caída.

**Why this priority**: o tamanho só tem valor se a mesa o vê; sem isso o campo não muda nada para os jogadores.

**Independent Test**: com duas peças do mesmo modelo em tokens de Tamanhos diferentes no mesmo mapa, abrir a vista 3D e
ver uma maior que a outra, com os pés no chão e no centro do hexágono.

**Acceptance Scenarios**:

1. **Given** um token com Tamanho maior que o padrão posto no mapa, **When** alguém abre a vista 3D, **Then** o modelo
   aparece proporcionalmente maior, com os pés no chão e no centro da peça, virado para onde a peça olha.
2. **Given** a peça caída ou fora de combate, **When** o modelo está deitado, **Then** ele mantém o mesmo Tamanho.
3. **Given** o dono muda o Tamanho de um token já posto num mapa aberto por outros, **When** a mesa recebe a atualização
   da peça, **Then** o modelo passa a ter o novo tamanho sem recarregar a página.
4. **Given** um balão de fala sobre a peça, **When** o modelo está maior ou menor, **Then** o balão continua sobre a
   cabeça do modelo.

---

### User Story 3 - Assistentes de IA também ajustam (Priority: P3)

Um assistente ligado pelo MCP consegue ler e definir o Tamanho ao criar ou alterar um token, como já faz com o arquivo
do modelo e as animações.

**Why this priority**: mantém o MCP cobrindo tudo que a API faz (regra do projeto), mas não é o uso principal.

**Independent Test**: criar um token com modelo e Tamanho pelo MCP e ver o valor no token pelo site.

**Acceptance Scenarios**:

1. **Given** uma chave de API, **When** o assistente cria ou altera um token com um Tamanho válido, **Then** o token
   fica com esse Tamanho.
2. **Given** um Tamanho fora do intervalo, **When** o assistente envia, **Then** recebe o erro com o campo e o intervalo.

### Edge Cases

- Token sem modelo 3D: o Tamanho não se aplica; ao remover o modelo, o Tamanho volta ao padrão.
- Trocar o arquivo do modelo por outro: o Tamanho escolhido é mantido.
- Tamanho omitido numa alteração feita pela API: o token fica com o padrão (a alteração de token substitui todos os
  campos, como já acontece com o modelo e as animações).
- Um modelo muito grande não muda o espaço que a peça ocupa no mapa 2D nem as regras de movimento e ocupação: o
  Tamanho é só visual, na vista 3D.
- Um modelo maior que as paredes próximas continua escondido por elas como hoje (as paredes mais próximas cobrem o
  modelo).
- A câmera em terceira pessoa atrás do personagem não muda de altura com o Tamanho (ela segue a altura dos olhos já
  definida para a vista 3D).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Todo token MUST ter um **Tamanho** do modelo 3D. Ele é um multiplicador da altura automática atual do
  modelo, informado em **porcentagem** (Q1 = A): de **25% a 400%**, em passos de **5%**; o padrão, 100%, mantém o
  modelo exatamente como hoje.
- **FR-002**: A aba "3D" do formulário de token MUST mostrar o campo Tamanho junto do modelo, só quando o token tem um
  modelo 3D, com o valor atual e o intervalo permitido.
- **FR-003**: A prévia da aba "3D" MUST mostrar o efeito do Tamanho na hora em que o campo muda, com uma referência
  fixa (a base da peça) para que "maior" e "menor" sejam visíveis.
- **FR-004**: O Tamanho MUST ser salvo com o token e devolvido em todas as leituras do token e das peças do mapa que o
  usam.
- **FR-005**: O sistema MUST recusar, com mensagem clara indicando o campo e o intervalo, um Tamanho fora do intervalo
  permitido — no site, na API e no MCP.
- **FR-006**: Tokens existentes MUST ficar com o Tamanho padrão, sem nenhuma mudança visível.
- **FR-007**: Um token sem modelo 3D MUST ficar com o Tamanho padrão; remover o modelo volta o Tamanho ao padrão.
- **FR-008**: A vista 3D do mapa MUST desenhar o modelo de cada peça com a altura automática multiplicada pelo Tamanho
  do token, mantendo os pés no chão, o centro na peça e a direção da peça, em pé, andando e deitado.
- **FR-009**: Os balões de fala e a ocultação pelas paredes MUST continuar corretos com o modelo de qualquer Tamanho.
- **FR-010**: Uma mudança do Tamanho MUST chegar à mesa como as outras mudanças do token (a peça é atualizada sem
  recarregar).
- **FR-011**: O Tamanho MUST ser só visual: não muda o espaço da peça, a ocupação, o movimento nem a imagem 2D.
- **FR-012**: A foto da pose ("Gerar imagem") MUST continuar enquadrando o modelo para ocupar toda a imagem do token,
  como hoje, qualquer que seja o Tamanho (Q2 = A): o Tamanho só vale na vista 3D.
- **FR-013**: As ferramentas do MCP que criam e alteram tokens MUST aceitar e descrever o Tamanho, e as leituras de
  token MUST trazê-lo.

### Key Entities

- **Token**: ganha o atributo **Tamanho do modelo 3D** (multiplicador da altura automática, padrão 100%). Só tem
  efeito quando o token tem um modelo 3D.
- **Peça do mapa**: não guarda nada novo; lê o Tamanho do token, como já lê o modelo e as animações.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O dono ajusta o Tamanho e vê o resultado na prévia em menos de 1 segundo, sem salvar.
- **SC-002**: Com o Tamanho em 200%, o modelo aparece na vista 3D com o dobro da altura que tinha em 100% (tolerância
  de 2%), com os pés no chão.
- **SC-003**: 100% dos tokens existentes continuam aparecendo na vista 3D exatamente como antes da mudança.
- **SC-004**: Valores fora do intervalo são recusados em 100% dos caminhos (site, API, MCP), sempre com a mesma
  mensagem.
- **SC-005**: Uma mudança de Tamanho aparece para quem está com o mapa 3D aberto em até 3 segundos, sem recarregar.

## Assumptions

- O Tamanho é do **token** (vale para todas as peças que usam o token), não de cada peça no mapa, como o modelo e as
  animações.
- Só o dono do token o altera, como os outros campos do token.
- O Tamanho multiplica a altura que o modelo já recebe hoje (a da silhueta da figura da peça), então ele continua
  acompanhando o número de hexágonos da peça.
- A altura da câmera em terceira pessoa, os balões e as paredes seguem as regras atuais; só o modelo muda de tamanho.
- A ferramenta roll6anime não é afetada (ela mostra o modelo sempre enquadrado).
- A foto da pose e a imagem 2D do token não mudam com o Tamanho.
