# Feature Specification: Estado "Deitado" Opcional no Token

**Feature Branch**: `003-token-optional-down`
**Created**: 2026-09-25
**Status**: Draft
**Input**: User description: "No Token, o downImage e downSpace são opcionais, não deve ser obrigatorio"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cadastrar token sem estado deitado (Priority: P1)

Um usuário cadastra um token que só existe em pé — um baú, uma árvore, uma porta — informando
apenas o nome, a imagem em pé e o espaço em pé. O token é salvo sem imagem nem espaço de
"deitado", e as leituras mostram esses dois campos vazios.

**Why this priority**: hoje todo token acaba com um espaço deitado (padrão 2) mesmo quando não
faz sentido, o que confunde quem vai desenhar o token no mapa.

**Independent Test**: criar um token sem `downImage` e sem `downSpace`, ler de volta e confirmar
que os dois vêm vazios; editar esse token mantendo-os vazios.

**Acceptance Scenarios**:

1. **Given** um usuário autenticado, **When** ele cadastra um token sem imagem deitado e sem
   espaço deitado, **Then** o token é salvo e a leitura devolve imagem deitado e espaço deitado
   vazios.
2. **Given** um token com estado deitado, **When** o dono o edita removendo a imagem deitado e o
   espaço deitado, **Then** a leitura passa a devolver os dois campos vazios.
3. **Given** um token sem estado deitado, **When** ele é listado ou buscado, **Then** aparece
   normalmente, com os campos de deitado vazios.

---

### User Story 2 - Manter o estado deitado quando informado (Priority: P2)

Quem cadastra um token com imagem deitado continua tendo o comportamento atual: o espaço deitado
pode ser informado e, se não for, assume o padrão 2.

**Why this priority**: preserva o fluxo já existente para personagens e criaturas que podem cair.

**Independent Test**: criar um token com `downImage` e sem `downSpace` → espaço deitado 2; com
`downSpace` 3 → 3.

**Acceptance Scenarios**:

1. **Given** um cadastro com imagem deitado e sem espaço deitado, **When** o token é salvo,
   **Then** o espaço deitado é 2.
2. **Given** um cadastro com espaço deitado 3 e sem imagem deitado, **When** o token é salvo,
   **Then** o espaço deitado é 3 e a imagem deitado fica vazia.
3. **Given** um espaço deitado negativo, **When** o usuário tenta salvar, **Then** o cadastro é
   recusado informando o campo.

---

### Edge Cases

- Espaço deitado 0 informado explicitamente: aceito e guardado como 0 (diferente de vazio).
- Tokens já cadastrados antes desta mudança mantêm o espaço deitado que têm hoje (2 ou o valor
  informado); nada é apagado.
- Tokens no mapa criados a partir de um token sem estado deitado continuam funcionando; as
  leituras de token no mapa devolvem a imagem deitado vazia.
- Espaço em pé e imagem em pé não mudam: espaço em pé continua com padrão 1.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A imagem deitado do token MUST ser opcional no cadastro e na alteração.
- **FR-002**: O espaço deitado do token MUST ser opcional no cadastro e na alteração e MUST poder
  ficar vazio (token sem estado deitado).
- **FR-003**: Quando nem a imagem deitado nem o espaço deitado forem informados, o token MUST
  ser salvo sem estado deitado (os dois campos vazios).
- **FR-004**: Quando a imagem deitado for informada e o espaço deitado não, o espaço deitado MUST
  assumir o padrão 2.
- **FR-005**: Quando o espaço deitado for informado, ele MUST ser guardado como informado
  (inteiro ≥ 0), com ou sem imagem deitado.
- **FR-006**: As leituras de token (obter, listar, buscar) e de token no mapa MUST devolver
  imagem deitado, URL da imagem deitado e espaço deitado vazios quando o token não tiver estado
  deitado.
- **FR-007**: Tokens existentes MUST manter os valores atuais de espaço deitado.

### Key Entities *(include if feature involves data)*

- **Token** (alterado): o estado deitado (imagem deitado + espaço deitado) passa a ser opcional.
  Um token sem estado deitado tem os dois campos vazios.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos cadastros de token sem imagem e sem espaço deitado são aceitos e lidos de
  volta com os dois campos vazios.
- **SC-002**: 100% dos cadastros com imagem deitado e sem espaço deitado recebem espaço deitado 2,
  como antes.
- **SC-003**: Nenhum token existente tem o espaço deitado alterado pela mudança.
- **SC-004**: O cadastro de um token simples (só nome e imagem em pé) exige no máximo 2 campos
  preenchidos.

## Assumptions

- "Opcional" significa que o token pode não ter estado deitado. O padrão 2 continua valendo só
  quando há imagem deitado, preservando o comportamento da feature 001 para quem usa o estado
  deitado.
- A regra de alteração segue a da feature 001: o dono envia todos os campos; um campo omitido
  volta ao seu valor vazio/padrão pelas regras acima.
- Escopo apenas do backend e da coleção de requisições de exemplo; nenhum outro campo do token
  muda.
