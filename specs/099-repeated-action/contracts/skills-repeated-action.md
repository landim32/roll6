# Contract: repeated action in the table skills (099, files only)

## `processar_turno.py`

- `acoes[]` items gain `repetida: "declarada" | "inicio" | None` (from `entry.repeated`).
- Characters and NPCs gain `repeticao: str | None` (from `get_turn_data` `repeatedAction`).
- Output:

```text
    AÇÃO (repetida): Enquanto houver inimigos vivos, ataco com o machado…
    REPETIÇÃO ATIVA: Enquanto houver inimigos vivos, ataco com o machado…
      → ao fechar, se o objetivo foi cumprido: clearRepeatedAction: true neste personagem
```

## `processar-turno/SKILL.md` §1d "Ação repetida (099)"

- A repeated action is a **standing order** from the player: resolve it like any declaration this turn.
- Judge, with the turn's result, whether its stated goal is met (the named target died or fled, no enemy left, the
  condition it names ended). If so: `clearRepeatedAction: true` for that actor in `process_turn` and one sentence in the
  narration ("Com o último orc caído, Urzog baixa o machado."). If unsure, keep it.
- The master approves it like the rest of the batch (local skill); the GM decides alone.

## `gm/SKILL.md`

- Same rule in §4/§5; a turn of only automatic repeated actions never reaches the GM (Q1 = B), so every GM run has at
  least one fresh declaration.
