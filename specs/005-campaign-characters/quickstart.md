# Quickstart: Personagens nas Campanhas

**Feature**: 005-campaign-characters

## Banco

```bash
cd backend
dotnet ef database update --project Roll6.Infra --startup-project Roll6.API
```

Aplica `AddCampaignOpenAndCharacters` (`campaigns.open` e tabela `campaign_characters`).

## Testes

```bash
cd backend
dotnet test --filter "FullyQualifiedName~CampaignCharacter"
dotnet test --filter "FullyQualifiedName~CampaignServiceTests"
```

## Validação manual (dois usuários: mestre M e jogador J)

1. M cria campanha aberta A e fechada F; J lista campanhas → vê A e F com `ownerName` de M.
2. J cria personagem P1 e pede acesso a A → status 3 (Approved).
3. J pede acesso a F com P1 → 2 (RequestedAccess); M aprova → 3.
4. J cria P2, pede acesso a F → 2; M recusa → 4; J pede de novo → 409; M convida P2 → 1.
5. J lista `/campaigncharacter/invites` → vê P2; aceita → 3.
6. M convida P3 de J; J recusa → 4.
7. M lista `/campaign/{F}/character` → todos os status; J lista → só os aprovados.
8. J (aprovado em F) lista mapas de F e tokens de um mapa → 200; tenta `PUT /maptoken/{id}` →
   403. Um terceiro usuário sem participação → 403 ao listar mapas.
9. M exclui P1 de J? Não pode (403). J exclui P1 → participações de P1 somem.
10. Bruno: pasta `CampaignCharacter`.
