# Contract: /version.json

Arquivo estático gerado por `npm run build` em `dist/version.json` e publicado junto com o SPA.

```http
GET /version.json?t=1730000000000
Cache-Control (resposta, homolog): no-cache
```

```json
{ "version": "abc1234-20261107183000" }
```

- `version`: string não vazia; muda a cada build. O bundle carrega o mesmo valor em `__APP_VERSION__`.
- O site busca com `cache: 'no-store'` e um `t` aleatório, então funciona mesmo atrás de um proxy que guarde arquivos.
- Arquivo ausente (404), corpo inválido ou falha de rede = "sem informação": nenhum aviso.
- **Publicação**: quem publica o SPA (homolog: imagem `web`; produção: a cópia do `dist/` para o nginx compartilhado) precisa
  incluir `version.json`. Nenhuma rota da API muda; nada no MCP.
