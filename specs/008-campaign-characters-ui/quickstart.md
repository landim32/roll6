# Quickstart: Personagens na Campanha

Pré-requisitos: banco de dev acessível, API em Development (`dotnet run --project
Roll6.API`, porta 5119) e `npm run dev` em `frontend/`. Sem migration nesta feature.

```bash
cd backend && dotnet test --filter "FullyQualifiedName~CharacterServiceTests|FullyQualifiedName~CampaignCharacterServiceTests"
cd frontend && npm test -- characterSelection characterForm && npm run lint && npm run build
```

Upload de imagem depende do bucket de Spaces configurado; sem ele, cadastrar sem imagem.

## Roteiro (dois navegadores/perfis: Mestre e Jogador)

1. **Mestre** cria a campanha fechada "Mesa" e abre o combo "Personagem atual": vê "Mestre (GM)" e as
   três ações; sem personagens próprios.
2. **Mestre** → "Incluir Personagem" "Goblin" → toast "incluído na campanha"; combo lista "Goblin".
3. **Jogador** seleciona "Mesa" (Campanhas → Buscar). Combo: "Nenhum personagem", sem "Mestre (GM)"
   nem "Gerenciar Personagens"; "Goblin" do mestre não aparece.
4. **Jogador** → "Incluir Personagem" "Aria" → toast "aguardando aprovação". "Selecionar Personagem"
   mostra "Aria — Acesso solicitado".
5. **Mestre** → "Gerenciar Personagens" → "Aria — Acesso solicitado" → "Aprovar". **Jogador**
   reabre "Selecionar Personagem": "Aprovado" → "Usar"; combo mostra "Aria". F5 mantém "Aria".
6. **Jogador** cria "Bram" fora de qualquer campanha (sem campanha atual) e depois volta à "Mesa".
   **Mestre** → aba "Convidar Personagens" → busca "bra" → vê foto/inicial, "Bram" e o dono →
   "Convidar". Em até 1 min o sino do **Jogador** mostra "1"; "Aceitar" → contador zera, "Bram"
   aparece no combo.
7. **Mestre** → "Excluir" em "Aria" → confirmação → some da campanha. **Jogador**: combo volta para
   "Bram"; "Selecionar Personagem" mostra "Aria — Fora da campanha" com "Solicitar acesso" (o
   personagem continua existindo).
8. **Mestre** → "Declinar" um novo pedido de "Aria" → Jogador vê "Recusado — aguarde um convite".
9. Trocar de campanha e voltar restaura a escolha; sair e entrar de novo limpa as escolhas guardadas.
