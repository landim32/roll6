# Research: Miniaturas de mesa na vista isométrica (104)

Nenhum item do Technical Context ficou como NEEDS CLARIFICATION; as decisões abaixo fecham os detalhes que a spec deixou
para o plano (espessura e diâmetro da base, eixo do tombo, preto e branco, balões).

## R1 — Como montar a miniatura (modelo + base + tombo)

- **Decision**: um `THREE.Group` por peça ("miniatura") posto no centro da forma (`sprite.center`), girado no `yaw` da peça
  (`rotationForYaw`), com um grupo filho **pivô** na borda de trás da base. Dentro do pivô: a base, a figura 2,5D e o
  objeto do modelo. Em pé, o pivô não gira; tombada, o pivô gira 90° em volta do eixo horizontal perpendicular ao `look`
  (o topo vai para as costas). O modelo continua posicionado pelo `fitModel` atual, com `center` (0, 0) local e
  `ground = BASE_HEIGHT`, e o `modelSet` o põe dentro do pivô pela opção nova `mount(id)`.
- **Rationale**: o tombo é uma só rotação de um nó; mudar de postura não recarrega nada nem reposiciona o modelo; as armas,
  já filhas dos ossos, tombam junto. O `fitLyingModel` (058) deita só o modelo, de costas no chão e sem base — a resposta
  Q1 pediu a miniatura inteira tombada.
- **Alternatives considered**: (a) `ModelSpec.lying` + `fitLyingModel` e uma base deitada à parte — duas transformações
  para manter em sincronia e a base não tomba "junto"; (b) mover o modelo para fora do `modelSet` — duplicaria carga,
  clipes e armas.

## R2 — Tamanho da base

- **Decision**: raio = `BASE_SHARE × √(space × área do hex / π)` — 85% do círculo com a área dos `space` hexes —, com
  `BASE_SHARE = 0.85`; espessura `BASE_HEIGHT = 4` px (o hex mede 40 de raio). Para 1 hex: raio ≈ 30,9 (o hex tem
  apótema ≈ 34,6), então a base cabe no hex e os hexes coloridos (103) continuam visíveis em volta; 2, 3, 7 e 10 hexes
  dão ≈ 43,7, 53,6, 81,8 e 97,8.
- **Rationale**: cresce com todo tamanho (FR-003); o "Tamanho" do modelo (`modelScale`) não entra.
- **Alternatives considered**: (a) o maior círculo dentro da caixa de `pieceGeometry` — as formas de 2 e 3 hexes são
  filas de 1 hex de largura, então a base não cresceria (descoberto na implementação); (b) raio pela largura da figura
  (`sprite.width`) — para 1 hex daria 40, maior que o hex.

## R3 — Aparência da base

- **Decision**: cilindro baixo (`CylinderGeometry`, 32 lados, compartilhado; escala por peça), topo e lado escuros
  (a cor da peça escurecida, `Color.lerp` para preto 0,8), e um anel (`RingGeometry`, 0,82 → 1,0 do raio) na cor da peça
  logo acima do topo. Todos os materiais com `applyLight(…, 'piece')`, `castShadow` com o `depthMaterial` cortado pela luz.
- **Rationale**: lembra a base preta de miniatura com a borda pintada; a cor do tipo fica legível de cima (SC-004).
  Escurecer a cor da peça evita um hex de cor novo fora do tema (o tema vale para a interface, não para a cena).
- **Alternatives considered**: base inteira na cor da peça — compete com o modelo e com os hexes coloridos.

## R4 — Preto e branco (fora de combate)

- **Decision**: `applyLight(material, uniforms, 'piece', { gray })` aceita um uniform `{ value: 0 | 1 }` por peça; o
  fragmento de peça faz `rgb = mix(rgb, vec3(dot(rgb, vec3(0.299, 0.587, 0.114))), isoGray)` antes da luz. Sem `gray`, um
  uniform comum fixo em 0. O `modelSet` passa o `id` da peça no `patchMaterial(material, id)` (materiais já são clonados
  por instância na 103), então cada modelo e suas armas ligam no uniform da sua peça. A base não recebe `gray`.
- **Rationale**: trocar a postura muda só `gray.value`; mesmo programa (`customProgramCacheKey` igual), nada recompilado.
- **Alternatives considered**: trocar materiais por cópias cinzas — recompila e duplica texturas; `ctx.filter` não se aplica.

## R5 — Figura 2,5D tombada e imagem no chão

- **Decision**: em pé, a figura continua virada para a câmera (`figureView` + `facingAngle`, convertido para o quadro do
  grupo subtraindo o giro do grupo). Tombada, a figura fixa a vista de **frente** voltada para o `look` (rotação local 0)
  e tomba com o pivô — fica de costas no chão, com a frente para cima. Imagem no chão (sem modelo nem figura):
  `downImageUrl` quando tombada e existir, senão `upImageUrl`, sem girar 90° (a spec pede "continua a de Em pé"). As duas
  URLs entram na assinatura para serem lidas uma vez; trocar a postura troca só o `map`.
- **Rationale**: uma figura deitada virada para a câmera giraria no chão a cada giro da câmera.

## R6 — Balões e foco

- **Decision**: `anchors()`: de pé, a altura atual + `BASE_HEIGHT`; tombada, `2 × raio da base` (a base em pé de lado é o
  ponto mais alto). Foco por clique continua pelo hex (`candidateAt`), sem mudança.

## R7 — Testes

- **Decision**: `lib/isoMiniature.test.ts` cobre: raio por tamanho (1, 2, 3, 7, 10) e independência do `modelScale`;
  estado por postura × tipo (objeto nunca tomba; fora de combate = tombada + cinza; caído = tombada, sem cinza); pivô e
  eixo do tombo para os 6 `look` (a cabeça vai para o lado oposto ao `look`); escolha da imagem do chão.
  `modelSet.test.ts` ganha casos de `mount` (o objeto vai para o pai dado) e do `id` no `patchMaterial`; sem as opções, o
  comportamento atual (os testes existentes continuam passando).
