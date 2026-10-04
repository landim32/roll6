# Quickstart: Vista 3D por raycasting

## Preparar

```bash
cd backend
dotnet ef migrations add ReplaceStoryMapWithRaycast --project Roll6.Infra --startup-project Roll6.API
dotnet ef database update --project Roll6.Infra --startup-project Roll6.API   # banco acessível
dotnet run --project Roll6.API
cd ../frontend && npm uninstall three @types/three && npm run dev
```

Imagens de teste: `C:\Users\rodri\Downloads\roll6-story-map\` (planta 1220 × 1074 para grade 20 × 15 e céu); gerar uma
máscara preto e branco da planta com o mesmo tamanho (paredes pretas).

## Verificar

1. Cadastro do mapa → aba **3D**: enviar máscara com a mesma proporção → prévia em preto e branco; outra proporção →
   recusada com as duas proporções; enviar fundo; salvar; reabrir → as duas continuam.
2. Lateral: só o botão **3D** é novo (sem menu de tipo/paredes/céu).
3. **3D** em qualquer mapa: paredes onde a máscara é preta, com as cores da planta; chão = planta em perspectiva;
   fundo gira com a câmera e fica parado ao andar; câmera não olha para cima/baixo nem atravessa paredes.
4. Peças: de pé com "2,5D frente" (ou a imagem atual), cortadas pelas quinas; caídas deitadas; fora de combate cinza;
   mover em outra aba → muda em ≤ 2 s. Andar no 3D não move nenhuma peça.
5. 2D: a máscara não aparece nem bloqueia — colocar/mover peça sobre área preta funciona (regras de antes da 033).
6. Mapas da 033: abrem; o céu virou fundo; paredes pintadas sumiram.
7. Celular: joystick, arrastar gira, pinça zoom. Medir FPS (SC-003) com máscara 2000 × 2000 e 50 peças.

## Testes

```bash
cd backend && dotnet test
cd frontend && npm test -- raycaster storyCamera draft viewMode && npm run lint && npm run build
```
