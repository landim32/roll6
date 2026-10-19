# Hub contract change (092, `/hubs/animation`)

## `SendRequest(RequestInfo)` — new optional field

```json
{ "animationId": 10, "text": "faça um golpe de cima para baixo", "images": [], "modelName": "Orc Gordo",
  "content": { ... },
  "modelWeapons": ["Machado (mão direita)", "Escudo redondo (mão esquerda)"] }
```

- `modelWeapons` holds at most 5 strings of up to 120 characters each; otherwise the hub raises
  `HubException("invalid")`. When omitted or empty, nothing is added.
- The run's system prompt (`AnimationPromptContext`) gets one more line:
  `Armas do modelo: Machado (mão direita), Escudo redondo (mão esquerda) — elas acompanham as mãos e o corpo, mas não
  fazem parte do arquivo da animação.`

No other method or message changes; REST and MCP are unchanged.
