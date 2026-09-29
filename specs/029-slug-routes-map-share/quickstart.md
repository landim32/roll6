# Quickstart — 029

1. Backend: `cd backend && dotnet ef database update --project Roll6.Infra --startup-project Roll6.API` (aplica `AddSlugs`; conferir `select name, slug from campaigns; select name, slug from maps;`), `dotnet test`, `dotnet run --project Roll6.API`.
2. Frontend: `cd frontend && npm test && npm run lint && npm run build && npm run dev`.
3. Combo: abrir o combo do menu → uma entrada por campanha (mapa atual em cima, `→ campanha` embaixo). Clicar no mapa → URL `/map/<slug>`; na campanha → `/campaign/<slug>`.
4. Rotas: recarregar em `/map/<slug>`; abrir o link numa aba anônima → login → volta ao mapa; slug inválido → aviso e `/`; voltar/avançar do navegador.
5. Seguir o mestre: com dois navegadores (mestre e jogador), o mestre troca de mapa → URL do jogador muda.
6. Notificação: processar um turno com narração (`process_turn` via MCP ou `POST /api/campaign/{id}/turn/process`) → notificação → só a narração formatada.
7. Compartilhar: no celular (Chrome Android/Safari iOS, servido por HTTPS) tocar em Compartilhar → WhatsApp com imagem + texto; no desktop → download + texto copiado.

## Infra

- **CORS do bucket** (DigitalOcean Spaces): regra `GET`/`HEAD` para as origens do app (`https://roll6.site`, homolog e `http://localhost:5173`), sem ela as imagens do fundo/peças são omitidas da imagem compartilhada.
- **nginx de produção** (compartilhado): `location / { try_files $uri $uri/ /index.html; }` para `/campaign/*` e `/map/*` (o `frontend/nginx.conf` do homolog já faz isso).
