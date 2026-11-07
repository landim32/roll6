# Data Model: 110-pwa-update-notice

Nada no banco. Estado em memória da aba.

## Versão

| Onde | Forma |
|---|---|
| Bundle | `__APP_VERSION__: string` (definido no build; `'dev'` em `npm run dev`) |
| Publicado | `/version.json` → `{ "version": "abc1234-20261107183000" }` |

`isNewVersion(current, published)` = `published` é uma string não vazia e diferente de `current`.

## Estado do aviso (`UpdateContext`)

```text
hidden ──versão nova detectada──▶ visible ──"Depois"──▶ snoozed(until = agora + 30 min)
   ▲                                │  ▲                     │
   │                                │  └─prazo vencido ou ───┘
   │                                │    aba volta a ficar visível
   └──────── reload ◀── "Atualizar" (sem pendências, ou confirmado)
```

`shouldShowNotice({ available, snoozedUntil, now })` = `available && (snoozedUntil === null || now >= snoozedUntil)`.

## Alterações pendentes (`lib/pendingChanges`)

| Campo | Regra |
|---|---|
| `key` | nome da fonte (`map-draft`, `library-map`, `leave-guard:{n}`, `chat-composer`) |
| `dirty` | `true` enquanto houver algo não salvo |
| `warnOnUnload` | se o navegador deve perguntar ao fechar/recarregar (padrão `true`; o chat usa `false`) |

Funções: `setPending(key, entry)`, `clearPending(key)`, `hasPending()`, `allowUnload()`, `unloadAllowed()`,
`resetPendingForTests()`.
