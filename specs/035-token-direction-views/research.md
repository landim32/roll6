# Research: Imagens 2,5D por direção do token

**Feature**: `035-token-direction-views` | **Date**: 2026-10-04 | **Spec**: [spec.md](./spec.md)

Formato: *Decision / Rationale / Alternatives considered*. Nenhum `NEEDS CLARIFICATION` restou: as três perguntas
da clarificação (espelhamento, orientação das laterais, setores) estão fechadas na spec.

---

## D1 — Dados: três colunas novas em `tokens`

**Decision**: `tokens.right_image`, `tokens.left_image`, `tokens.back_image`, todas `varchar(260) null`, nomes armazenados
`{guid}.{ext}` validados por `Guard.ImageFileName` (chaves de erro `rightImage`, `leftImage`, `backImage`). A frente continua
`front_image` (034). Migração `AddTokenDirectionImages` (3 `AddColumn`, sem backfill: tokens existentes ficam sem as três).

**Rationale**: é exatamente o formato do `front_image`; o PUT continua substituindo todos os campos (um campo omitido é
removido), que é o contrato já usado por `downImage` e `frontImage`.

**Alternatives considered**: *tabela `token_images` (token, direção, arquivo)* — normalizada e extensível a 8 direções, mas
exige repositório, joins nas listagens de peças (polled) e é mais do que quatro campos opcionais pedem (a spec deixa 8
direções fora do escopo); *uma coluna `jsonb` com as quatro* — esconde os campos da API e do MCP, e quebra o padrão
snake_case por coluna da constituição.

## D2 — Domínio: as quatro imagens 2,5D num método só

**Decision**: `Token.Update(...)` volta a ter só os campos do token (nome, descrição, tamanhos, imagens em pé/deitada) e um
método novo `Token.UpdateSprites(string? front, string? right, string? left, string? back)` valida e guarda as quatro
(`ImageFileName` em cada). `TokenLibraryService` chama os dois em criar e atualizar.

**Rationale**: evita um `Update` de 10 parâmetros e deixa a regra "as quatro imagens 2,5D" num lugar, o que casa com o
frontend (um bloco `SpriteImages`). O `frontImage` sai de `Update` (parâmetro opcional da 034).

**Alternatives considered**: *mais três parâmetros em `Update`* — funciona, mas assinatura ilegível e fácil de trocar a ordem.

## D3 — Quais peças trazem as imagens (DTO das peças)

**Decision**: `MapTokenInfo` ganha `rightImageUrl`, `leftImageUrl`, `backImageUrl` ao lado de `frontImageUrl`, preenchidos em
`MapTokenService.MapToDtoAsync` a partir do token da peça (que já é carregado em lote para `upImageUrl`/`downImageUrl`). Nenhum
endpoint novo; os eventos em tempo real (`mapToken.*`) já enviam o `MapTokenInfo` inteiro.

**Rationale**: o 3D só lê `MapTokenInfo`; a direção da peça (`look`) já está nele. URLs pré-assinadas já são calculadas por peça.

## D4 — Qual lado a câmera vê: função pura `viewSeen`

**Decision**: `lib/spriteView.ts` (puro, sem DOM) define `SpriteView = 'front' | 'right' | 'left' | 'back'` e
`viewSeen(look, piece, camera)`:

1. `facing = lookToYaw(look)` (0 = norte, no sentido horário — a mesma convenção da câmera e de `forwardOf`).
2. `bearing = atan2(camera.x − piece.x, −(camera.y − piece.y))` (a direção da peça à câmera, na mesma convenção).
3. `relative = normalize(bearing − facing)` em (−π, π].
4. `|relative| ≤ 45°` → `front`; `|relative| ≥ 135°` → `back`; senão `relative > 0` → `right` (a câmera está do lado direito
   dele: virado ao norte, o leste), `relative < 0` → `left`. Com uma tolerância de 1e-9 nas divisas, para que 45°/135° exatos
   sejam sempre frente/costas apesar do ponto flutuante (FR-011, FR-015).

**Rationale**: reaproveita `lookToYaw` e a convenção do raycaster; é pura e testável nos seis `look` × oito direções da câmera
(SC-002). Câmera atrás do personagem escolhido (padrão) → `relative ≈ 180°` → costas, como a spec pede.

**Alternatives considered**: *comparar vetores com produto escalar/cruzado* — equivalente, mas os limites em graus ficam
menos legíveis; *histerese perto das divisas* — evita trocas ao andar devagar sobre a divisa, mas a spec exige apenas que a
mesma posição dê sempre a mesma imagem; fica fora (pode vir depois se incomodar).

## D5 — Escolha com reserva e espelhamento: função pura `chooseSprite`

**Decision**: `chooseSprite(images, fallback, seen)` genérica em `T` (serve para URLs e para pixels):

```
images[seen]                                   → { image, mirrored: false }
seen = right e images.left                     → { image: images.left,  mirrored: true }
seen = left  e images.right                    → { image: images.right, mirrored: true }
images.front                                   → { image: images.front, mirrored: false }   (costas e laterais sem oposta)
fallback (imagem em pé / reserva)              → { image: fallback, mirrored: false }
```

**Rationale**: é literalmente FR-013 (e a clarificação 1): espelha só lateral que falta, nunca as costas, e a imagem de frente
ausente cai direto na imagem em pé. Genérica evita duplicar a regra no carregamento (URLs) e no desenho (pixels).

## D6 — Desenho: escolher a imagem por quadro, dentro de `drawRaycastFrame`

**Decision**: `RenderSprite` passa a ser `{ id, center, width, look, images: Record<SpriteView, PixelBuffer | null>, fallback: PixelBuffer }`.
Em cada quadro, para cada figura, `viewSeen(sprite.look, sprite.center, { x: pose.x, y: pose.z })` + `chooseSprite(...)` decidem a
imagem; se `mirrored`, a coluna de textura é invertida (`texX = width − 1 − texX`). O tamanho no chão continua a largura da forma da
peça, com a altura vinda da proporção da imagem escolhida (todas 3:4, salvo a reserva).

**Rationale**: a câmera muda a cada quadro, então a escolha tem de ser por quadro; é uma conta trigonométrica por figura (50
figuras: desprezível diante dos ~2,6 ms do quadro). Continua pura e testável em Node (cena sintética com quatro cores).

**Alternatives considered**: *escolher no React ao mover a câmera* — força um re-render por passo da câmera; *pré-compor um
atlas* — complexidade sem ganho.

## D7 — Carregamento das imagens no 3D

**Decision**: `spriteSpec` devolve `views: Record<SpriteView, string | null>` (as quatro URLs da peça) e `fallbackUrl` (`upImageUrl`),
mais `look`. `StoryView` lê cada URL distinta uma vez (cache `Map<url, Promise<PixelBuffer | null>>`, já existente) e monta o
`RenderSprite`; sem nenhuma imagem, `fallback` é a inicial do nome (`initialPixels`), como hoje. Imagens que ainda não carregaram
usam a reserva até chegarem (a figura é montada quando todas as suas imagens terminaram, com a reserva no lugar das falhas).

**Rationale**: reaproveita o pipeline da 034 (`loadImage` → `toPixels` ≤ 256 px); memória: 4 imagens × 256×341 × 4 bytes ≈ 1,4 MB
por token, e o cache é por URL (peças do mesmo token compartilham).

## D8 — Cadastro: abas dentro do formulário e um estado só para as quatro imagens

**Decision**: o formulário do token (`TokenFormFields`) ganha duas abas com o componente `Tabs` existente: **"Token"** (nome,
descrição, imagem em pé e deitada, tamanhos) e **"2,5D"** (as quatro imagens). Os dois painéis ficam **sempre montados** e o
inativo recebe `hidden`, como o `TokenModal` já faz com suas abas: assim nada se perde ao alternar (FR-005), nem textos, nem
arquivos escolhidos, nem recortes abertos. O estado das quatro imagens (recorte novo, manter/remover a salva) vive num hook
`useSpriteImages(token?)`, usado por `TokenModal` (criar) e `TokenEditModal` (editar) no lugar do par `frontCrop`/`keepFront`.
`FrontImageField` vira `SpriteImageField` com a prop `view`; a imagem de frente passa a morar na aba "2,5D".

**Rationale**: um estado por direção duplicado quatro vezes em dois modais seria o pior cenário; o hook concentra
`crops`, `keep`, `reset`, `remove` e o `upload` das quatro. A dica de lado (FR-003) é um `form-text` sempre visível por campo,
não só durante o recorte.

**Alternatives considered**: *aba de nível do `TokenModal`* — o pedido fala da tela de cadastro, e a edição é outro modal;
sub-abas valem para os dois; *desmontar o painel inativo* — perderia o recorte aberto.

## D9 — Upload das imagens 2,5D

**Decision**: `lib/uploadFrontImage.ts` vira `lib/uploadSpriteImage.ts` (`uploadSpriteImage(crop)`, arquivo gerado com nome `sprite`) e
serve às quatro imagens, com o mesmo recorte 3:4 (`FRONT_IMAGE_SIZE`, `FRONT_IMAGE_ASPECT`) e a mesma silhueta. O módulo
`lib/frontImage.ts` **mantém o nome**: a altura dos olhos da câmera (034) deriva dele e renomeá-lo só espalharia mudanças sem
efeito; o comentário passa a dizer que vale para as quatro imagens.

**Rationale**: as quatro imagens são o mesmo tipo de recorte; um só caminho de upload evita divergência de tamanho.

## D10 — Tipos, `toTokenInsert` e MCP

**Decision**: `SPRITE_VIEWS` (constante) e `SpriteImages = Record<SpriteView, string | null>` em `lib/spriteView.ts`;
`toTokenInsert(form, upImage, downImage, sprites = EMPTY_SPRITES)` mapeia para `frontImage`/`rightImage`/`leftImage`/`backImage`.
MCP: `create_token`/`update_token` ganham `rightImage`, `leftImage`, `backImage` (parâmetros com default, como exige o teste de
paridade); os *Returns* de token e de `list_map_tokens` citam os campos novos; a seção "3D view" do guia explica as quatro
imagens, a orientação das laterais, o espelhamento e a reserva. `McpCoverageTests` continua em 86/87 (nenhum endpoint novo).
