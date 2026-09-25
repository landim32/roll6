# Feature Specification: Grid Hexagonal e Ajuste da Imagem no Modelo de Mapa

> **Atualização (2026-09-25)**: o tamanho do hexágono deixou de ser calculado. Agora é a constante
> `HexGrid.HEX_SIZE = 40` (px, centro→vértice), igual no backend e no frontend; `hexSize` nas leituras
> é sempre 40. `imageTop`/`imageLeft` passaram a ser deslocamentos livres na faixa −20000..20000
> (negativo move a imagem para a direita/baixo), sem a regra "recorte < exibição". Ajustar a imagem
> não altera a grid. Os trechos abaixo sobre `CalculateHexSize` e recorte ≥ 0 estão obsoletos.

**Feature Branch**: `002-mapmodel-grid-layout`
**Created**: 2026-09-25
**Status**: Draft
**Input**: User description: "No MapModel, no frontend será necessário criar uma grid de hexágonos usando o algoritmo de https://www.redblobgames.com/grids/hexagons/. Deverá ser colocada uma imagem grande do cenário por baixo da grid. Então precisa: adicionar campos grid_width e grid_height para o tamanho do grid; adicionar campos image_width e image_height para o tamanho da imagem (a imagem fica guardada no tamanho original, mas no frontend ela pode ser redimensionada para esse tamanho); adicionar campos image_top e image_left, a imagem pode ser cortada, tipo um crop no frontend. Isso serve para ajustar a grid."

## Clarifications

### Session 2026-09-25

- Q: Largura/altura da grid são quantidade de hexágonos ou pixels? → A: Quantidade de hexágonos
  (colunas × linhas).
- Q: O modelo guarda tamanho e orientação do hexágono? → A: A orientação é sempre "lado reto em
  cima" (flat-top) e não é guardada. O tamanho do hexágono não é guardado: é calculado, pela
  mesma regra, no backend e no frontend quando necessário.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Definir o tamanho da grid do modelo (Priority: P1)

Ao cadastrar ou editar um modelo de mapa, o dono informa o tamanho da grid hexagonal que será
desenhada sobre a imagem do cenário. Qualquer pessoa que abrir o modelo (ou um mapa criado a
partir dele) recebe esse tamanho para desenhar a mesma grid.

**Why this priority**: sem o tamanho da grid não é possível desenhar o tabuleiro nem posicionar
tokens de forma consistente entre usuários.

**Independent Test**: criar um modelo informando o tamanho da grid, lê-lo de volta e confirmar
que os valores voltam iguais; editar e confirmar a alteração.

**Acceptance Scenarios**:

1. **Given** um usuário autenticado, **When** ele cadastra um modelo informando largura 20 e
   altura 15 da grid, **Then** o modelo é salvo e a leitura devolve largura 20 e altura 15.
2. **Given** um modelo existente, **When** o dono altera a grid para 30 × 25, **Then** a leitura
   passa a devolver 30 × 25.
3. **Given** um cadastro sem tamanho de grid, **When** o modelo é salvo, **Then** ele recebe o
   tamanho padrão da grid.
4. **Given** um tamanho de grid zero, negativo ou acima do limite, **When** o usuário tenta
   salvar, **Then** o cadastro é recusado informando o campo inválido.
5. **Given** um modelo com grid 10 × 8, exibição 1600 × 1400 e recorte 0 × 0, **When** ele é
   lido, **Then** o tamanho do hexágono devolvido é o menor entre 1600 ÷ 15,5 e
   1400 ÷ (√3 × 8,5), ou seja, 95,0930 — e a grid inteira cabe na área visível.

---

### User Story 2 - Ajustar a imagem do cenário sob a grid (Priority: P1)

O dono do modelo informa o tamanho em que a imagem do cenário deve ser exibida (largura e altura)
e o deslocamento do recorte (topo e esquerda), para que as salas e corredores da imagem fiquem
alinhados com os hexágonos. A imagem original continua guardada sem alteração; somente os
parâmetros de exibição são salvos.

**Why this priority**: imagens de cenário raramente vêm alinhadas com a grid; sem esse ajuste a
grid fica desencontrada do desenho e o mapa perde utilidade.

**Independent Test**: salvar um modelo com imagem, largura/altura de exibição e deslocamento;
ler de volta e confirmar os valores; confirmar que o arquivo de imagem original não mudou.

**Acceptance Scenarios**:

1. **Given** um modelo com imagem, **When** o dono informa exibição 2000 × 1500 e recorte
   topo 40, esquerda 25, **Then** a leitura devolve exatamente esses valores.
2. **Given** um modelo com esses ajustes, **When** a imagem é consultada, **Then** o arquivo
   devolvido é o original enviado no upload, sem redimensionamento nem corte.
3. **Given** um modelo sem ajustes de imagem informados, **When** ele é lido, **Then** a
   largura/altura de exibição vêm vazias (a imagem é exibida no tamanho original) e o recorte
   vem 0 × 0.
4. **Given** largura ou altura de exibição zero/negativa, ou recorte negativo, **When** o
   usuário tenta salvar, **Then** o cadastro é recusado informando o campo inválido.

---

### Edge Cases

- Modelo sem imagem: os campos de grid continuam válidos; os ajustes de imagem são aceitos e
  simplesmente não têm efeito até uma imagem ser associada.
- Troca da imagem do modelo: os ajustes de exibição e recorte são mantidos como estão; o dono
  pode reajustá-los.
- Informar só a largura de exibição (sem a altura), ou o contrário: recusado — as duas vêm
  juntas ou nenhuma.
- Recorte maior que a área exibida (topo ≥ altura de exibição, ou esquerda ≥ largura de
  exibição): recusado, pois não sobraria imagem visível.
- Alterar a grid de um modelo que já tem mapas com tokens posicionados: permitido; tokens que
  ficarem fora da nova grid continuam salvos e o tratamento visual fica a cargo do frontend.
- Modelos já existentes antes desta feature passam a ter os valores padrão.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O modelo de mapa MUST guardar a largura e a altura da grid hexagonal como
  quantidade de hexágonos: largura = colunas, altura = linhas.
- **FR-002**: Largura e altura da grid MUST ser números inteiros entre 1 e 500; quando não
  informadas, MUST assumir 20 × 20.
- **FR-003**: O modelo de mapa MUST guardar a largura e a altura de exibição da imagem, em
  pixels, ambas maiores que zero e até 20.000, ou ambas vazias (exibir no tamanho original).
- **FR-004**: O modelo de mapa MUST guardar o recorte da imagem (topo e esquerda), em pixels da
  imagem já redimensionada, inteiros maiores ou iguais a zero, padrão 0.
- **FR-005**: O recorte MUST ser menor que a área exibida (topo < altura de exibição e esquerda
  < largura de exibição) quando a largura/altura de exibição estiverem informadas.
- **FR-006**: A imagem enviada MUST continuar armazenada no tamanho original; redimensionar e
  recortar são apenas parâmetros de exibição.
- **FR-007**: Os novos campos MUST aparecer no cadastro, na alteração, na leitura, na listagem e
  na busca de modelos de mapa, e nas leituras de mapa que já trazem dados do modelo.
- **FR-008**: Somente o dono do modelo MUST poder alterar esses campos (mesma regra já existente
  para alterar o modelo).
- **FR-009**: A grid MUST seguir o sistema de coordenadas hexagonal já adotado pelo projeto
  (coordenadas axiais), sempre com hexágonos de **lado reto em cima** (flat-top). A orientação
  não é configurável nem guardada.
- **FR-010**: O tamanho do hexágono (distância do centro a um vértice) MUST NOT ser guardado; ele
  é calculado pela regra abaixo, idêntica no backend e no frontend:
  - Área visível: largura = largura de exibição − recorte esquerda; altura = altura de exibição
    − recorte topo.
  - Largura ocupada pela grid, em tamanhos de hexágono: `1,5 × colunas + 0,5`.
  - Altura ocupada pela grid, em tamanhos de hexágono: `√3 × (linhas + 0,5)` quando há mais de
    uma coluna, e `√3 × linhas` quando há uma única coluna.
  - Tamanho do hexágono = o menor entre (largura visível ÷ largura ocupada) e (altura visível ÷
    altura ocupada), de modo que a grid inteira caiba na área visível.
- **FR-011**: As leituras do modelo MUST devolver o tamanho do hexágono calculado (com 4 casas
  decimais) quando a largura e a altura de exibição estiverem informadas, e vazio quando não
  estiverem (o frontend calcula a partir do tamanho original da imagem, com a mesma regra).

### Key Entities *(include if feature involves data)*

- **MapModel** (alterado): passa a ter, além de nome, descrição e imagem:
  - **Grid**: largura (colunas) e altura (linhas) em hexágonos de lado reto em cima.
  - **Tamanho do hexágono**: calculado, nunca guardado (FR-010).
  - **Exibição da imagem**: largura e altura em que a imagem é desenhada.
  - **Recorte da imagem**: topo e esquerda do trecho visível.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos modelos salvos devolvem, na leitura, os mesmos valores de grid, exibição e
  recorte informados no cadastro ou na última alteração.
- **SC-002**: Dois usuários diferentes abrindo o mesmo modelo recebem parâmetros idênticos, de
  modo que a grid e a imagem ficam alinhadas da mesma forma para ambos.
- **SC-003**: O dono consegue alinhar a grid a um cenário ajustando no máximo quatro valores
  (largura/altura de exibição e recorte topo/esquerda), sem reenviar a imagem.
- **SC-004**: 100% das tentativas com valores inválidos (zero, negativos, acima do limite,
  recorte fora da área) são recusadas com indicação do campo.
- **SC-005**: O arquivo de imagem guardado permanece byte a byte igual ao enviado, qualquer que
  seja o ajuste configurado.
- **SC-006**: Para os mesmos parâmetros, o tamanho do hexágono calculado pelo backend e pelo
  frontend é igual até a 4ª casa decimal.

## Assumptions

- Escopo: somente o backend (dados, regras e contrato). O desenho da grid, o redimensionamento e
  o recorte visuais são responsabilidade da futura feature de frontend.
- Nomes: "imagem_height" na descrição é tratado como `image_height`.
- Unidade de exibição e recorte: pixels; o recorte é medido sobre a imagem já redimensionada
  para a largura/altura de exibição.
- Recorte só aceita valores ≥ 0 (corta a partir do canto superior esquerdo); deslocar a imagem
  para além da grid (valores negativos) está fora do escopo.
- Os valores são do modelo de mapa; os mapas de campanha usam os valores do seu modelo (não há
  ajuste por mapa nesta feature).
- Limites: grid até 500 × 500 e exibição até 20.000 px por lado, suficientes para cenários
  grandes sem permitir valores absurdos.
