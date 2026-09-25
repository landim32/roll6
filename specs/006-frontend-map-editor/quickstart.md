# Quickstart: Frontend — Login e Editor de Mapa

**Feature**: 006-frontend-map-editor

## Pré-requisitos

- Node 22+ e npm.
- Backend rodando (`cd backend && dotnet run --project Roll6.API`), banco com as
  migrações aplicadas e credenciais do Spaces para o upload de imagem.

## Configuração

`frontend/.env.local` (não versionado; modelo em `frontend/.env.example`):

```env
# Empty: the app calls /api on its own origin and the Vite dev server proxies it (no CORS).
VITE_API_URL=
# 5119 = backend with `dotnet run`; 5000 = API container of the homolog docker-compose
VITE_API_PROXY=http://localhost:5119
```

## Comandos

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc + vite build
npm run lint       # eslint
npm test           # vitest (hexGrid e utilitários)
npm test -- hexGrid          # um arquivo
```

## Roteiro de validação manual

1. Abrir `http://localhost:5173` → tela de login escura. Criar conta → entra no mapa (toast).
2. Recarregar → continua logado. Grid 20 × 20 vazia; rodapé "Grid 20 × 20".
3. Zoom in/out pelos botões; arrastar o fundo move a visualização.
4. "Campanha atual" → aba "Nova campanha": criar "Mesa teste" → vira a campanha atual (toast).
   "Buscar campanhas" mostra campanhas de outros usuários com o nome do dono.
5. "imagem+" → enviar um PNG → imagem sob a grid; botão "Salvar mapa" aparece.
6. Botão de ajuste → arrastar a imagem e a alça do canto; grid acompanha a área visível.
7. Rodapé → 12 × 9 → grid redesenhada.
8. "Salvar mapa" → pede nome → "Taverna" → toast; botão some. "Mapa atual" → "Mapas da campanha"
   mostra "Taverna 1"; "Meus mapas" mostra "Taverna".
9. Recarregar e abrir "Taverna" → imagem, ajuste e grid iguais.
10. Alterar a grid e tentar trocar de mapa → modal Salvar/Descartar/Cancelar.
11. Com outro usuário, "Buscar mapas" → abrir "Taverna", alterar e salvar → pede nome e cria uma
    cópia; o original não muda.
12. Derrubar o backend e salvar → toast de erro; alterações continuam na tela.
