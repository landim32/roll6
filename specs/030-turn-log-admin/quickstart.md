# Quickstart: Administração do log de turnos (030)

Pré-requisitos: API rodando (`cd backend && dotnet run --project Roll6.API`), um usuário mestre de uma campanha
(`{cid}`) com alguns turnos finalizados e um token/chave (`-H "X-Api-Key: r6_…"`).

## 1. Corrigir a narração de um turno

```bash
# achar o registro
curl -s -H "X-Api-Key: $KEY" http://localhost:5119/api/campaign/$CID/turn/3
# alterar o texto
curl -s -X PUT -H "X-Api-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"description":"O grupo atravessou a ponte ao amanhecer."}' http://localhost:5119/api/turn/$TURN_ID
# conferir
curl -s -H "X-Api-Key: $KEY" "http://localhost:5119/api/campaign/$CID/turn/narration?turnNo=3"
```

Esperado: mesma `turnId`, `createdAt` e autor; a narração do turno 3 traz o novo texto.

## 2. Incluir registros em um turno antigo

```bash
curl -s -X POST -H "X-Api-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"campaignId":'$CID',"turnNo":2,"turnType":3,"characterId":'$CHAR',"description":"Cedric sofre 4 de dano."}' \
  http://localhost:5119/api/turn
curl -s -X POST -H "X-Api-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"campaignId":'$CID',"turnNo":2,"turnType":4,"characterId":'$CHAR',"changes":[{"field":"currentLife","before":"10","after":"6"}]}' \
  http://localhost:5119/api/turn
```

Esperado: 201; o resumo do turno 2 (`/turn/summary?turnNo=2`) mostra as duas linhas; a vida atual do personagem não
muda. `turnNo` maior que o atual → 400.

## 3. Definir o turno atual

```bash
# avançar
curl -s -X PUT -H "X-Api-Key: $KEY" -H "Content-Type: application/json" -d '{"turnNo":9}' \
  http://localhost:5119/api/campaign/$CID/turn/current
# voltar com registros posteriores → 409
curl -s -X PUT -H "X-Api-Key: $KEY" -H "Content-Type: application/json" -d '{"turnNo":4}' \
  http://localhost:5119/api/campaign/$CID/turn/current
# voltar descartando
curl -s -X PUT -H "X-Api-Key: $KEY" -H "Content-Type: application/json" -d '{"turnNo":4,"discardLaterEntries":true}' \
  http://localhost:5119/api/campaign/$CID/turn/current
```

Esperado: `{ previousTurn, turnNo, discardedEntries }`; com a mesa aberta no navegador, avançar mostra o aviso de turno
finalizado.

## 4. Pelo MCP

```bash
cd backend && dotnet run --project Roll6.Mcp   # http://localhost:5129/mcp
```

Com a chave do mestre: `update_turn_entry`, `create_turn_entry` (`turnType` 4/5), `delete_turn_entry`,
`set_current_turn`. Com a chave de um jogador: `isError` com o 403 da API.

## 5. Testes

```bash
cd backend
dotnet test --filter "FullyQualifiedName~TurnTests|FullyQualifiedName~TurnServiceTests|FullyQualifiedName~Mcp"
```
