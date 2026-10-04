# Quickstart: Mapa de história 2,5D

## Preparar

```bash
cd backend
dotnet build Roll6.sln
dotnet ef migrations add AddStoryMap --project Roll6.Infra --startup-project Roll6.API
dotnet ef database update --project Roll6.Infra --startup-project Roll6.API   # precisa de um PostgreSQL acessível
dotnet run --project Roll6.API                                                 # http://localhost:5119

cd ../frontend
npm install three && npm install -D @types/three
npm run dev                                                                    # http://localhost:5173
```

Sem PostgreSQL local: aplicar `database/migrations/033-story-map.sql` no banco de homolog.

## Verificar (manual)

1. **Criar** — "Novo mapa", carregar uma imagem, "Tipo de mapa" → "Mapa de história (2,5D)". Os botões Paredes e
   Céu aparecem; com "Mapa 2D" eles somem.
2. **Paredes** — "Paredes" → Pintar: arrastar sobre os corredores. Apagar: um hex volta a vazio. Salvar, recarregar:
   as mesmas células (US1, FR-004). Reduzir a grade: paredes fora somem do rascunho.
3. **Bloqueio** — num mapa de campanha `Story`, arrastar um cartão do grupo sobre uma parede → aviso de bloqueio;
   "Mover" contorna paredes; com o mestre também (FR-003b). Pintar parede sob uma peça: ela continua lá e sai com
   "Mover".
4. **3D** — "Ver em 3D": a cena ocupa o fundo; painéis e menu utilizáveis. Como jogador com personagem escolhido, a
   câmera aparece atrás da peça olhando-a de fora. W/A/S/D/Q/E e arrastar: anda e gira; a câmera não atravessa
   paredes; roda do mouse: zoom (FOV). "Voltar ao personagem" prende de novo. Trocar o "Personagem atual": a câmera
   vai para o novo. Como GM: câmera solta no centro.
5. **Peças** — PJs/NPCs/objetos de pé com a imagem do token; atrás de parede ficam ocultos; caído = deitado no
   chão; fora de combate = preto e branco. Em outra aba, o mestre move uma peça: a figura anda no 3D em ≤ 2 s.
6. **Céu e chão** — a imagem do mapa é o chão alinhado às paredes; o céu aparece atrás delas; sem céu, cor padrão.
7. **Preferência** — recarregar com o mapa em 3D: reabre em 3D; abrir um mapa 2D: sem botão 2D/3D.
8. **Sem WebGL** — desligar a aceleração de hardware do navegador: toast e permanece no 2D.
9. **Celular** (DevTools, < 768 px): joystick, arrastar para girar, pinça para zoom.
10. **Regressão** — mapas antigos abrem como 2D, idênticos (SC-005).

## Testes automatizados

```bash
cd backend && dotnet test --filter "FullyQualifiedName~MapModel|FullyQualifiedName~Occupancy|FullyQualifiedName~MapTokenService|FullyQualifiedName~MapNpcService|FullyQualifiedName~TurnService|FullyQualifiedName~Mcp"
cd frontend && npm test -- storyWalls storyCamera viewMode occupancy mapTokens draft
npm run lint && npm run build     # o chunk do three deve sair separado do bundle principal
```

Casos de referência compartilhados (C# ↔ TS) para paredes em `OccupancyTests` / `occupancy.test.ts`:
peça 1 hex sobre parede → `Wall`; peça 7 hex com um vizinho parede → `Wall`; parede + peça no mesmo hex →
`OutsideGrid` > `Wall` > `Occupied`; `except` não libera parede; custo de movimento contornando uma parede.
