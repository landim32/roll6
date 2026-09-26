# Quickstart: Status e Ficha do Personagem por Campanha

## Preparar

```bash
cd backend
dotnet build Roll6.sln
dotnet test
dotnet ef database update --project Roll6.Infra --startup-project Roll6.API   # aplica MoveCharacterStatusToCampaign
dotnet run --project Roll6.API

cd ../frontend
npm test
npm run lint
npm run dev
```

Contas: **Mestre** (dono da campanha C) e **Jogador A** e **Jogador B**, com personagens aprovados em C.

## Migração (US3, SC-004)

1. Antes de aplicar a migration, anote um personagem com status "ferido" já aprovado em C.
2. Depois: no painel de C, abra o card dele → área "Nesta campanha" mostra Status "ferido"; a aba
   "Ficha da campanha" tem a mesma ficha do personagem.

## Mestre só edita a participação (US1)

1. Mestre, no mapa de C, clica no lápis do card do personagem do Jogador A.
2. Nome, imagem, totais e movimento aparecem só leitura; não há aba "Ficha".
3. Muda vida atual, Status = "envenenado", acrescenta uma linha na "Ficha da campanha"; salva → toast.
4. Jogador A abre o próprio personagem pelo lápis: aba "Ficha" (original) inalterada; "Ficha da
   campanha" e Status com o que o mestre gravou.
5. Com o token do mestre, `PUT /api/character/{idDoPersonagemDeA}` → **403**.

## Cópia da ficha (US2)

1. Jogador A cria personagem com ficha "Força 3" e pede acesso a C; mestre aprova.
2. Abrir o card: "Ficha da campanha" = "Força 3", Status vazio.
3. Jogador A muda a ficha original para "Força 4" → "Ficha da campanha" continua "Força 3".
4. Mestre remove o personagem da campanha e o aprova de novo → ficha da campanha = "Força 4", status
   vazio, vida/energia nos totais.

## Visualização por outro jogador

1. Jogador B vê o ícone de olho no card do personagem de A (não o lápis).
2. Abre: tudo só leitura (Status, ficha da campanha renderizada), botão "Fechar" apenas.
3. Com o token de B, `PUT /api/campaigncharacter/{id}` da participação de A → **403**;
   `GET /api/campaigncharacter/{id}` → 200 com `sheet`.

## Status fora da campanha

1. "Incluir Personagem" e a edição pelo dono não têm mais o campo Status nos dados do personagem.
2. Status de 261 caracteres na área "Nesta campanha" → toast de limite, nada salvo.
