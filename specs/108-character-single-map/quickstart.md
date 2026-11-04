# Quickstart: Personagem em um único mapa, sem mapa atual

## Preparação

```bash
cd backend
dotnet ef database update --project Roll6.Infra --startup-project Roll6.API
dotnet run --project Roll6.API

cd ../frontend
npm run dev
```

Campanha ativa com o mestre, Ana (1 personagem) e Bruno (2 personagens), e dois mapas: "Taverna" e "Porão". Use uma janela
anônima para cada usuário.

## Roteiro

**1. Sem mapa (US2)**
- Antes de qualquer peça, Ana abre a campanha: vê "Seu personagem ainda não está em um mapa." e usa o chat normalmente.
- O card de Ana no painel do mestre mostra "Sem mapa".

**2. Primeira colocação (US1, US3)**
- O mestre abre "Taverna" e arrasta o card de Ana: sem aviso.
- Ana vê "O mestre está mudando o mapa" e o mapa se abre. O card passa a mostrar "Taverna".

**3. Transferência (US1, US3)**
- O mestre abre "Porão" e arrasta o card de Ana: aparece o aviso com "Taverna".
- **Cancelar**: nada muda em nenhuma das telas.
- **Confirmar**: a tela de Ana mostra a mensagem por pelo menos 1,5 s e termina em "Porão", sem recarregar.
- Abrindo "Taverna", a peça não está mais lá.

**4. Grupo dividido (US2)**
- Coloque Bruno em "Taverna". Ana continua vendo "Porão", e Bruno vê "Taverna".
- O mestre move uma peça em "Taverna": a tela de Ana não recebe nada. Confirme na aba de rede ou no WebSocket.
- Ana abre o endereço `/map/taverna`: volta para "Porão" com aviso.

**5. Dois personagens (US2, US3)**
- Com os dois de Bruno em mapas diferentes, trocar o "Personagem atual" muda o mapa, sem a mensagem.
- O mestre leva o personagem **não** escolhido: a tela de Bruno não muda.

**6. Turno dividido (US4)**
- Ana e Bruno agem e se movem nos seus mapas; "Finalizar turno" funciona.
- O resumo do turno mostra `### Porão` e `### Taverna`.
- `GET …/turn/data` traz `maps` com dois itens, `mapId` nulo na raiz e `mapId` em cada personagem.

**7. Bordas**
- Um personagem que já se moveu é transferido: continua sem poder se mover no turno, e resetar não o traz de volta.
- Arquivar "Porão" com Ana nele: recusado. Excluir "Porão": Ana cai no aviso de sem mapa.
- Modo livre: Ana anda em 3D em "Porão", sem nenhum mapa atual.
- Duas abas do mestre confirmam a mesma transferência: o personagem fica em um único mapa.

**8. NPCs (US5)**
- O mesmo NPC em dois mapas e duas vezes em um deles: nenhum aviso, todas as instâncias ficam.

**9. Migração (FR-019)**
- Com uma cópia do banco antes da migração: rode a query abaixo depois de aplicar. Tem de retornar zero linhas.

```sql
SELECT campaign_character_id FROM map_tokens
WHERE campaign_character_id IS NOT NULL
GROUP BY campaign_character_id HAVING count(*) > 1;
```

## Testes

```bash
cd backend
dotnet test

cd ../frontend
npm run lint
npm test
npm run build
```

## Verificação de texto

`grep -ri "mapa atual\|currentMap\|current_map" backend frontend/src` deve encontrar só `MapGeneratorPrompt.cs` (outro
sentido), `MapGeneratorTests`, `AnimationHubTests` e as migrações antigas.
