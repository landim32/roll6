# Implementation Plan: Chat da campanha (turno e conversa numa linha só)

**Branch**: `041-campaign-chat` | **Date**: 2026-10-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/041-campaign-chat/spec.md` (issue #32, without PWA #38 and Web Push #39)

## Summary

A linha do tempo da campanha **é a tabela `turns`, estendida**. `TurnType` ganha:

- `Text`, `Image` e `Audio`: conversa, com nome e foto gravados no envio, mídia e exclusão lógica;
- `TurnFinished`: o divisor gravado onde o turno avança.

O registro de turno antigo já está ali, então nada é migrado além dos divisores dos turnos passados. As regras e todas as leituras de turno filtram os tipos 1–5, para que as ferramentas da API e da IA devolvam exatamente o mesmo de antes.

O chat lê essa tabela por cursor e devolve campos estruturados para desenhar cada tipo:

- **discretos**: movimento, ação e mudança;
- **destaque leve**: resultado;
- **destaque**: narração;
- **divisor**: fim de turno.

Novidades no backend: contagem de não lidas (`chat_reads`), upload de áudio, apagar (autor ou mestre) e os eventos `chat.message`/`chat.deleted`. Os registros de turno se reconciliam com os `turn.changed`/`turn.finished` que já existem.

No frontend:

- **Chat e layout**: `ChatContext`, `ChatPanel` e o composer com o seletor **Conversa / Ação**. A ação reutiliza o `POST /api/turn/action` com a peça do personagem.
- **Três modos**: Mapa, dividido 50/50 fixo e Chat. No modo Chat o mapa não é montado. As camadas do mapa passam para uma região própria que mede a si mesma.
- **Remoções**: saem o console de turno e a janela "Turno N".

No MCP entram 3 ferramentas.

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend); TypeScript 5 / React 18 (frontend)
**Primary Dependencies**: ASP.NET Core 8, EF Core 9 + Npgsql, SignalR (017), AWSSDK.S3, `ModelContextProtocol.AspNetCore` 2.x · React 18, Vite 6, Bootstrap 5.3 (dark), i18next, sonner, Radix Dialog/Dropdown, `@microsoft/signalr`, `MarkdownView` sanitizado · APIs do navegador `MediaRecorder`, `ResizeObserver`, `visualViewport`. **Nenhuma dependência nova.**
**Storage**: PostgreSQL — `turns` + `display_name`, `display_image`, `image`, `audio`, `audio_seconds`, `deleted_at` e índice `ix_turns_campaign_created`; tabela `chat_reads`; divisores retroativos; 1 migração `AddCampaignChat` + `database/migrations/041-campaign-chat.sql`; mídia no bucket existente
**Testing**: xUnit + Moq + FluentAssertions (`TurnTests`, `ChatServiceTests`, `TurnServiceTests`, `MapTokenServiceTests`, `CampaignServiceTests`, `CharacterServiceTests`, MCP); Vitest (`chatItems`, `layoutMode`, `audioFormat`)
**Target Platform**: navegadores desktop e celular (Chrome/Android, Safari/iOS); API em contêiner Linux (instância única)
**Project Type**: aplicação web (`backend/` + `frontend/` + `Roll6.Mcp`)
**Performance Goals**: item visível aos outros em até 2 s (SC-001); página de 50 itens com 1 consulta indexada + entradas dos turnos da página + nomes; modo Chat sem desenho do mapa
**Constraints**: contratos de turno idênticos (FR-012, SC-002); regras de turno inalteradas (SC-003); acesso `CanReadAsync`; identidade validada no servidor; texto ≤ 4000, ação ≤ 2000, foto ≤ 10 MB, áudio ≤ 2 min / 5 MB; divisão 50/50 fixa; sem filtro de tipos; sem sussurro; resultado e narração só por API/IA; MCP 89/90
**Scale/Scope**: backend com `Turn` (+4 tipos, +6 colunas, fábricas), filtro `TurnTypes.LOG` nas leituras de turno, divisores em 3 pontos, `ChatService` + `ChatController` (5 ações), `ChatRead` + repositório, `DeleteByCharacterAsync` ajustado, `IImageStorageAppService.DeleteAsync`, 2 eventos, 3 ferramentas MCP + textos; frontend com 1 context/service/hook/types, ~7 componentes de chat, `LayoutToggle`, 3 libs puras, reorganização do `MainPage`/CSS e remoção de 3 componentes de turno

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Gate | Status | Como este plano atende |
|---|---|---|---|
| **I. Skills de Arquitetura** | `dotnet-architecture` / `react-architecture` | **PASS** | `ChatRead` (entidade nova) e `ChatService` pela `dotnet-architecture`; a extensão de `Turn` segue o mesmo padrão (Model, Context, migração); `types/chat`, `Services/chatService`, `Contexts/ChatContext`, `hooks/useChat` e o provider pela `react-architecture`, com DTO direto + ProblemDetails. |
| **II. Stack Tecnológica Fixa** | sem lib nova; Context API; Fetch | **PASS** | Nenhuma dependência; APIs do navegador para áudio. |
| **III. Case Sensitivity** | `Contexts/`, `Services/`, `hooks/`, `types/` | **PASS** | Arquivos nas pastas existentes; `components/chat/` em minúsculas como os demais. |
| **IV. Convenções de Código** | camelCase JSON, `interface`, sem `enum` TS | **PASS** | Kinds e modos como `as const`; DTOs com `[JsonPropertyName]`. |
| **V. Banco PostgreSQL** | snake_case, `ClientSetNull`, migração | **PASS** | Colunas snake_case; `chat_reads` com PK/FK nomeadas e `ClientSetNull`; uma migração + script incremental. |
| **VI. Autenticação e Segurança** | `[Authorize]` | **PASS** | Todos os endpoints `[Authorize]`; identidade e quem apaga checados no servidor; Markdown sanitizado. |
| **VII. Grid Hexagonal** | — | **N/A** | Posições do movimento só exibidas (já gravadas em `x`/`y`). |

**Resultado**: sem violações; *Complexity Tracking* vazio.

**Reavaliação pós-Fase 1**: `data-model.md` estende `turns` sem mudar o significado dos tipos 1–5; `contracts/api.md` lista os endpoints de turno com contrato idêntico. **Gate: PASS.**

## Project Structure

### Documentation (this feature)

```text
specs/041-campaign-chat/
├── plan.md, research.md (D1..D14), data-model.md, quickstart.md
├── contracts/ api.md · realtime-mcp-ui.md
├── checklists/requirements.md
└── tasks.md (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── Roll6.Domain/Enums/TurnType.cs                         # + Text, Image, Audio, TurnFinished; TurnTypes.LOG/CONVERSATION
├── Roll6.Domain/Models/Turn.cs                            # + colunas, fábricas Text/Image/Audio/TurnFinished, Delete
├── Roll6.Domain/Models/ChatRead.cs                        # NOVO
├── Roll6.Domain/Interfaces/IChatService.cs, Services/ChatService.cs   # NOVOS
├── Roll6.Domain/Services/TurnService*.cs                  # leituras só LOG + não apagadas; divisores; admin recusa tipos novos
├── Roll6.Domain/Services/CampaignService.cs               # chat_reads + mídia
├── Roll6.Infra.Interfaces/Repository/ITurnRepository.cs   # páginas por cursor, contagem de não lidas, filtros
├── Roll6.Infra.Interfaces/Repository/IChatReadRepository.cs  # NOVO
├── Roll6.Infra.Interfaces/AppServices/IImageStorageAppService.cs  # + DeleteAsync
├── Roll6.Infra/Repository/TurnRepository.cs, ChatReadRepository.cs
├── Roll6.Infra/AppServices/S3ImageStorageAppService.cs    # DeleteAsync
├── Roll6.Infra/Context/Roll6Context.cs + Migrations/*_AddCampaignChat.cs
├── Roll6.DTO/Chat/*.cs, Realtime/TableEventType.cs
├── Roll6.API/Controllers/ChatController.cs                # NOVO
├── Roll6.Application/Startup.cs
├── Roll6.Mcp/Tools/ChatTools.cs, TurnTools.cs (textos), Roll6Guide.cs
└── Roll6.Tests/…
database/migrations/041-campaign-chat.sql, database/roll6.sql

frontend/src/
├── types/chat.ts, Services/chatService.ts, Contexts/ChatContext.tsx, hooks/useChat.ts     # NOVOS
├── lib/chatItems.ts, lib/layoutMode.ts, lib/audioFormat.ts (+ testes)                     # NOVOS
├── hooks/useMapRegionSize.ts                                                              # NOVO
├── components/chat/{ChatPanel,ChatMessageList,ChatItem,ChatComposer,AudioRecorder,ImageLightbox}.tsx  # NOVOS
├── components/menu/LayoutToggle.tsx, components/ui/icons.tsx
├── pages/MainPage.tsx, styles/app.css
├── components/map/MapControls.tsx, Contexts/MapEditorContext.tsx, components/map/GridSizeFooter.tsx
├── (removidos) components/turns/TurnConsole.tsx, TurnConsoleModal.tsx, TurnLogModal.tsx, hooks/useTurnHistory.ts
├── types/realtime.ts, main.tsx, Contexts/AuthContext.tsx (roll6:layout no logout)
└── i18n/locales/pt-BR.json
```

**Structure Decision**: aplicação web existente. O `CLAUDE.md` atualiza os bullets de turnos (016/024/027/028/030: o registro do turno **é** o chat; console e janela removidos), ganha bullets de chat (backend e frontend) e de layout, e a entrada em *Recent Changes*.

## Complexity Tracking

Sem violações da constituição.
