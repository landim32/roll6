# Quickstart: validar o Deslocamento (037)

## Automático

```bash
cd backend && dotnet build Roll6.sln && dotnet test
cd ../frontend && npm run lint && npm test && npm run build
```

Testes que devem existir/passar:

- `CampaignCharacterTests`: `ResetFrom` copia `Move` → `CurrentMove`; `ChangeMove` recusa negativo (400 `currentMove`), recusa fora de
  Approved (409), devolve false quando igual.
- `CampaignCharacterServiceTests`: dono altera; mestre altera; terceiro → 403; `currentMove` null mantém; diff `currentMove` gera
  `CharacterUpdate`.
- `MapTokenServiceTests`: jogador com `CurrentMove = 1` → custo 2 recusado, custo 1 aceito; mestre sem limite; `MapTokenInfo.Move` da
  peça de personagem = `CurrentMove`.
- `CharacterServiceTests`: mudar `Move` chama `FollowMoveAsync(id, antigo, novo)`; sem mudança, não chama.
- `TurnServiceTests` (processing): `currentMove` no lote grava e registra; negativo → erro `characters[0].currentMove` e nada gravado.
- `TurnSummaryTests`: "Deslocamento de 5 para 1".
- `McpCoverageTests`/`McpRouteParityTests`/`McpDescriptionTests` inalterados e verdes.
- `campaignCharacterForm.test.ts`: validação e `toCampaignUpdate` com `currentMove`.

## Manual (homolog)

1. Aplicar a migração (`dotnet ef database update` ou startup) e conferir que participações existentes têm `current_move` = Movimento.
2. Como mestre, abrir o card de um personagem (Movimento 5) → Deslocamento 5 → mudar para 1 → Salvar.
3. Como o jogador dono, Mover a peça: contador "x/1", 2 hexes em vermelho; gravar 1 hex funciona.
4. Como o dono, mudar o Deslocamento para 2 → o Mover passa a "x/2".
5. Como outro participante aprovado (olho), o campo aparece só leitura.
6. Abrir "Turno N" → resumo mostra "Deslocamento de 5 para 1" com o autor.
7. Como dono, mudar o Movimento da ficha de 5 para 6: numa campanha sem ajuste o Deslocamento vira 6; na ajustada fica.
8. Em outra campanha do mesmo personagem, o Deslocamento não mudou nos passos 2–4.
