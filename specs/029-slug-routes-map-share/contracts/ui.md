# UI contract — 029

## Rotas

| Path | Efeito |
|---|---|
| `/` | Como hoje: restaura `roll6:campaign`/`roll6:map`; depois o endereço passa a refletir o que abriu |
| `/campaign/:slug` | Seleciona a campanha; com acesso, segue o mapa atual dela (017); sem mapa, mesa vazia da campanha |
| `/map/:slug` | Seleciona a campanha do mapa e abre o mapa |
| `/login` | Depois do login volta para `state.from` (ou `/`) |

Erros: slug inexistente/apagado → toast `route.notFound`; sem acesso → toast `route.forbidden`; ambos `navigate('/', { replace: true })`.
Estado → URL sempre com `replace`; escolhas do usuário com push (voltar/avançar funcionam). Troca com alterações não salvas passa por `useUnsavedGuard`; cancelar devolve a URL ao que está aberto.

## TableSelect (substitui os dois `FakeSelect` de campanha e mapa no `TopMenu`)

```
┌ Mapa atual ───────────────┐
│ Estrada 1                 │   ← gatilho: mapa aberto (ou "Sem mapa")
│ Tormento Vil          ▾   │     campanha atual (ou "Escolha uma campanha")
└───────────────────────────┘
  Estrada 1                     → /map/estrada-1      (active quando aberto)
     → Tormento Vil             → /campaign/tormento-vil
  Arena 1                       → /map/arena-1
     → Teste                    → /campaign/teste
  Sem mapa ativo  (itálico)     → /campaign/teste-2
     → Teste 2                  → /campaign/teste-2
  ───────────────
  Outras campanhas…             → CampaignModal
  Mapas…                        → MapModal
```

- Engrenagem de configurações (mestre) continua logo depois do combo.
- Telefones: ocupa o lugar dos dois selects na segunda linha do menu.

## Notificação "Turno N finalizado" → TurnSummaryModal

- Título "Turno N"; corpo = narração(ões) do turno em `MarkdownView` (saneado); vazio → `turn.noNarration`.

## Botão Compartilhar (MapControls)

- Ordem: `+`, `−`, **Compartilhar** (`ShareIcon`, `title`/`aria-label` = `map.share`), imagem, redimensionar.
- Visível com mapa de campanha aberto; desabilitado com spinner enquanto gera.
- Com Web Share de arquivos: janela nativa com `roll6-<map-slug>.jpg` + texto.
- Sem: baixa o arquivo, copia o texto, toast `share.fallback` ("Imagem baixada e texto copiado — cole no WhatsApp").
- Falha: toast `share.error`; cancelamento: nada.

Texto (exemplo):

```
*Tormento Vil — Estrada 1*
Turno 7

*A ponte*
Os heróis atravessam a ponte e _Cedric_ tropeça.
- Ana perde 2 de vida
```

## Novas chaves i18n (pt-BR)

`menu.tableSelect`, `menu.noActiveMap`, `menu.noMapOpen`, `menu.otherCampaigns`, `menu.maps`, `route.notFound`, `route.forbidden`, `turn.noNarration`, `map.share`, `share.fallback`, `share.error`, `share.noCampaignMap`, `share.turn`.
