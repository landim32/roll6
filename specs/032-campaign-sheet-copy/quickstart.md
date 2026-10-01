# Quickstart: Ficha do personagem por campanha (texto e arquivo)

**Feature**: `032-campaign-sheet-copy` · **Plano**: [plan.md](./plan.md) · **Pesquisa**: [research.md](./research.md)
**Modelo**: [data-model.md](./data-model.md) · **Contratos**: [contracts/](./contracts/)

Como rodar, gerar a migration e verificar cada história da spec.

---

## 1. Ambiente

Pré-requisitos: .NET 8 SDK, Node 18+, um PostgreSQL alcançável e credenciais S3 (as URLs de imagem são
pré-assinadas). **Não rodar `docker`/`docker compose` na máquina de dev** (constituição, Princípio II).

```bash
# backend — a partir de C:\repos\Roll6
cd backend
dotnet build Roll6.sln
dotnet run --project Roll6.API                    # Swagger em /swagger (Development)

# frontend — em outro terminal
cd frontend
npm install
npm run dev                                       # http://localhost:5173
```

`frontend/.env.local` mantém `VITE_API_URL` **vazio** para a SPA chamar `/api` na própria origem; o dev server do
Vite faz proxy para `VITE_API_PROXY` (5119 = `dotnet run`). Nunca apontar `VITE_API_URL` para a API de homolog.
Configuração local do backend: copiar `backend/Roll6.API/appsettings.Template.json` para
`appsettings.Development.json` (git-ignored) e preencher.

---

## 2. Gerar e aplicar a migration

```bash
cd backend
dotnet ef migrations add AddCampaignSheetFile --project Roll6.Infra --startup-project Roll6.API
# editar a migration gerada: acrescentar o migrationBuilder.Sql(...) do backfill (research.md, D5)
dotnet ef database update --project Roll6.Infra --startup-project Roll6.API
```

Artefatos obrigatórios depois:

```bash
# SQL idempotente por feature, no padrão de database/migrations/031-posture-footprint.sql
dotnet ef migrations script 20260929215843_AddPostureAndTokenSpaces <timestamp>_AddCampaignSheetFile --idempotent --project Roll6.Infra --startup-project Roll6.API
#   → gravar em database/migrations/032-campaign-sheet.sql e acrescentar o cabeçalho manual

# esquema completo — regenerar e RECOLOCAR o cabeçalho de 3 linhas
dotnet ef migrations script --idempotent --project Roll6.Infra --startup-project Roll6.API -o ../database/roll6.sql
```

**Conferir no banco**:

```sql
\d campaign_characters                          -- sheet_file | character varying(260) | nullable
SELECT cc.campaign_character_id, cc.status, length(cc.sheet), cc.sheet_file,
       c.sheet_file AS original_file
FROM campaign_characters cc JOIN characters c ON c.character_id = cc.character_id
LIMIT 20;
```

Critérios da migração (FR-027…FR-031, SC-007, SC-008, SC-010):
- nenhuma participação com `sheet IS NULL` quando o personagem tem `sheet`;
- participação que tinha notas → o texto termina com a seção `## Anotações anteriores da campanha` e as notas
  aparecem **inteiras**;
- nenhum `sheet` com mais de 20.000 caracteres;
- `cc.sheet_file = c.sheet_file` onde o personagem tem arquivo;
- `characters.sheet` e `characters.sheet_file` **idênticos** aos de antes (FR-022/SC-010).

---

## 3. Testes automatizados

```bash
cd backend
dotnet test                                                                       # tudo
dotnet test --filter "FullyQualifiedName~CampaignCharacterServiceTests"           # uma classe
dotnet test --filter "FullyQualifiedName~CampaignCharacterTests.ChangeSheetFile"  # um teste
dotnet test --filter "FullyQualifiedName~McpCoverageTests"                        # contagens 86/87
```

```bash
cd frontend
npm test                                     # vitest run
npm test -- campaignCharacterForm            # um arquivo
npm run lint
npm run build
```

> O Vitest do frontend usa `environment: 'node'` e coleta **apenas** `src/**/*.test.ts` — não há teste de
> componente. A cobertura nova fica em `frontend/src/lib/campaignCharacterForm.test.ts`.

Lista dos testes a alterar/criar: [data-model.md §7](./data-model.md#7-testes-de-modelo-afetados).

---

## 4. Verificação manual por história

Prepare dois usuários (um mestre com campanha, um jogador dono de personagem) em duas sessões do navegador.

### US1 — a campanha recebe uma cópia (P1)

1. Como jogador: crie um personagem com ficha em texto `Força 3` e anexe um PDF ("Incluir Personagem" → abas
   Ficha / Ficha em arquivo).
2. Faça-o entrar na campanha do mestre (ou aceite o convite / tenha o pedido aprovado).
3. Abra o card no painel → aba **Ficha da Campanha**: deve mostrar `Força 3`; aba **Ficha em arquivo**: o mesmo PDF.
4. Como jogador, edite a ficha **original** para `Força 4` e troque o arquivo por uma imagem.
5. Reabra o card na campanha: continua `Força 3` com o **PDF** antigo (sem sincronização — FR-004, FR-006).
6. Abra o mesmo personagem em outra campanha: ficha independente (US4-AS1).

✔ SC-001 (cópia idêntica na entrada) · SC-003 (independência) · SC-004 (arquivo idêntico byte a byte)

### US2 — o mestre edita a cópia sem tocar no original (P1)

1. Como **mestre** (não dono), clique no lápis do card do jogador.
2. Aba **Ficha da Campanha**: edite o markdown e salve → toast, e o valor persiste ao reabrir.
3. Aba **Ficha em arquivo**: envie outro PDF e salve → o arquivo da campanha troca; o do personagem **não**.
4. Confira que nome, foto, totais e movimento aparecem **somente para leitura**, e que não existe nenhuma aba com
   a ficha original editável.
5. Como jogador, abra o Modal A (lista "Selecionar Personagem" → lápis): ficha original e arquivo intactos.
6. Tente pela API, como mestre, `PUT /api/character/{id}` → **403** `"Apenas o dono pode acessar este personagem."`
7. Tente `PUT /api/campaigncharacter/{id}` numa participação **não aprovada** → **409**.
8. Envie `sheetFile` inválido (`"ficha.pdf"`) → **400** com erro na chave `sheetFile`.
9. Envie um `.docx` ou um arquivo > 10 MB em `POST /api/document` → **400**, nada salvo.

✔ SC-002 (100% das tentativas do mestre sobre o original recusadas) · SC-006 (troca em ≤ 3 passos)

### US3 — o dono edita a original num modal próprio (P1)

1. Combo "Personagem atual" → **Selecionar Personagem**: cada personagem tem um **lápis** antes do ícone de
   transferir, com `title`/`aria-label` "Editar {nome}".
2. Clique no lápis: abre o modal do personagem com Dados / Ficha / Ficha em arquivo — **sem** nenhuma seção de
   campanha.
3. Mude nome, ficha e arquivo; salve → toast "{nome} atualizado.".
4. Reabra pela lista: alterações persistidas.
5. Abra o card do mesmo personagem numa campanha: vida atual, energia atual, status, postura e ficha da campanha
   **não mudaram** (FR-008).
6. Reduza a vida total para baixo do valor atual de uma participação → o valor atual daquela participação desce
   junto (US3-AS6, `ClampVitalsAsync`).
7. **Não** remova o token nem o arquivo ao salvar uma edição qualquer — conferir depois de salvar que
   `tokenId` e `sheetFile` continuam (armadilha 1 de D7).
8. "Incluir Personagem" pelo combo continua criando e entrando na campanha atual.

✔ SC-007 (≤ 3 passos pelo combo, sem estar numa campanha)

### US4 — a tela da campanha mostra a ficha da campanha (P2)

1. Com original `Força 3` e campanha `Força 5`, abra o card como **mestre**, como **dono** e como **outro
   participante aprovado**: os três veem `Força 5` e nenhum vê `Força 3` em nenhuma aba.
2. Remova o arquivo da campanha (aba Ficha em arquivo → Remover → Salvar): a área passa a mostrar
   **"Não há ficha em arquivo nesta campanha."**, mesmo que o personagem tenha arquivo (FR-025) — e **não** mostra
   o arquivo original.
3. Como outro participante aprovado (ícone de olho), as duas abas de ficha ficam em leitura e **não há botão de
   salvar** (FR-024).
4. Usuário fora da campanha: `GET /api/campaigncharacter/{id}` → **403**.

✔ SC-005 (ficha da campanha em 100% das aberturas) · SC-008/SC-009 (acesso)

### US5 — independência entre campanhas (P3)

1. Mesmo personagem aprovado em duas campanhas; altere texto e arquivo na campanha A.
2. Campanha B e ficha original inalteradas.
3. Remova o personagem da campanha A e aprove-o de novo → vida, energia, status e postura reiniciados **e** a
   ficha (texto e arquivo) recopiada do personagem (US5-AS3/AS4).
4. Transfira o personagem para outro usuário (`transfer_character` / modal de transferência) → as fichas das
   campanhas permanecem (US5-AS5).

✔ SC-003

---

## 5. Verificação por MCP e API

```bash
# MCP (gateway fino em /mcp, porta 5129 em dev)
dotnet run --project backend/Roll6.Mcp
```

Com uma chave de API (`POST /api/apikey`), via assistente:

| Chamada | Esperado |
|---|---|
| `get_participation` | `sheet` = ficha **da campanha**; `sheetFile`/`sheetFileUrl`/`sheetFileType` = arquivo **da campanha**; `characterSheet` = original (leitura) |
| `update_participation` **sem** `sheetFile` | arquivo da campanha **mantido** (não apagado) |
| `update_participation` com `sheetFile: ""` | arquivo da campanha removido |
| `update_participation` como mestre, tentando mudar o personagem | impossível — a ferramenta não tem esses parâmetros |
| `update_character` como mestre (chave do mestre) | **403** |
| `get_turn_summary` do turno em que a ficha mudou | linha com "Ficha da campanha alterada" (e "Ficha em arquivo alterada" se o arquivo trocou), **sem** o conteúdo |
| turnos **anteriores** à 032 | continuam legíveis, agora com o rótulo novo (a chave `notes` foi preservada — D6) |

`roll6://guide` deve descrever a ficha da campanha como cópia feita na entrada, não como anotações.

Bruno (coleção de smoke tests manuais): `bruno/CampaignCharacter/Get detail.bru`,
`bruno/CampaignCharacter/Update campaign values.bru`, `bruno/Character/Update.bru`,
`bruno/Image/Upload sheet file (PDF).bru`.

---

## 6. Tempo real

Duas sessões na mesma campanha: salvar a ficha da campanha em uma deve disparar na outra `party.changed`
(recarrega o painel), `mapTokens.changed` (as peças mostram os dados da participação) e `turn.changed` quando
houver entrada de turno. Sem conexão SignalR, o poll de 15 s cobre.

`MapTokenInfo.sheet` das peças do mapa passa a exibir a **ficha da campanha** em vez das notas
(`MapTokenService.cs:349`) — conferir no menu/tooltip da peça.

---

## 7. Definição de pronto

- [ ] `dotnet build Roll6.sln` sem aviso novo · `dotnet test` verde (incluindo `McpCoverageTests` 86/87 inalterado)
- [ ] `npm run lint` · `npm test` · `npm run build` verdes
- [ ] Migration aplicada; `database/migrations/032-campaign-sheet.sql` e `database/roll6.sql` (com cabeçalho) atualizados
- [ ] Os cinco fluxos da seção 4 verificados manualmente nos dois perfis
- [ ] Nenhum dado de `characters` alterado pela migração (SC-010)
- [ ] Textos novos só em `pt-BR.json`, nada hardcoded em componente; ícones só de `components/ui/icons.tsx`
- [ ] Casing de diretórios respeitado nos imports (`Contexts/`, `Services/` maiúsculos; `hooks/`, `types/`, `lib/`, `components/` minúsculos)
- [ ] `CLAUDE.md` atualizado pelo script de contexto (seção "Active Technologies" / "Recent Changes")
