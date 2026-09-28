# Data Model: Console de turnos (028)

Sem mudanças de banco.

## DTOs (`Roll6.DTO/Turn/TurnHistoryInfo.cs`)

- `TurnHistoryPageInfo { campaignId, currentTurn, items: TurnHistoryItemInfo[], nextBefore: int? }`
- `TurnHistoryItemInfo { turnNo, actions, finishedAt: DateTime? }` — `actions` = texto "## Ações" do resumo do turno.

## Repositório

`ITurnRepository.ListByCampaignTurnRangeAsync(long campaignId, int fromTurn, int toTurn)` — registros com
`fromTurn ≤ turn_no ≤ toTurn`, ordenados por turno, `created_at`, `turn_id` (índice `ix_turns_campaign_turn` já existe).

## Regras

- Itens = turnos `1..min(before, currentTurn) − 1`, do maior para o menor, no máximo `limit` (1–20, padrão 5).
- `nextBefore` = menor `turnNo` da página se > 1, senão `null`.
- Leitura: mestre ou participante aprovado (403 caso contrário); `before` < 1 → 400.

## Frontend (estado do hook)

`{ items: TurnHistoryItemInfo[], nextBefore: number | null, loading, error, done }`; merge por `turnNo` (sem duplicar),
sempre ordenado do maior para o menor.
