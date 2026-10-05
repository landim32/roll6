# Feature Specification: Ajustes do 2,5D — formulário de token, máscara em tons de cinza, chão e balões no 3D

**Feature Branch**: `036-fix-2-5d-polish`
**Created**: 2026-10-04
**Status**: Draft
**Input**: User description: "Correções no 2.5D: alinhar e uniformizar os campos de crop do cadastro de token (2 colunas, títulos, descrições e crop alinhados, mesma proporção visual); máscara 3D com tons de cinza (altura da parede proporcional ao tom); chão que continua com a cor da borda da imagem do mapa em vez de preto; balões de conversa também no 3D."

## Contexto

A vista 3D (034) e as imagens por direção do token (035) já existem. Ao usá-las apareceram quatro incômodos: o formulário de token
mostra os quatro recortes 2,5D com tamanhos e alinhamentos diferentes (o que também induz o cadastro de imagens desproporcionais,
que no 3D parecem maiores que outras); a máscara só aceita paredes inteiras (preto) ou vazio (branco); além da borda da imagem do
mapa o chão fica preto; e as falas das peças, que aparecem no mapa 2D, não aparecem no 3D.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Formulário de token com os quatro recortes alinhados (Priority: P1)

Quem cadastra ou edita um token abre a aba "2,5D" e vê os quatro campos (frente, direita, esquerda, costas) em duas colunas, todos
com **exatamente o mesmo tamanho de recorte**, com título, descrição e área de recorte alinhados linha a linha. O que se vê no
recorte é a proporção real que será gravada, então a figura cadastrada em um campo não parece maior ou menor que a dos outros.

**Why this priority**: o desalinhamento atrapalha o cadastro e provoca imagens de tamanhos diferentes, que depois distorcem a cena
3D. Corrigir aqui evita o problema na origem; é a base para avaliar o 3D.

**Independent Test**: abrir "Incluir token" e "Editar token", ir à aba "2,5D", com e sem imagens já cadastradas, e comparar
visualmente os quatro campos (e medir) em tela larga e em celular.

**Acceptance Scenarios**:

1. **Given** a aba "2,5D" aberta em tela larga, **When** o usuário olha os quatro campos, **Then** estão em duas colunas e duas
   linhas; os títulos de uma mesma linha ficam na mesma altura, as descrições também e as áreas de recorte têm largura e altura
   idênticas.
2. **Given** campos com e sem imagem (vazios, com imagem já gravada, com imagem recém-escolhida), **When** o usuário compara, **Then**
   a área de recorte continua com o mesmo tamanho e a silhueta guia ocupa a mesma posição e proporção em todos.
3. **Given** textos de título/descrição de comprimentos diferentes entre os campos (ou traduzidos para mais de uma linha), **When**
   o formulário é exibido, **Then** o início da área de recorte continua alinhado entre os campos da mesma linha.
4. **Given** tela estreita (celular), **When** a aba é aberta, **Then** os campos empilham em uma coluna, sem rolagem horizontal,
   ainda com recortes de mesmo tamanho.
5. **Given** um recorte feito em qualquer um dos quatro campos, **When** o token é salvo e visto no 3D, **Then** a figura aparece
   na mesma escala que a de um token cujas quatro imagens foram recortadas do mesmo modo.

---

### User Story 2 - Chão contínuo depois da borda do mapa (Priority: P1)

No 3D, o chão além dos limites da imagem do mapa deixa de ficar preto: continua com a cor de onde a imagem termina, de modo que a
cena se estende até o horizonte sem uma faixa escura.

**Why this priority**: é um defeito visível em toda cena cujo campo de visão ultrapassa a imagem; correção pequena e de grande ganho
de imersão.

**Independent Test**: abrir um mapa 3D, olhar para fora da borda do mapa e conferir que o chão não é preto e não tem emenda
marcada com o chão da imagem.

**Acceptance Scenarios**:

1. **Given** um mapa 3D, **When** o usuário olha na direção em que o chão passa da borda da imagem, **Then** o chão fora da imagem
   tem a cor da borda mais próxima, sem faixa preta.
2. **Given** uma borda de imagem com cores diferentes ao longo dela (ex.: areia de um lado, grama do outro), **When** o chão é
   estendido, **Then** cada trecho continua com a cor da borda que está mais perto, sem salto brusco na emenda.
3. **Given** um mapa sem imagem de chão carregada, **When** a vista 3D é aberta, **Then** o comportamento atual (chão neutro) se
   mantém.

---

### User Story 3 - Balões de conversa no 3D (Priority: P2)

As falas das peças (balões que aparecem sobre as peças no mapa 2D) também aparecem na vista 3D, sobre a figura de quem falou,
enquanto a fala estiver ativa.

**Why this priority**: quem acompanha a cena em 3D hoje perde as falas; é um recurso novo, porém menor que as correções de
formulário e de chão.

**Independent Test**: com uma peça com fala ativa no turno, abrir o 3D e ver o balão sobre a figura; mudar de câmera e conferir
que o balão acompanha a figura e some quando ela some ou a fala deixa de valer.

**Acceptance Scenarios**:

1. **Given** uma peça visível no 3D com fala ativa, **When** o 3D é exibido, **Then** o balão com o texto aparece acima da cabeça
   da figura, com o mesmo texto que o 2D mostra.
2. **Given** a câmera se aproximando ou afastando da figura, **When** a cena é redesenhada, **Then** o balão acompanha a figura e
   continua legível (não encolhe a ponto de ilegível nem cobre a tela).
3. **Given** uma figura escondida atrás de uma parede, fora do campo de visão ou caída, **When** a cena é desenhada, **Then** seu
   balão não aparece.
4. **Given** duas ou mais falas na mesma região da tela, **When** a cena é desenhada, **Then** os balões não ficam ilegíveis uns
   sobre os outros (o da figura mais próxima fica à frente).
5. **Given** a fala é alterada ou termina (evento em tempo real ou novo turno), **When** o 3D está aberto, **Then** o balão é
   atualizado ou removido sem reabrir a vista.

---

### User Story 4 - Máscara 3D com tons de cinza: paredes de alturas diferentes (Priority: P3)

Quem prepara o mapa pode usar uma máscara com **tons de cinza**: o tom define a altura da parede naquele ponto. Preto continua
sendo parede de altura total, branco continua sendo vazio e um cinza de 50% gera uma parede com metade da altura. Isso permite
muretas, balcões e degraus de cenário sem outro arquivo.

**Why this priority**: melhoria opcional do cenário; as máscaras atuais (só preto e branco) já funcionam, e o pedido autoriza
deixar de fora se for inviável ou complexo.

**Independent Test**: criar uma máscara com faixas preto, cinza 50% e branco, abrir o 3D e medir a altura relativa das paredes na
tela; conferir que máscaras antigas (preto e branco) ficam idênticas ao que eram.

**Acceptance Scenarios**:

1. **Given** uma máscara com uma região preta e outra cinza 50%, **When** o 3D mostra as duas à mesma distância, **Then** a parede
   cinza tem metade da altura da preta, com a base no mesmo nível do chão.
2. **Given** uma máscara só com preto e branco, **When** o 3D é aberto, **Then** o resultado é igual ao de antes desta mudança.
3. **Given** uma parede baixa (cinza claro) à frente de uma parede alta, **When** o usuário olha por cima da baixa, **Then** vê a
   parede alta, o céu e as figuras atrás dela acima do topo da mureta, e não vê o que está abaixo do topo dela.
4. **Given** um tom de cinza quase branco (diferença imperceptível de vazio), **When** a máscara é lida, **Then** é tratado como
   vazio, sem criar uma parede de poucos pixels de altura ou fios na cena.
5. **Given** a prévia da máscara no cadastro do mapa, **When** a máscara tem cinzas, **Then** a prévia mostra os tons como estão no
   arquivo (a máscara continua sem aparecer no mapa 2D nem afetar peças).

---

---

### User Story 5 - Textura nas paredes do mapa (Priority: P3, adicionada depois)

No cadastro do mapa (aba "3D" da imagem do cenário e "Editar mapa") o dono pode enviar **uma imagem de textura** que reveste todas as
paredes da vista 3D (pedra, tijolo, madeira…). Sem a imagem, as paredes ficam exatamente como antes, pintadas com as cores da imagem
do mapa.

**Independent Test**: enviar uma textura de tijolo, salvar o mapa e abrir o 3D: as paredes mostram o tijolo, repetido ao longo delas;
removê-la devolve as cores do mapa.

**Acceptance Scenarios**:

1. **Given** um mapa sem textura, **When** o 3D é aberto, **Then** as paredes têm as cores do mapa, como antes desta feature.
2. **Given** uma textura enviada e o mapa salvo, **When** o 3D é aberto, **Then** todas as faces de parede mostram a textura, com a
   mesma sombra por distância, repetida ao longo da parede e sem esticar.
3. **Given** uma parede mais baixa que a inteira, **When** vista de lado, **Then** mostra a parte de baixo da textura (como se
   recortada de uma parede inteira); o topo dela continua com a imagem do mapa.
4. **Given** a textura removida (ou que falhou ao carregar), **When** o 3D é redesenhado, **Then** as paredes voltam às cores do mapa.

---

### Edge Cases

- Recorte de um campo 2,5D com imagem de proporção diferente da esperada → o recorte já gravado sempre é exibido na mesma área, sem
  esticar a área do campo.
- Nome muito longo no título ou descrição → quebra de linha sem empurrar a área de recorte para fora do alinhamento.
- Chão: câmera muito próxima da borda, nos cantos do mapa, ou imagem com borda transparente → continua sem preto; transparência é
  tratada como a cor neutra atual.
- Balão de fala longo ou peça no limite da tela → o balão é cortado ou reposicionado para permanecer legível dentro da tela.
- Peça com fala ativa que está atrás de uma mureta baixa → o balão aparece se a cabeça da figura estiver visível acima do topo da
  mureta.
- Máscara com cinzas escuros próximos do preto → paredes quase de altura total, sem divisão visual estranha em relação ao preto.
- Máscara com gradiente suave → a altura varia gradualmente entre as células, sem exigir tratamento especial além do tom de cada
  célula.
- Parede baixa vista por trás/sobre outra parede baixa → a mais próxima oculta somente o que fica abaixo do seu topo.

## Requirements *(mandatory)*

### Functional Requirements

**Formulário de token (2,5D)**

- **FR-001**: Os quatro campos da aba "2,5D" (frente, direita, esquerda, costas) MUST ter área de recorte com exatamente o mesmo
  tamanho e proporção, com ou sem imagem.
- **FR-002**: Em tela larga, os campos MUST ser exibidos em duas colunas por duas linhas, com títulos alinhados entre os campos da
  mesma linha, descrições alinhadas e áreas de recorte começando na mesma altura.
- **FR-003**: Em tela estreita, os campos MUST empilhar em uma coluna, mantendo recortes do mesmo tamanho e sem rolagem horizontal.
- **FR-004**: O que é mostrado dentro do recorte MUST corresponder à proporção realmente gravada, de modo que uma imagem cadastrada
  em qualquer campo apareça na mesma escala que nos demais (incluindo a silhueta guia na mesma posição e proporção).
- **FR-005**: O formulário MUST manter o alinhamento mesmo com textos de comprimentos diferentes (inclusive quebrando em mais de
  uma linha).
- **FR-006**: As abas do cadastro e da edição de token MUST apresentar o mesmo layout e comportamento (nenhum campo perde
  alinhamento ao editar um token já existente).

**Máscara 3D em tons de cinza**

- **FR-007**: A máscara MUST aceitar tons de cinza; o tom (do preto ao branco) define a altura da parede em cada célula: preto =
  altura total, branco = vazio, cinza 50% = metade da altura, proporcional entre os extremos.
- **FR-008**: Máscaras só com preto e branco MUST produzir exatamente o mesmo resultado de antes (compatibilidade).
- **FR-009**: Paredes mais baixas que a altura total MUST ter a base no chão e o topo na altura proporcional; acima do topo MUST
  ser visível o que existe atrás (outras paredes mais altas, céu e figuras) e abaixo do topo MUST ser ocultado pela parede.
- **FR-010**: Tons suficientemente próximos do branco para não gerar parede perceptível MUST ser tratados como vazio.
- **FR-011**: A máscara MUST continuar sem aparecer no mapa 2D e sem afetar o posicionamento ou as regras das peças; a prévia da
  máscara no cadastro do mapa MUST mostrar os tons de cinza fielmente.
- **FR-012**: O guia do MCP e a ajuda do cadastro de mapa MUST informar que a máscara aceita tons de cinza e como o tom define a
  altura.

**Chão fora da imagem do mapa**

- **FR-013**: No 3D, o chão além dos limites da imagem do mapa MUST continuar com a cor da borda da imagem mais próxima, sem preto
  e sem emenda marcada entre a imagem e o prolongamento.
- **FR-014**: Sem imagem de chão disponível, o chão MUST manter o comportamento atual (cor neutra).
- **FR-015**: O escurecimento por distância já existente MUST continuar valendo sobre o chão prolongado.

**Balões de conversa no 3D**

- **FR-016**: Peças visíveis no 3D com fala ativa MUST mostrar o balão sobre a cabeça da figura, com o mesmo texto e a mesma regra
  de "fala ativa" do mapa 2D.
- **FR-017**: O balão MUST acompanhar a figura enquanto a câmera se move e MUST permanecer legível em qualquer distância (tamanho
  limitado entre um mínimo e um máximo).
- **FR-018**: Balões MUST NOT aparecer para figuras não desenhadas (fora do campo de visão, ocultas por parede acima da cabeça,
  caídas ou fora de combate).
- **FR-019**: Balões sobrepostos MUST ficar ordenados por proximidade (a figura mais próxima à frente), e balões nunca MUST sair
  da área visível da tela.
- **FR-020**: Mudanças ou fim de uma fala MUST se refletir no 3D aberto, sem reabrir a vista, pelos mesmos meios que atualizam o 2D.

- **FR-021**: O modelo de mapa MUST aceitar uma imagem opcional de textura das paredes (PNG/JPEG/WebP, mesmas regras das outras imagens), gravada e devolvida com URL temporária; o PUT continua substituindo todos os campos (textura omitida = removida).
- **FR-022**: O dono do mapa MUST poder enviar e remover a textura na aba "3D" e em "Editar mapa", sem restrição de proporção.
- **FR-023**: Na vista 3D, todas as faces de parede MUST mostrar a textura quando ela existe (altura da imagem = parede inteira, repetida ao longo da parede, com a sombra por distância) e as cores do mapa quando não existe; a máscara, o chão, o céu e as peças não mudam.

### Key Entities *(include if feature involves data)*

- **Máscara 3D**: imagem do mapa que descreve, por ponto, a altura da parede — agora em escala contínua do vazio (branco) à
  parede total (preto), em vez de dois valores. Não ganha campo novo: o significado dos tons é que passa a valer.
- **Imagens 2,5D do token**: as quatro vistas já existentes; sem mudança de dados, apenas de apresentação no cadastro.
- **Fala da peça**: texto curto atrelado a uma peça durante o turno; já existe no 2D e passa a ser exibida também no 3D.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Nos quatro campos da aba "2,5D", a diferença de largura/altura da área de recorte entre quaisquer dois campos é de
  no máximo 1 pixel, e títulos, descrições e áreas de recorte da mesma linha ficam alinhados com diferença de no máximo 1 pixel,
  em tela larga e em celular.
- **SC-002**: Tokens cadastrados com os mesmos enquadramentos nos quatro campos aparecem no 3D na mesma escala (diferença de altura
  na tela de no máximo 2% entre as vistas à mesma distância).
- **SC-003**: Em 100% dos casos observados, o chão fora da imagem do mapa não aparece preto e não mostra emenda perceptível com a
  imagem (verificado com ao menos três mapas diferentes).
- **SC-004**: Com uma máscara de cinza 50%, a parede ocupa 50% (±3%) da altura de uma parede preta à mesma distância; com máscaras
  só em preto e branco, o quadro renderizado é idêntico ao anterior.
- **SC-005**: Uma fala ativa aparece no 3D em até 2 segundos após ser registrada (mesma latência do 2D) e some em até 2 segundos
  após terminar.
- **SC-006**: A vista 3D mantém pelo menos 30 quadros por segundo em uma cena de 50 peças, com as novas funções ativas (balões,
  paredes de várias alturas e chão prolongado).
- **SC-007**: Um usuário consegue cadastrar as quatro imagens de um token sem corrigir o alinhamento ou o tamanho de nenhum campo,
  na primeira tentativa, em 9 de cada 10 casos de teste.

## Assumptions

- A altura da parede é linear no tom: altura = 100% − luminosidade (preto = 100%, branco = 0%); o que importa é a luminosidade
  percebida da célula, independentemente de cor.
- O limite "quase branco = vazio" é pequeno (da ordem de poucos por cento de altura) e fixo; não é configurável.
- Paredes baixas não bloqueiam a visão por cima delas; o observador do 3D continua sem se mover entre paredes, então nenhuma
  regra de colisão é necessária.
- O prolongamento do chão usa a cor da borda mais próxima da imagem do mapa (a opção "última cor da imagem do mapa" do pedido);
  não usa o céu, a menos que ainda não haja imagem de chão.
- O balão do 3D reaproveita o texto e as regras de duração/atualização das falas já existentes no 2D; não cria novo tipo de dado
  nem novo endpoint.
- Tamanho e posição dos balões no 3D são decididos pela experiência de leitura (legível, sem cobrir a cena), não pelo tamanho
  do balão no 2D.
- Os recortes já gravados dos tokens continuam válidos; apenas a apresentação no cadastro muda, sem migração de dados.
- A máscara em tons de cinza é opcional e retrocompatível; se a implementação se mostrar inviável ou desproporcionalmente
  complexa, a Story 4 pode ser adiada sem prejuízo às demais (conforme o próprio pedido).
- O alinhamento do formulário vale para o cadastro e a edição de token; outros formulários do app ficam como estão.
