# Quickstart: validar metadados e favicon (040)

## Automático

```bash
cd backend && dotnet build Roll6.sln && dotnet test
cd ../frontend && npm run lint && npm test && npm run build
```

- `Roll6.Tests/Domain/Meta/PageMetaHtmlTests`: as tags esperadas para o mapa, a campanha e a genérica; o corte em palavra com "…" (70/200); o encoding de `<`, `"`, `&`; URLs absolutas a partir da base.
- `Roll6.Tests/Domain/Services/PageMetaServiceTests`: mapa existente → título e descrição corretos; mapa apagado ou slug inexistente → genérica; campanha com e sem mapa atual; modelo sem imagem → imagem da marca.
- `Roll6.Tests/Infra/PreviewImageRendererTests` (ou no domínio, se o renderer ficar atrás de interface): uma imagem 4000×1000 vira JPEG 1200×630 válido.
- `McpCoverageTests` com os dois endpoints em `EXCLUDED`, ainda 86/87.
- `frontend/src/lib/documentTitle.test.ts`: os quatro formatos.

## Manual local

1. Com `dotnet run --project Roll6.API`, abrir `http://localhost:5119/api/meta/head/map/{slug}`: o fragmento tem as tags. Abrir `/api/meta/image/map/{slug}.jpg`: aparece a imagem 1200×630.
2. `npm run dev`: a aba mostra "{mapa} — {campanha} | Roll6", troca junto com o mapa e mostra o favicon.

## Manual em homolog (nginx com SSI)

3. `curl -s https://{homolog}/map/{slug} | grep og:` mostra as tags do mapa. Com um slug inexistente, mostra as genéricas. Com a API parada, mostra o bloco padrão.
4. Validadores de prévia: o Sharing Debugger da Meta, que cobre o WhatsApp, e um teste colando o link numa conversa do WhatsApp mostram a imagem, o título e a descrição.
5. `/favicon.ico` e o atalho na tela inicial do celular mostram o símbolo.

## Produção (servidor)

6. Adicionar `ssi on;` ao `location /` do Roll6 no nginx compartilhado (veja `CLAUDE.md`), recarregar o nginx e repetir os passos 3 e 4.
