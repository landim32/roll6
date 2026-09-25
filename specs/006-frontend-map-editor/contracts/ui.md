# UI Contract: Frontend — Login e Editor de Mapa

**Feature**: 006-frontend-map-editor

## Rotas

| Rota | Tela | Acesso |
|---|---|---|
| `/login` | `LoginPage` (entrar / criar conta) | público; logado → redireciona para `/` |
| `/` | `MainPage` (mapa + menu + controles + rodapé) | só logado; senão → `/login` |

## Layout da `MainPage`

```text
┌───────────────────────────────────────────────────────────────┐
│ TopMenu: [Campanha atual ▾] [Mapa atual ▾] [Salvar mapa]* [Sair]│
├───────────────────────────────────────────────────────────────┤
│                                                               │
│                MapCanvas (imagem + grid, zoom/pan)            │
│                                                   ┌────────┐  │
│                                                   │  +  −  │  │
│                                                   │ imagem+│  │
│                                                   │ ⤡ ajuste│  │
│                                                   └────────┘  │
├───────────────────────────────────────────────────────────────┤
│ Footer: Grid 20 × 20 (clicável)                                │
└───────────────────────────────────────────────────────────────┘
* só quando o mapa não está salvo e o usuário pode editar
```

## Modais

| Modal | Abertura | Abas / conteúdo | Resultado |
|---|---|---|---|
| `CampaignModal` | clique em "Campanha atual" | Minhas campanhas · Buscar campanhas (nome, dono, aberta/fechada) · Nova campanha (nome, aberta) | define a campanha atual |
| `MapModal` | clique em "Mapa atual" | Mapas da campanha · Meus mapas · Buscar mapas (nome/descrição) | carrega o mapa escolhido (com guarda de não salvo) |
| `ImageModal` | botão "imagem+" (com guarda) | Enviar imagem (arquivo) · Buscar mapas (reaproveita a imagem) | troca a imagem do rascunho |
| `GridSizeModal` | clique no rodapé | colunas, linhas (1–500) | altera o rascunho |
| `SaveMapModal` | salvar mapa novo ou de outro usuário | nome (obrigatório), descrição | cria o modelo (e o mapa na campanha) |
| `UnsavedChangesModal` | trocar de mapa / imagem+ com rascunho sujo | Salvar · Descartar · Cancelar | continua ou interrompe a ação |

Todos usam o `Modal` base (Radix Dialog, estilo Bootstrap escuro). Nenhum `alert`/`confirm`/`prompt`.

## Toasts (sonner, tema escuro)

Sucesso: login, conta criada, campanha criada/escolhida, mapa carregado, imagem enviada, mapa
salvo. Erro: qualquer falha da API (mensagem do `ProblemDetails` — `detail`, ou o primeiro item de
`errors`), sessão expirada, imagem inválida.

## Endpoints consumidos

| Ação | Endpoint |
|---|---|
| Entrar / criar conta | `POST /api/user/login`, `POST /api/user` |
| Minhas campanhas | `GET /api/campaign?mine=true&page&pageSize` **(novo parâmetro)** |
| Buscar campanhas | `GET /api/campaign?search&page&pageSize` |
| Nova campanha | `POST /api/campaign` |
| Campanha atual (recarregar) | `GET /api/campaign/{id}` |
| Mapas da campanha | `GET /api/campaign/{id}/map` |
| Meus mapas | `GET /api/mapmodel?mine=true&page&pageSize` **(novo parâmetro)** |
| Buscar mapas | `GET /api/mapmodel?search&page&pageSize` |
| Abrir mapa | `GET /api/mapmodel/{id}` (e `MapInfo` da lista da campanha) |
| Enviar imagem | `POST /api/image` (multipart) |
| Salvar mapa próprio | `PUT /api/mapmodel/{id}` |
| Salvar novo / cópia | `POST /api/mapmodel` e, com campanha própria, `POST /api/map` |

## Delta no backend

`GET /api/campaign` e `GET /api/mapmodel` aceitam `mine=true` para listar só itens do usuário
autenticado. Sem o parâmetro, nada muda.
