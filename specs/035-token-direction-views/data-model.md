# Data Model: Imagens 2,5D por direção do token

**Feature**: `035-token-direction-views` | **Research**: [research.md](./research.md)

## Token (`tokens`)

Nenhuma entidade nova. O token ganha três imagens 2,5D, ao lado da frente (034):

| Propriedade (C#) | Coluna | Tipo | Nulo | Regra |
|---|---|---|---|---|
| `FrontImage` | `front_image` | `varchar(260)` | sim | (034) frente |
| `RightImage` **novo** | `right_image` | `varchar(260)` | sim | lado direito do personagem, de perfil olhando para a direita da imagem |
| `LeftImage` **novo** | `left_image` | `varchar(260)` | sim | lado esquerdo, de perfil olhando para a esquerda da imagem |
| `BackImage` **novo** | `back_image` | `varchar(260)` | sim | costas |

Todas: `Guard.ImageFileName` (`{guid}.{png|jpg|webp}`), chaves de erro `frontImage`/`rightImage`/`leftImage`/`backImage`, opcionais e
independentes. Sem FK nem índice (são nomes de arquivo, como `up_image`).

`Token.UpdateSprites(front, right, left, back)` valida e guarda as quatro; `Token.Update(...)` perde o parâmetro `frontImage` e
volta aos campos do token. `UpdatedAt` é atualizado por ambos.

EF (`Roll6Context`, bloco `Token`): `entity.Property(e => e.RightImage).HasColumnName("right_image").HasMaxLength(260)` e
idem `left_image`, `back_image`.

## DTOs

| DTO | Campos novos |
|---|---|
| `TokenInsertInfo` | `rightImage`, `leftImage`, `backImage` (strings opcionais; o PUT substitui tudo: omitido = removido) |
| `TokenInfo` | `rightImage`, `rightImageUrl`, `leftImage`, `leftImageUrl`, `backImage`, `backImageUrl` |
| `MapTokenInfo` | `rightImageUrl`, `leftImageUrl`, `backImageUrl` (do token da peça; `frontImageUrl` já existe) |

## Migração `AddTokenDirectionImages`

```sql
ALTER TABLE tokens ADD right_image character varying(260);
ALTER TABLE tokens ADD left_image  character varying(260);
ALTER TABLE tokens ADD back_image  character varying(260);
```

Sem backfill: tokens existentes ficam só com o que tinham (a frente da 034 continua e é o que o 3D usa nos quatro lados).
`database/migrations/035-token-direction-images.sql` (idempotente) e `database/roll6.sql` regenerado mantendo o cabeçalho.

## Estruturas do frontend (puras, `lib/spriteView.ts`)

```ts
export const SPRITE_VIEWS = ['front', 'right', 'left', 'back'] as const;
export type SpriteView = typeof SPRITE_VIEWS[number];

/** As quatro imagens (nomes de arquivo, URLs ou pixels, conforme o uso). */
export type ViewImages<T> = Record<SpriteView, T | null>;

export const viewSeen = (look: number, piece: Point, camera: Point): SpriteView;          // D4
export const chooseSprite = <T>(images: ViewImages<T>, fallback: T, seen: SpriteView)
  : { image: T; mirrored: boolean };                                                        // D5
```

Campos do token por direção (mapeamento único usado por formulário, tipos e MCP):

| `SpriteView` | `TokenInfo`/`TokenInsertInfo` | `MapTokenInfo` |
|---|---|---|
| `front` | `frontImage` / `frontImageUrl` | `frontImageUrl` |
| `right` | `rightImage` / `rightImageUrl` | `rightImageUrl` |
| `left` | `leftImage` / `leftImageUrl` | `leftImageUrl` |
| `back` | `backImage` / `backImageUrl` | `backImageUrl` |

`RenderSprite` (`lib/raycastFrame.ts`): `{ id, center, width, look, images: ViewImages<PixelBuffer>, fallback: PixelBuffer }`.
`SpriteSpec` (`lib/pieceDrawing.ts`): `{ mapTokenId, name, views: ViewImages<string>, fallbackUrl: string | null, look, width, center, baseColor }`.

## Estado do cadastro (`hooks/useSpriteImages.ts`)

| Estado | Significado |
|---|---|
| `crops: Record<SpriteView, ImageCrop \| null>` | recorte de uma imagem recém-escolhida, por direção |
| `keep: Record<SpriteView, boolean>` | (edição) a imagem salva é mantida até ser trocada ou removida |

Operações: `setCrop(view, crop)`, `remove(view)`, `reset(token?)`, `current(view)` (URL salva a mostrar) e
`upload(token?)` → `Record<SpriteView, string | null>`: sobe os recortes novos (`uploadSpriteImage`), reaproveita o nome salvo das
mantidas e devolve `null` para as removidas — o PUT substitui todos os campos.

## Regras e transições

- Qualquer imagem pode faltar; o token continua válido com nenhuma, uma, duas, três ou as quatro.
- Escolha no 3D (resumo, ver research D4/D5): lado visto direto → senão, lateral oposta espelhada → senão frente → senão imagem em pé.
  As costas nunca são espelhadas.
- A direção da peça (`look`, 0–5) já existe em `MapToken`; nada novo é gravado na peça.
