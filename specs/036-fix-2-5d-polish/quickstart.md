# Quickstart: validar os ajustes do 2,5D (036)

Pré-requisitos: backend rodando (`dotnet run --project Roll6.API`), frontend (`npm run dev`), um usuário mestre com uma campanha, um
mapa com imagem e imagens de teste (máscara com faixas preto/cinza 50%/branco; token com 4 imagens 2,5D).

## 1. Formulário de token (US1)

1. "Incluir token" → aba "2,5D". Confira as duas colunas × duas linhas: títulos na mesma altura, descrições alinhadas e quatro
   palcos quadrados de mesmo tamanho, com a moldura 3:4 centralizada.
2. Escolha um arquivo em um campo (abre o recorte), deixe outro vazio e outro com imagem gravada (edição): os palcos não mudam de
   tamanho e a silhueta fica na mesma posição.
3. Troque de aba e volte: nada se perde. Encolha a janela (< 768 px): uma coluna, sem rolagem horizontal.
4. Salve e abra o 3D: figuras com quatro imagens recortadas do mesmo modo têm a mesma escala em todas as direções.

## 2. Chão (US2)

1. Abra o mapa em 3D e gire para o lado em que o chão passa da borda da imagem: sem faixa preta; o chão continua com a cor da borda.
2. Mapa sem imagem: chão neutro como antes.

## 3. Balões (US3)

1. Com uma peça em pé que agiu no turno ("Agir"), abra o 3D: o balão aparece sobre a cabeça com o mesmo texto do 2D.
2. Aproxime/afaste a câmera e gire: o balão acompanha, continua legível e não sai da tela.
3. Deite a peça (Caído) ou esconda-a atrás de uma parede alta: o balão some. Termine o turno: o balão some em até 2 s.

## 4. Máscara em tons de cinza (US4)

1. Em "Editar mapa" envie a máscara com faixas preto / cinza 50% / branco: a prévia mostra os tons.
2. No 3D a parede cinza tem metade da altura da preta e deixa ver o que há atrás acima do topo; a preta é inteira.
3. Reenvie a máscara antiga (só preto e branco): o 3D fica igual ao de antes.

## 5. Automatizado

```bash
cd frontend && npm run lint && npm test && npm run build
cd ../backend && dotnet test --filter "FullyQualifiedName~Mcp"
```

Testes novos/alterados: `maskImage`, `raycaster` (mediana, várias faces), `raycastFrame` (referência 0/255 idêntica, chão preso,
oclusão por linha, `FrameResult`), `storyBubbles`, `frontImage` (palco).
