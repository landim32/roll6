# UI Contract: Peça de NPC (026)

## NpcCard (painel de NPCs)

- Cabeçalho como hoje (avatar, nome do NPC, ponto de turno, lápis do mestre).
- Com ocorrências no mapa aberto: uma linha por ocorrência — nome da ocorrência, `VitalBar` Vida `life/totalLife`,
  `VitalBar` Energia `energy/totalEnergy`, status em texto pequeno (quando houver).
- Sem ocorrências: as barras dos totais do NPC (como hoje).
- Atualiza com `mapTokens.changed` / `mapToken.upserted` (peças recarregadas), sem ação do usuário.
