# Implementation Plan: Imagens 2,5D por direção do token

**Branch**: `035-token-direction-views` | **Date**: 2026-10-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/035-token-direction-views/spec.md`

## Summary

Completa o 2,5D da vista 3D (034): o token ganha **três imagens** — direita, esquerda e costas — além da frente, todas com o mesmo
recorte 3:4 e a mesma silhueta humana de guia; o cadastro de token ganha uma **aba "2,5D"** com os quatro campos; e o 3D escolhe, a
cada quadro, a imagem do **lado em que a câmera vê o personagem** em relação à direção da peça (frente ±45°, costas ±45° da oposta,
laterais 90°), com a reserva decidida na clarificação: lateral que falta → a oposta **espelhada**, senão a frente, senão a imagem em pé;
as costas nunca são espelhadas.

Técnica: três colunas novas em `tokens` (sem endpoint novo); `Token.UpdateSprites` guarda as quatro; `MapTokenInfo` leva as quatro URLs
para o 3D; duas funções puras testáveis — `viewSeen` (lado visto) e `chooseSprite` (reserva e espelhamento) em `lib/spriteView.ts` — são
usadas por `drawRaycastFrame`, que escolhe a imagem por quadro e inverte a coluna de textura quando espelhada. No cadastro, um hook
`useSpriteImages` concentra o estado das quatro imagens e as duas abas do formulário ficam sempre montadas, para nada se perder.
Nenhuma dependência nova.

## Technical Context

**Language/Version**: C# 12 / .NET 8.0 (backend); TypeScript 5 / React 18 (frontend)
**Primary Dependencies**: ASP.NET Core 8, EF Core 9 + Npgsql, SignalR (017), `ModelContextProtocol.AspNetCore` 2.x (020) · React 18, Vite 6, Bootstrap 5.3 (dark), i18next, sonner, `react-easy-crop`. **Nenhuma dependência nova.**
**Storage**: PostgreSQL — `tokens.right_image`, `tokens.left_image`, `tokens.back_image` (`varchar(260) null`); arquivos no bucket via `POST /api/image` (nomes `{guid}.{ext}`)
**Testing**: xUnit + Moq + FluentAssertions (`Roll6.Tests`: `Token`, `TokenLibraryService`, DTO das peças, MCP); Vitest `environment: 'node'` — `lib/spriteView.ts` e `lib/raycastFrame.ts` são puros e testados sem DOM
**Target Platform**: navegadores desktop e celular; contêineres Linux em homolog/produção; sem Docker na máquina de dev
**Project Type**: aplicação web (`backend/` + `Roll6.Mcp` + `Roll6.Tests`; `frontend/`)
**Performance Goals**: SC-004 — ≥ 30 fps com 50 peças de quatro imagens (a escolha custa uma conta trigonométrica por figura por quadro; memória ≈ 1,4 MB por token, com cache por URL); SC-003 — a troca ao girar a peça segue os eventos em tempo real existentes (≤ 2 s)
**Constraints**: `McpCoverageTests` fixo em 86/87 → nenhum endpoint novo e parâmetros MCP novos com default; o PUT de token continua substituindo todos os campos; a mesma posição da câmera sempre dá a mesma imagem (FR-015, tolerância de 1e-9 nas divisas); a silhueta, o recorte 3:4 e a altura dos olhos da câmera (derivada de `lib/frontImage.ts`) não mudam; o 2D e as regras das peças não mudam
**Scale/Scope**: 1 migração + 1 SQL incremental · 0 endpoints · 3 campos em 3 DTOs (+ URLs) · `Token.UpdateSprites` · 2 funções puras novas · `drawRaycastFrame`/`StoryView`/`spriteSpec` adaptados · formulário de token com 2 abas e 4 campos · 1 hook novo · ~16 chaves i18n · 2 ferramentas MCP com parâmetros novos + guia

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Gate | Status | Como este plano atende |
|---|---|---|---|
| **I. Skills de Arquitetura** | `dotnet-architecture` / `react-architecture` para entidades novas | **PASS** | Nenhuma entidade, repositório, service, context ou provider novo: três campos em `Token` (DTO → Domain → Context → migração pela skill `dotnet-architecture`) e um hook de estado local no frontend. Respostas DTO + `ProblemDetails`. |
| **II. Stack Tecnológica Fixa** | Sem lib fora da stack; sem Docker local | **PASS** | Nenhuma dependência nova; reaproveita `ImageCropper` (react-easy-crop), `Tabs` e `imageService` (Fetch). |
| **III. Case Sensitivity** | `Contexts/`, `Services/`, `hooks/`, `types/` | **PASS** | Arquivos novos: `lib/spriteView.ts`, `hooks/useSpriteImages.ts` (minúsculos), `components/tokens/SpriteImageField.tsx` (renomeia `FrontImageField`). |
| **IV. Convenções de Código** | PascalCase/camelCase; `[JsonPropertyName]`; `interface`; sem `enum` TS | **PASS** | `RightImage`/`LeftImage`/`BackImage`, `UpdateSprites`; JSON `rightImage`/`leftImage`/`backImage`/`*Url`; TS com constantes (`SPRITE_VIEWS`) e `interface`/`Record`, sem `enum`. |
| **V. Banco PostgreSQL** | snake_case, `varchar` com tamanho, sem Cascade | **PASS** | `right_image`, `left_image`, `back_image` `varchar(260)` nulos; nenhuma FK. |
| **VI. Autenticação e Segurança** | `[Authorize]`; token em localStorage | **PASS** | Nenhum endpoint novo; só o criador altera o token (inalterado); arquivos lidos por `GET /api/image/file` já `[Authorize]`. |
| **VII. Grid Hexagonal** | Matemática de hex no módulo puro, x/y persistidos | **PASS** | Nada novo é gravado; a direção da peça é o `look` (0–5) já existente e a posição vem de `hexCenter`; `viewSeen` só compara ângulos em px (reaproveita `lookToYaw`). |

**Resultado**: sem violações; *Complexity Tracking* vazio.

**Reavaliação pós-Fase 1**: `data-model.md` e `contracts/` não criaram endpoint, tabela, FK, provider nem dependência. **Gate: PASS.**

## Project Structure

### Documentation (this feature)

```text
specs/035-token-direction-views/
├── plan.md, research.md (D1..D10), data-model.md, quickstart.md
├── contracts/ api.md · mcp-tools.md · ui-contracts.md
├── checklists/requirements.md
└── tasks.md (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── Roll6.Domain/Models/Token.cs                       # + RightImage/LeftImage/BackImage; UpdateSprites(front,right,left,back); Update sem frontImage
├── Roll6.Domain/Services/TokenLibraryService.cs       # create/update chamam UpdateSprites; MapToDto com as quatro + URLs
├── Roll6.Domain/Services/MapTokenService.cs           # MapToDtoAsync → right/left/back ImageUrl
├── Roll6.DTO/Token/TokenInsertInfo.cs, TokenInfo.cs   # + rightImage, leftImage, backImage (+ URLs)
├── Roll6.DTO/MapToken/MapTokenInfo.cs                 # + rightImageUrl, leftImageUrl, backImageUrl
├── Roll6.Infra/Context/Roll6Context.cs + Migrations/<ts>_AddTokenDirectionImages.cs
├── Roll6.Mcp/Tools/TokenTools.cs, MapTokenTools.cs, Roll6Guide.cs
└── Roll6.Tests/  TokenLibraryServiceTests (quatro imagens, validação, PUT remove), MapTokenServiceTests (quatro URLs na listagem)
database/migrations/035-token-direction-images.sql, database/roll6.sql

frontend/src/
├── types/token.ts, types/mapToken.ts                  # campos novos
├── lib/spriteView.ts (+ test)                         # NOVO — SPRITE_VIEWS, viewSeen, chooseSprite
├── lib/raycastFrame.ts (+ test)                       # RenderSprite com images/fallback/look; escolha por quadro; espelhamento
├── lib/pieceDrawing.ts (+ test)                       # spriteSpec → views, fallbackUrl, look
├── lib/tokenForm.ts (+ test)                          # toTokenInsert com as quatro; toTokenForm
├── lib/uploadFrontImage.ts → lib/uploadSpriteImage.ts # as quatro
├── lib/frontImage.ts                                  # só comentário: vale para as quatro
├── hooks/useSpriteImages.ts                           # NOVO — crops/keep/reset/remove/upload das quatro
├── components/tokens/FrontImageField.tsx → SpriteImageField.tsx   # prop view; dica de lado sempre visível
├── components/tokens/TokenFormFields.tsx              # abas "Token" e "2,5D", painéis sempre montados
├── components/modals/TokenModal.tsx, TokenEditModal.tsx            # useSpriteImages no lugar de frontCrop/keepFront
├── components/story/StoryView.tsx                     # carrega as quatro URLs; monta RenderSprite
├── i18n/locales/pt-BR.json                            # tokens.tabToken/tabSprites/view/viewHint/spriteCropHint
```

**Structure Decision**: aplicação web existente; nenhum projeto ou diretório novo. A regra de qual lado aparece fica em `lib/` (pura, testada
nos seis `look` × oito direções da câmera); o que toca React fica nos componentes e no hook.

## Complexity Tracking

> Sem violações do Constitution Check — nada a justificar.
