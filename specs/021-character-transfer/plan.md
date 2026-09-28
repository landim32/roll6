# Implementation Plan: Transferir personagem para outro usuário

**Branch**: `021-character-transfer` | **Date**: 2026-09-27 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/021-character-transfer/spec.md`

## Summary

O dono de um personagem informa o e-mail de outro usuário e confirma; o personagem passa a pertencer a esse
usuário na hora. Tudo o que depende do personagem (participações, vida/energia atuais, status, fichas da
campanha, peças nos mapas, registros de turno) já aponta para `character_id` — nunca para o dono —, e todas as
permissões de jogador são calculadas na hora a partir de `characters.user_id`. Por isso a transferência é
**uma única atualização condicional** de `characters.user_id` (`WHERE user_id = <dono atual>`), sem migração
e sem tocar em outras tabelas. Depois dela o serviço publica `party.changed` + `mapTokens.changed` nas
campanhas do personagem e tira o antigo dono do grupo de tempo real das campanhas em que ele ficou sem
acesso. Novo endpoint `POST /api/character/{id}/transfer` (`{ email }` → 204), nova ferramenta MCP
`transfer_character`, e no frontend um botão "Transferir" na lista "Selecionar personagem", que abre
`TransferCharacterModal` (e-mail + aviso + confirmação).

## Technical Context

**Language/Version**: C# 12 / .NET 8; TypeScript 5 / React 18
**Primary Dependencies**: ASP.NET Core 8, EF Core 9 + Npgsql, SignalR (017), ModelContextProtocol.AspNetCore (020); React, Bootstrap 5, i18next, sonner, Radix Dialog
**Storage**: PostgreSQL — nenhuma tabela ou coluna nova (só muda o valor de `characters.user_id`)
**Testing**: xUnit + Moq + FluentAssertions (`Roll6.Tests`, incluindo os testes de cobertura/paridade do MCP); Vitest no frontend
**Target Platform**: API Linux container + SPA no navegador
**Project Type**: web application (backend + frontend + gateway MCP)
**Performance Goals**: transferência em uma requisição, < 1 s; telas dos participantes atualizadas em ≤ 5 s (SC-004)
**Constraints**: tudo ou nada (FR-010); sem enumerar usuários (só e-mail exato); ClientSetNull/sem cascata
**Scale/Scope**: 1 endpoint, 1 método de repositório, 1 ferramenta MCP, 1 modal + 1 botão

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação |
|---|---|
| I. Skills de arquitetura | Nenhuma entidade nova; a mudança estende `Character` (DTO → Infra.Interfaces → Domain → Infra → API) seguindo o mesmo padrão que `dotnet-architecture` gerou. No frontend não há entidade nova; o serviço/contexto existentes ganham um método. ✅ |
| II. Stack fixa | .NET 8/EF Core/PostgreSQL; React + Bootstrap 5 + Context API + Fetch. ✅ |
| III. Case de diretórios | `Services/`, `Contexts/`, `hooks/`, `types/` inalterados. ✅ |
| IV. Convenções de código | `interface`, sem `enum` (constantes), textos via i18next, toasts `sonner`. ✅ |
| V. Banco | Sem migração; nenhuma cascata; update condicional via EF Core (`ExecuteUpdateAsync`). ✅ |
| VI. Autenticação | `[Authorize]` no endpoint; dono vindo do `sub`; aceita chave de API (FR-013). ✅ |
| VII. Grid hexagonal | Não se aplica (peças não se movem). ✅ |

Pós-design: sem violações; *Complexity Tracking* vazio.

## Project Structure

### Documentation (this feature)

```text
specs/021-character-transfer/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api.md
│   └── ui.md
└── tasks.md             # /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── Roll6.DTO/Character/CharacterTransferInfo.cs              # novo: { email }
├── Roll6.Infra.Interfaces/Repository/ICharacterRepository.cs # + TransferAsync(characterId, fromUserId, toUserId)
├── Roll6.Domain/
│   ├── Interfaces/ICharacterService.cs                       # + TransferAsync(userId, characterId, info)
│   └── Services/CharacterService.cs                          # regras, publicação, saída do hub
├── Roll6.Infra/Repository/CharacterRepository.cs             # ExecuteUpdateAsync condicional
├── Roll6.API/Controllers/CharacterController.cs              # POST {id}/transfer → 204
├── Roll6.Mcp/Tools/CharacterTools.cs                         # + transfer_character
└── Roll6.Tests/
    ├── Services/CharacterServiceTests.cs (ou arquivo novo CharacterTransferTests.cs)
    └── Mcp/…                                                 # cobertura/paridade já pegam a nova rota

frontend/src/
├── Services/characterService.ts                              # + transfer(id, email)
├── Contexts/CharacterContext.tsx                             # + transferCharacter
├── lib/transferForm.ts (+ .test.ts)                          # validação do e-mail
├── components/modals/TransferCharacterModal.tsx              # novo
├── components/modals/SelectCharacterModal.tsx                # botão "Transferir" por personagem
└── i18n/locales/pt-BR.json                                   # textos
```

**Structure Decision**: web application existente (`backend/` + `frontend/`); nenhuma pasta nova além do
modal e do módulo de validação.

## Complexity Tracking

Sem violações.
