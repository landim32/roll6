# Research: Editar a pose girando os ossos (066)

## R1 — Conversão inversa (rotação do osso → graus do arquivo)

- **Fato** (site, `threeClips.buildRoll6Clip`): para um osso com pai em repouso de orientação P (relativa à raiz do
  modelo), rotação local de repouso L e ajuste de braço C (identidade fora dos braços), um giro D (Euler XYZ dos graus,
  no referencial do personagem) vira a rotação local `Q = P⁻¹·(D·C)·P·L`.
- **Decision**: `D = P·Q·L⁻¹·P⁻¹·C⁻¹`, decomposto em Euler XYZ (graus, 1 casa). P, L e C vêm de
  `restFrame(source, boneName)`, extraído de `buildRoll6Clip` e exportado (o `source` é a cena do asset em repouso, a
  mesma em que os clips são montados — o `Player` já a guarda).
- **Rationale**: inversa exata (quatérnions unitários); usar o mesmo `restFrame` nos dois sentidos impede divergência.
- **Verification**: teste de ida e volta (graus → `buildRoll6Clip` → quatérnion → `degreesFromLocal` → graus) com um
  esqueleto de teste que tem eixos locais tortos e um braço com ajuste.
- **Alternatives considered**: guardar a rotação local no arquivo — mudaria o formato (proibido; três implementações).

## R2 — O gizmo

- **Decision**: `TransformControls(camera, canvas)` em `mode = 'rotate'`, `space = 'world'` (anéis nos eixos do mundo =
  do personagem de frente: X esquerda, Y cima, Z frente), `size` 0,7; `getHelper()` na cena; `dragging-changed`
  desliga o `OrbitControls` durante o arrasto. Preso ao `Bone`, gira o próprio `bone.quaternion`.
- **Rationale**: pronto no `three`, testado, com anéis por eixo e o anel livre; "world" é mais fácil para quem não
  entende de 3D (os anéis não giram junto com o osso).

## R3 — Congelar o mixer

- **Decision**: `Player.freeze()` faz `update(delta)` e `seek` não chamarem o mixer até a próxima `setAnimation` (a
  versão gravada) ou `clear`; selecionar um osso pausa (`pause()`) e congela. Se a gravação falhar, `refresh()` remonta
  a animação no mesmo instante e descongela.
- **Rationale**: senão o mixer devolveria o osso à pose do clip a cada quadro durante o arrasto e até a versão nova chegar.

## R4 — O arquivo novo (`setKey`, puro)

- **Decision**: `setKey(file, bone, time, degrees, tolerance = POSE_TOLERANCE)`:
  - trilha existente: substitui a chave a ≤ tolerância do instante ou insere uma em ordem;
  - sem trilha: cria `{ bone, times: poses ∪ {time}, degrees: [0,0,0] em cada pose e o novo no instante }` (Q1 = A);
  - `loop` e instante ≈ 0 ou ≈ `duration`: aplica também na outra ponta, se ela tiver chave (FR-009);
  - devolve um objeto novo; tudo o mais (campos extras, `hipsLift`, outras trilhas) é copiado como está (FR-007).
- Graus arredondados a 0,1; uma rotação igual (diferença < 0,05°) à atual não grava (Edge Case).

## R5 — Gravar (casca)

- **Decision**: mensagem `saveAnimation { fileName, file }`. `MainViewModel.SaveFromView`: recusa se `fileName` não é o
  aberto, se o Claude está trabalhando ou se a pasta mudou de arquivo; `AnimationWriter.Write(path, JsonElement)` valida
  com `AnimationFormat.Parse` (mensagem do Roll6 em caso de erro → `saveError` para a vista) e grava em
  `nome.json.tmp` + `File.Move(..., overwrite: true)`, JSON indentado (2 espaços, UTF-8 sem BOM).
- **Rationale**: o watcher já transforma a gravação em versão nova para a vista (instante mantido, 062) e para o
  histórico; a validação é a do backend (SC-004).

## R6 — Histórico (Q2)

- **Decision**: `AnimationHistory` (Core) por nome de arquivo (renomear move; apagar descarta): `Versions` (texto exato),
  `Index`. `Observe(content)`: se igual a `Versions[Index]`, nada; senão corta o que estiver depois de `Index`, acrescenta
  e avança (limite 100 → descarta a mais antiga). A primeira versão é a lida quando o arquivo entra na lista.
  `Undo()`/`Redo()` devolvem o texto a gravar (`File.WriteAllText` exato) e movem o índice — quando o watcher lê esse
  texto, ele é igual ao atual e não entra de novo. Bloqueados enquanto o Claude trabalha.
- **Rationale**: um só caminho (a pasta) para tudo o que muda — ferramenta, Claude, editor — e Ctrl+Z byte a byte (SC-006).

## R7 — Teclado e botões

- **Decision**: na vista, Ctrl+Z / Ctrl+Y (e Ctrl+Shift+Z) → mensagens `undo`/`redo`; Esc tira a seleção; botões ↶ ↷
  na barra com as contagens que a casca envia (`history { undo, redo }`). Na janela WPF, Ctrl+Z/Ctrl+Y fora de uma caixa
  de texto fazem o mesmo (dentro do campo do pedido continua o desfazer do texto).

## R8 — Bloqueios

- **Decision**: a casca envia `editing { enabled, reason }`: desligado enquanto o Claude trabalha ("O Claude está
  trabalhando…"), sem animação aberta ou com arquivo inválido; a vista também desliga num modelo fora do padrão Mixamo.
  Ossos fora de `ANIMATION_BONES` não são selecionáveis (rótulo explica).
