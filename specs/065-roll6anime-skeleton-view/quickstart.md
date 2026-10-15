# Quickstart: Esqueleto na vista 3D do roll6anime (065)

## Automático

```bash
cd roll6anime/viewer && npm test && npm run build      # skeleton.ts (ossos movidos, segmentos, mais próximo, cores)
cd .. && dotnet build Roll6Anime.sln && dotnet test Roll6Anime.Tests   # legenda com o esqueleto
```

## Manual (janela real, ogro aberto)

1. Sem modelo: o botão Esqueleto fica desativado.
2. Com uma animação que mexe só os braços (`aceno-duplo.json`), ligar Esqueleto: modelo semitransparente, ossos por cima;
   só os dos braços (e o que mais o arquivo tiver trilha) em âmbar, o resto em ciano.
3. Tocar, pausar e arrastar a barra: os ossos acompanham a pose.
4. Passar o mouse sobre o antebraço esquerdo: aparece "LeftForeArm" e o osso fica branco; arrastando para girar, o nome
   some.
5. Trocar de animação: o destaque muda. Desligar: modelo opaco e sem linhas, como antes.
6. Fechar e abrir a ferramenta com o esqueleto ligado: ele volta ligado.
7. Com o esqueleto ligado, "Anexar print" → Concluir → enviar "NÃO altere arquivos. Quais ossos estão destacados em
   âmbar?": o Claude responde pelos braços.
