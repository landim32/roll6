# Quickstart: Editar a pose girando os ossos (066)

## Automático

```bash
cd frontend && npx vitest run threeClips      # o buildRoll6Clip refatorado dá o mesmo resultado
cd ../roll6anime/viewer && npm test && npm run build   # setKey, ida e volta da conversão
cd .. && dotnet build Roll6Anime.sln && dotnet test Roll6Anime.Tests   # histórico, gravação validada
```

## Manual (janela real, ogro, cópia de teste da animação)

> Usar uma cópia (`zz-teste-aceno.json`) para não mexer nos arquivos do usuário; apagá-la no fim.

1. Esqueleto ligado, pausar na pose 3, clicar no cotovelo esquerdo: anéis aparecem, rótulo "LeftForeArm".
2. Girar um anel ~30°: o antebraço e a mão giram; o rótulo mostra o ângulo. Soltar: o arquivo muda (só a chave da pose
   3 do LeftForeArm), a vista continua na pose 3 com a pose nova.
3. Pausar entre as poses 2 e 3 e girar: a barra passa a contar uma pose a mais.
4. Girar o pescoço (sem trilha): o arquivo ganha a trilha `Neck` com 0° nas outras poses.
5. Ctrl+Z: o arquivo volta byte a byte ao anterior; Ctrl+Y refaz; os botões ↶ ↷ mostram as contagens.
6. Pedir ao Claude uma mudança; depois Ctrl+Z desfaz a do Claude.
7. Durante um pedido ao Claude: anéis e ↶ ↷ desativados.
8. Uma rotação que estouraria um limite do formato: nada gravado, mensagem do Roll6.
