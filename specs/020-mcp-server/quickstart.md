# Quickstart: servidor MCP (020)

## Configurar um assistente

1. No Roll6: menu do usuário → "Chaves de API" → gere uma chave e copie.
2. Claude Code:
   ```bash
   claude mcp add --transport http roll6 https://{domínio}/mcp --header "X-Api-Key: r6_..."
   ```
   Claude Desktop / outros clientes remotos: servidor HTTP `https://{domínio}/mcp` com o cabeçalho
   `X-Api-Key`. Local: `http://localhost:5119/mcp`.

## Validar

1. Sem chave: `curl -i -X POST http://localhost:5119/mcp` → 401.
2. `initialize` + `tools/list` com a chave → 74 ferramentas (73 + `get_roll6_guide`), todas com descrição.
3. `resources/read roll6://guide` → guia em inglês.
4. Roteiro com um assistente sem contexto (SC-003): "crie a campanha Teste MCP" → "crie um modelo de mapa
   10×8 e adicione à campanha" → "crie o personagem Aria (vida 10, energia 5, movimento 5) e peça acesso" →
   "coloque a Aria no mapa em (2,2)" → "mova a Aria para (2,0) olhando para cima" → "registre a ação: ataca o
   goblin" → "veja o estado do turno" → "finalize o turno mesmo com pendências" → "resuma o turno 1" →
   "liste as peças do mapa". Sem erros de parâmetro.
5. Com o mapa aberto no navegador, o movimento do passo 4 aparece na hora (017).
6. `delete_campaign` em campanha alheia → erro 403 com a mensagem da API.
7. `dotnet test` passa (cobertura das 73 operações, descrições, anotações, erros).
