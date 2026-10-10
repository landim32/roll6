# Quickstart: Sussurro

Jogadores A (Aria), B (Bram), C (Caio) e o mestre, cada um numa janela.

1. A digita "@br" → lista com Bram; Enter → chip "Bram", campo amarelo. "@" de novo → escolhe "Mestre". Envia "psiu".
2. A, B e o mestre veem o balão amarelo com "Visível apenas para" + fotos de Bram e do mestre. C não vê nada, nem contador de não lidas nem notificação.
3. Depois do envio o campo de A volta ao normal (sem chips).
4. A sussurra uma foto e uma rolagem para B: só A, B e o mestre veem.
5. A liga Ação, "@" Bram, envia "escondo a adaga". B e mestre veem o texto (amarelo); C vê "Aria está sussurrando!" no chat, no balão do mapa 2D, na vista 3D e no resumo do turno.
6. B (sem o mestre) sussurra para C: o mestre vê mesmo assim.
7. C tenta reagir a um sussurro que não vê via API → 404.
8. MCP: `send_chat_message` com `whisperCharacterIds` funciona; `list_chat_messages` com a chave de C não traz o sussurro.
