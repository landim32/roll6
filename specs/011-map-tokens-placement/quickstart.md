# Quickstart: Tokens no Mapa

## Preparar

```bash
cd backend
dotnet build Roll6.sln && dotnet test
dotnet ef database update --project Roll6.Infra --startup-project Roll6.API   # AddCharacterTokenAndMapTokenParticipation
dotnet run --project Roll6.API

cd ../frontend
npm test && npm run lint
npm run dev
```

Contas: **Mestre** (campanha C com um mapa de campanha aberto) e **Jogador** com dois personagens
aprovados em C: **Aria** (com token) e **Bram** (sem token).

## US1 — Ver tokens e destaque

1. Mestre abre o mapa de C; passa o mouse: o hex sob o cursor fica azul claro; com zoom e pan o
   destaque continua no hex certo; fora da grid some.
2. Jogador abre o mesmo mapa: vê o destaque e os tokens, sem menu ao clicar.

## US2 — Arrastar personagem

1. Mestre arrasta o card de Aria para um hex vazio → token aparece; F5 → continua lá.
2. Arrasta Aria para outro hex → move (não duplica).
3. Arrasta Bram → abre o modal "Escolher token de Bram"; escolhe um token → aparece no hex; o card /
   cadastro de Bram (visto pelo Jogador) passa a ter esse token.
4. Arrasta qualquer card para um hex ocupado → aviso, nada muda.
5. Jogador tenta arrastar um card → não é arrastável.

## US3 — Menu do hex

1. Mestre clica num hex vazio → "Incluir token" → escolhe um token → NPC aparece.
2. Clica no NPC → "Alterar token" → escolhe outro → imagem muda, mesmo hex.
3. Arrasta o mapa (pan) e solta → nenhum menu abre.

## US4 — Modal de tokens

1. Aba "Buscar tokens": grade de 3 colunas; buscar "gob" filtra; paginação funciona.
2. Aba "Incluir token": sem nome → toast de erro; com nome + imagem → salvo e usado na ação.

## US5 — Token do personagem

1. Jogador edita Aria → "Escolher token" → escolhe → salva; arrastar Aria (mestre) usa esse token.
2. Tentar excluir (API `DELETE /api/token/{id}`) um token usado por Aria → 409.

## Integridade

1. Mestre remove Bram da campanha → o token do mapa de Bram some; nenhuma falha.
