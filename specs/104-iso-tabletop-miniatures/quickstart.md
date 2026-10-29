# Quickstart: Miniaturas de mesa na vista isométrica (104)

```bash
cd frontend
npm test -- isoMiniature modelSet
npm run lint
npm run build
npm run dev
```

Prepare uma campanha ativa com o mapa atual contendo: um personagem com token de **modelo 3D**, um NPC inimigo com modelo,
um NPC aliado com **só figura 2,5D**, um objeto com modelo e um token **só com imagem** (com imagem de "Caído"
cadastrada). Abra o mapa e escolha **Isométrica** no botão de vista.

1. **Miniatura em pé (US1)**: cada peça com modelo aparece imóvel, de pé sobre uma base redonda; bordas azul (personagem),
   vermelha (NPC), cinza (objeto). Observe 10 s: nenhum movimento de animação.
2. **Figura sobre a base (US3)**: o aliado só com figura fica sobre uma base de borda verde-água e continua virando para a
   câmera ao girar a vista. O token só com imagem não tem base.
3. **Tamanho**: mude um token para 3 hexes — a base cresce; mude o "Tamanho" do modelo para 200% — o modelo cresce, a base
   não.
4. **Caído (US2)**: no 2D (ou pelo cartão), ponha o personagem em "Caído": na isométrica a miniatura tomba para as costas
   em relação ao lado que ela olha, com a base de lado, sem recarregar (sem piscar). Gire a câmera: ela continua deitada.
5. **Fora de combate**: mude para "Fora de combate": continua tombada e fica em preto e branco (armas também); a borda da
   base mantém a cor. Volte para "Em pé": levanta com as cores.
6. **Objeto**: tente mudar a postura do objeto — não há postura; ele fica sempre de pé.
7. **Imagem no chão**: ponha o token só com imagem em "Caído": aparece a imagem de "Caído"; sem ela cadastrada, a de "Em pé".
8. **Luz**: afaste o foco até a borda do círculo cortar uma miniatura em pé e uma tombada: base e modelo cortados na borda;
   fora da luz nada aparece; as sombras dentro do círculo incluem a base.
9. **Tempo real**: outra pessoa muda a postura — a miniatura tomba/levanta em até 2 s.
10. **Regressão**: abra a vista **3D** e o **2D** — tudo como antes (o 3D continua animado e sem base).
