# Quickstart — Qualidade da vista 3D (053)

## Pré-requisitos

- `cd frontend && npm install && npm run dev` (API via `VITE_API_PROXY`).
- Uma campanha com um mapa que tenha **máscara 3D** e várias peças em pé cujos tokens tenham a imagem "2,5D frente" (figuras só aparecem no 3D com ela). Para a medição: **50 peças** (NPCs bastam — "Incluir NPC" cria instâncias no hex livre mais perto do meio, 052).

## Testes automáticos

```bash
cd frontend
npm test                       # inclui o quadro de referência (hash 4240962842) — tem de passar sem mudança
npm test -- viewQuality        # níveis e preferência
npm test -- mipmap             # cópias reduzidas e bilinear
npm test -- figureLayer        # camada do Ultra
npm test -- raycastFrame       # referência + opções novas
npm test -- keys               # chaves i18n
npm run lint && npx tsc --noEmit
```

## Roteiro manual

1. **Padrão intacto** — abra o mapa em 3D sem mexer em nada: visual idêntico ao de antes (figuras serrilhadas, quadro de até 480 colunas). No DevTools › Memory, nenhuma imagem de figura acima de 256 px foi lida.
2. **Menu** — menu do nome › **Qualidade do 3D**: três radios (Padrão marcado), texto de custo; em janela < 768 px aparece também a frase da bateria. Fechar com Esc e com "Fechar".
3. **Alta** — com o 3D aberto, escolha Alta: a vista redesenha em menos de 1 s, a câmera não se move; figuras de perto nitidamente menos serrilhadas; paredes/chão continuam em blocos.
4. **Ultra** — escolha Ultra: figuras com bordas suaves no tamanho da tela; ande para longe de uma figura (joystick/teclas) e observe que ela não cintila; chegue perto de uma parede baixa com uma figura atrás: a parte acima do topo aparece, a de baixo some (oclusão linha a linha preservada).
5. **Troca sem buraco** — em Ultra, troque de mapa (imagens novas): as figuras antigas ficam até as novas chegarem; nunca um quadro sem figuras.
6. **Balões** — com uma ação no turno, o balão fica na cabeça da figura nos três níveis.
7. **Memória** — recarregue, abra o 3D em Alta: as figuras são lidas a 480 px; volte a Padrão: nenhuma leitura nova (cache por tamanho).
8. **Lembrança** — recarregue a página: o 3D abre no nível escolhido; abra outro mapa em 3D: mesmo nível; saia da conta e entre: Padrão.
9. **Storage quebrado** — DevTools › Application › Local Storage: grave `roll6:3d-quality = "x"`: o 3D abre em Padrão e o seletor funciona.
10. **Celular** — no celular, o padrão é Padrão, os três níveis aparecem e o aviso de bateria também.
11. **2D** — em 2D ou sem mapa, escolher um nível não muda nada na tela; os botões do mapa não ganharam botão novo.

## Medição de desempenho (FR-015)

Objetivo: tempo médio de quadro (`draw()`) por nível com **50 peças em pé**, no mesmo mapa, câmera livre girando (GM), em (a) um computador comum e (b) um celular médio.

1. Temporariamente, em `raycastRenderer.ts`, envolva `draw()` com `performance.now()` e acumule média a cada 120 quadros no `console.log` (não commitar).
2. Para cada nível (Padrão → Alta → Ultra), gire a câmera por ~20 s e anote a média (ms/quadro) e a largura do quadro impressa.
3. Celular: Chrome Android via `chrome://inspect` (USB) ou Safari iOS via Web Inspector no Mac; mesma rotina.
4. Registre a tabela (aparelho, nível, colunas, ms/quadro, fps aproximado) na descrição do PR e num comentário da issue #31. Se Alta ficar acima de 2× o Padrão no computador, ajuste `QUALITY_PROFILES.high.columns` (um só lugar) e meça de novo.

| Aparelho | Nível | Colunas | ms/quadro | fps |
|---|---|---|---|---|
| (computador) | Padrão | 480 | | |
| (computador) | Alta | 720 | | |
| (computador) | Ultra | 960 | | |
| (celular) | Padrão | 480 | | |
| (celular) | Alta | 720 | | |
| (celular) | Ultra | 960 | | |
