# Feature Specification: Posição x/y e Direção do Olhar do Token no Mapa

**Feature Branch**: `004-maptoken-position-look`
**Created**: 2026-09-25
**Status**: Draft
**Input**: User description: "troque q e r por x e y, e adicione um campo chamado look para armazenar para onde o token está olhando, deve conter de 0 a 5, um numero para cada lado do hexagono"

## Clarifications

### Session 2026-09-25

- Q: O que `x` e `y` representam? → A: `x` = coluna e `y` = linha da grid retangular do modelo
  (mesma contagem de `grid_width` × `grid_height`, colunas ímpares deslocadas meia altura para
  baixo). Exige emendar o Princípio VII da constituição, que proibia persistir coordenadas
  offset.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Posicionar o token com x e y (Priority: P1)

O dono do mapa posiciona e move os tokens informando a posição como `x` e `y`, em vez de `q` e
`r`. Leituras e listagens de tokens do mapa devolvem `x` e `y`.

**Why this priority**: é a forma como o token é colocado no mapa; os nomes antigos não devem
mais aparecer para quem usa o sistema.

**Independent Test**: incluir um token em x = 3, y = 2, lê-lo de volta e confirmar x = 3, y = 2;
movê-lo para x = 4, y = 0 e confirmar; confirmar que `q`/`r` não aparecem mais.

**Acceptance Scenarios**:

1. **Given** um mapa do usuário, **When** ele inclui um token em x = 3, y = 2 (coluna 3,
   linha 2), **Then** a listagem dos tokens do mapa mostra o token em x = 3, y = 2.
2. **Given** um token no mapa, **When** o dono o move para x = 4, y = 0, **Then** a leitura
   devolve x = 4, y = 0.
3. **Given** um token incluído sem posição, **When** ele é salvo, **Then** fica em x = 0, y = 0.
4. **Given** um token que estava em q = 3, r = 1 antes desta mudança, **When** ele é lido,
   **Then** aparece em x = 3, y = 2 — a mesma célula.

---

### User Story 2 - Definir para onde o token está olhando (Priority: P1)

O dono do mapa indica para qual lado do hexágono o token está virado, com um número de 0 a 5
(um para cada lado). O valor é guardado e devolvido nas leituras, para o mapa desenhar o token
virado para o lado certo.

**Why this priority**: direção importa no jogo (flanquear, campo de visão, portas); sem ela
cada jogador imagina uma orientação diferente.

**Independent Test**: incluir um token com look 2, ler e confirmar 2; alterar para 5 e confirmar;
tentar 6 ou −1 e confirmar a recusa.

**Acceptance Scenarios**:

1. **Given** um mapa do usuário, **When** ele inclui um token com look 2, **Then** a leitura
   devolve look 2.
2. **Given** um token com look 2, **When** o dono o altera para 5, **Then** a leitura devolve 5.
3. **Given** um token incluído sem look, **When** ele é salvo, **Then** look é 0.
4. **Given** look 6 ou −1, **When** o dono tenta salvar, **Then** a operação é recusada
   informando o campo look.
5. **Given** tokens criados antes desta mudança, **When** são lidos, **Then** look é 0.

---

### Edge Cases

- Mover o token sem informar look: como na alteração todos os campos são enviados, look omitido
  volta a 0 (mesma regra de substituição completa já usada).
- Posições fora da grid continuam aceitas (a verificação visual é do frontend, como definido na
  feature 002).
- Um token no mapa do tipo Object (baú, porta) também tem look; o frontend pode ignorá-lo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A posição do token no mapa MUST ser informada e devolvida como `x` e `y`; os
  campos `q` e `r` MUST deixar de existir nas entradas e respostas.
- **FR-002**: `x` e `y` MUST ser números inteiros; sem valor informado, MUST assumir 0.
- **FR-003**: `x` MUST ser a coluna e `y` a linha da célula na grid retangular do modelo de
  mapa: a coluna 0 fica à esquerda, a linha 0 no topo, e as colunas ímpares ficam deslocadas meia
  altura de hexágono para baixo. Uma grid `grid_width` × `grid_height` tem células de
  `x` = 0..`grid_width`−1 e `y` = 0..`grid_height`−1.
- **FR-004**: Tokens já posicionados MUST continuar na mesma célula da grid após a mudança: a
  posição antiga é convertida para coluna/linha pela correspondência definida no guia de
  hexágonos adotado pelo projeto (coluna = q; linha = r + (q − paridade de q) ÷ 2).
- **FR-005**: O token no mapa MUST ter o campo `look`, inteiro de 0 a 5, padrão 0.
- **FR-006**: Cada valor de `look` MUST corresponder a um lado do hexágono de lado reto em cima,
  começando pelo lado de cima e seguindo no sentido horário: 0 = cima, 1 = cima-direita,
  2 = baixo-direita, 3 = baixo, 4 = baixo-esquerda, 5 = cima-esquerda.
- **FR-007**: Valores de `look` fora de 0..5 MUST ser recusados com indicação do campo.
- **FR-008**: `look` MUST ser aceito na inclusão e na alteração e devolvido em todas as leituras
  e listagens de tokens do mapa.
- **FR-009**: Somente o dono do mapa MUST poder alterar posição e look (regra existente).

### Key Entities *(include if feature involves data)*

- **MapToken** (alterado): posição passa a ser `x`, `y`; ganha `look` (0–5, lado do hexágono
  para onde o token olha).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das leituras de tokens do mapa trazem `x`, `y` e `look`, e nenhuma traz `q`
  ou `r`.
- **SC-002**: 100% dos tokens existentes continuam na mesma célula da grid depois da mudança.
- **SC-003**: 100% das tentativas com look fora de 0–5 são recusadas com indicação do campo.
- **SC-004**: Dois usuários vendo o mesmo mapa enxergam cada token na mesma célula e virado para o
  mesmo lado.

## Assumptions

- Numeração de look: sentido horário a partir do lado de cima (FR-006), escolhida por ser a mais
  intuitiva para quem joga; o frontend usa a mesma convenção.
- look padrão 0 (virado para cima) para tokens novos sem valor e para os já existentes.
- Escopo: backend, documentação e coleção de requisições de exemplo; o desenho do token virado é
  do frontend.
