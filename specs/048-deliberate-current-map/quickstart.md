# Quickstart: Mapa atual deliberado

Mestre (M) e jogadora (J) na mesma campanha, mapa A atual, cada um numa janela.

1. M abre o mapa B por "Mapas da campanha" → J continua no A; a marca "Atual" continua no A nas duas listas.
2. M muda a imagem do B, salva, coloca um NPC e move peças → J não vê nada e continua no A.
3. M cria um mapa novo na campanha (salvar como novo) → ele não vira atual.
4. M escolhe o B no seletor de mesa do menu → o atual continua A.
5. Em Configurações › Mapas, M toca o alfinete "Tornar atual" no B → aparece "Levar os jogadores para o mapa B?"; Cancelar → nada muda.
6. Repete e confirma → toast "Os jogadores foram levados para o mapa B."; "Atual" passa para o B; M continua vendo o mapa que tinha aberto.
7. J vai para o B em até 3 s, com o aviso "O mestre levou a mesa para o mapa B."
8. Um mapa arquivado não mostra o alfinete; via MCP `set_current_map` com ele → 400.
9. Jogadora não vê o alfinete em nenhuma lista.
