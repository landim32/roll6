# Quickstart: Imagens 2,5D por direção do token

## Preparar

```bash
cd backend
dotnet ef migrations add AddTokenDirectionImages --project Roll6.Infra --startup-project Roll6.API
dotnet ef database update --project Roll6.Infra --startup-project Roll6.API   # banco acessível
dotnet run --project Roll6.API
cd ../frontend && npm run dev
```

Imagens de teste: quatro desenhos de personagem com uma letra grande cada (F, D, E, C) em 360 × 480, silhueta a 60%, fundo
transparente (gerar com o script do scratchpad). Sem banco local: aplicar `database/migrations/035-token-direction-images.sql`.

## Verificar

1. **Aba "2,5D"** — "Incluir token": aba "Token" com nome e imagem em pé; aba "2,5D" com quatro campos; escolher um arquivo em cada
   e ajustar o recorte (silhueta igual nos quatro, dica de lado em cada); voltar à aba "Token" e depois à "2,5D": nada se perdeu.
2. **Salvar e reabrir** — editar o token: as quatro imagens aparecem; trocar a direita, remover as costas: frente e esquerda ficam.
3. **Token antigo** — editar um token com só a frente (034): ela aparece no campo "Frente" da aba "2,5D".
4. **3D, o lado certo** — peça virada ao norte no mapa; "Ver em 3D"; andar para o norte da peça (vê **F**), sul (**C**), leste
   (**D**), oeste (**E**); câmera padrão (atrás do personagem escolhido) mostra **C** no próprio personagem.
5. **Girar a peça no 2D** (Mover/olhar para outro lado) — a imagem do 3D acompanha em ≤ 2 s; testar as seis direções.
6. **Reserva** — token só com direita: andar pelo lado esquerdo mostra a direita **espelhada**; só com frente e costas: laterais
   mostram a frente; sem costas: por trás mostra a frente; sem frente (só costas): os outros lados mostram a imagem em pé.
7. **Sem piscar** — parar a câmera em cima da divisa de 45°: a imagem não alterna sozinha.
8. **Desempenho** — 50 peças com quatro imagens: ≥ 30 fps.

## Testes

```bash
cd backend && dotnet test
cd frontend && npm test -- spriteView raycastFrame pieceDrawing tokenForm && npm run lint && npm run build
```
