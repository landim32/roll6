# Quickstart: validar o chat unificado (041)

## Automático

```bash
cd backend && dotnet build Roll6.sln && dotnet test
cd ../frontend && npm run lint && npm test && npm run build
```

- **Domínio** (`TurnTests`): as fábricas Text/Image/Audio/TurnFinished validam por tipo, e `Delete` sabe quem apaga o quê.
- **Chat** (`ChatServiceTests`):
  - acesso de fora → 403; identidade: personagem de outro → 403, jogador sem personagem → 403, mestre com `null` → ok;
  - página por cursor (`before`/`after`) sem repetir, campos estruturados de movimento e mudança, `text` igual à linha do `TurnSummary`;
  - não lidas sem contar as próprias, e `read` que não volta; apagar devolve `deleted`;
  - eventos `chat.message` e `chat.deleted`.
- **Regras de turno** (`TurnServiceTests`, `MapTokenServiceTests`):
  - continuam verdes, e a conversa **não** aparece no estado, no resumo, nos dados, na narração, no histórico nem nos pendentes;
  - finalizar, processar e `set_current` gravam ou removem divisores;
  - o CRUD admin recusa os tipos novos.
- **Exclusões**: excluir a campanha apaga `chat_reads`; excluir o personagem apaga os tipos 1–5 e anula `character_id` na conversa.
- **Áudio**: WebM/MP4/Ogg aceitos; outro tipo ou > 5 MB → 400.
- **MCP**: `McpCoverageTests` (89/90), `McpRouteParityTests`, `McpDescriptionTests`.
- **Frontend**:
  - `lib/chatItems.test.ts`: mesclar, reconciliar o intervalo de turno, agrupar discretas, contar não lidas, formatar linhas;
  - `lib/layoutMode.test.ts`, `lib/audioFormat.test.ts`.

## Migração (homolog)

1. Antes de aplicar, anotar a saída de `get_turn_summary` de dois turnos antigos.
2. Aplicar `AddCampaignChat` (ou `041-campaign-chat.sql`). O resumo dos mesmos turnos sai idêntico, e o chat mostra todo o registro antigo com divisores entre os turnos.

## Manual (mestre + jogador + celular, com banco)

1. O jogador, no modo dividido, escreve e a mensagem chega em até 2 s, com a foto e o nome do personagem.
2. O jogador move a peça e age pelo **Ação** do chat, no modo Chat. Aparecem as linhas discretas e o balão no mapa (conferir voltando ao mapa), e ele deixa de ser pendente em "Finalizar turno".
3. O mestre muda a vida de alguém e, pela IA, processa o turno com narração. Aparecem a linha discreta, a narração em destaque e o divisor "Turno N finalizado".
4. "Resetar turno" numa peça: o movimento e a ação somem do chat e a peça volta.
5. Com o chat escondido, chegam 3 mensagens: aparecem o contador e a marca "Novas mensagens".
6. No modo dividido, as interações do mapa funcionam e nada fica coberto. No modo Chat, o mapa some e volta com o mesmo zoom e câmera.
7. No celular: o teclado não cobre o campo; foto da câmera e áudio de 20 s tocam no Android, no iPhone e no computador.
8. Apagar a própria mensagem e, como mestre, a de outro e uma narração: aparece "Mensagem apagada", e a narração some de `get_turn_narration`.
9. O console de narrações e a janela "Turno N" não existem mais.
