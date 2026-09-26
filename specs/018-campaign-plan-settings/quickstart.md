# Quickstart: plano de campanha e configuração (018)

Pré-requisitos: migração `AddCampaignPlans` aplicada; backend e frontend rodando; campanha com mestre **M**,
jogador **J** (aprovado), NPCs e dois mapas.

1. Como **J**: a engrenagem ao lado de "Campanha atual" não aparece; `GET /api/campaign/{id}/plan` → 403.
2. Como **M**: clicar na engrenagem → "Configuração da campanha — {nome}" com 4 abas.
3. **Personagens**: aprovar um pedido, convidar um personagem e remover outro (com confirmação).
4. **NPCs**: incluir um NPC (Meus NPCs), editar e retirar da campanha.
5. **Mapas**: ver o selo "Atual"; arquivar e reativar um mapa; abrir o outro mapa → o modal fecha e J passa
   ao mapa (017); excluir um mapa arquivado com confirmação.
6. **Plano**: "Novo plano" → título "Capítulo 1", texto com título/lista e "Inserir imagem" (PNG) → Salvar.
   Fechar, recarregar a página, abrir de novo → texto e imagem aparecem (depois de expirar a URL também).
7. Alterar o texto e tentar trocar de aba → confirmação de descarte.
8. Colar `<script>alert(1)</script>` e `<img src=x onerror=alert(1)>` na descrição → nada executa.
9. Salvar sem título → mensagem de campo obrigatório.
10. `dotnet test` e `npm test` passam.
