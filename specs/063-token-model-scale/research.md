# Research: Tamanho do modelo 3D do token (063)

## R1 — Como guardar o Tamanho

- **Decision**: `tokens.model_scale integer not null default 100`, em porcentagem inteira (25–400, múltiplo de 5).
- **Rationale**: é exatamente o que o usuário escolhe (Q1 = A), sem ponto flutuante no banco nem arredondamento.
  O padrão 100 cobre os tokens existentes na própria migração (FR-006). O fator usado no desenho é `scale / 100`.
- **Alternatives considered**: `real` com o fator (1.0) — admite valores fora do passo e arredondamentos; coluna
  nula = 100 — mais um caso para tratar em toda leitura.

## R2 — Onde validar

- **Decision**: `Guard.ModelScale(int? value, key)` no domínio: null → 100; fora de 25–400 ou não múltiplo de 5 → 400 com
  a chave `modelScale` e a mensagem "O tamanho do modelo deve ser de 25% a 400%, em passos de 5%.". Chamado por
  `Token.UpdateModel`, que já zera as animações sem modelo — sem modelo, o Tamanho volta a 100 (FR-007).
- **Rationale**: um único lugar para site, API e MCP (SC-004). O site espelha as constantes em `lib/modelScale.ts`,
  mas o range já não deixa sair do intervalo.
- **Alternatives considered**: aceitar qualquer inteiro e arredondar — esconderia erros do MCP.

## R3 — Contrato da API (PUT substitui tudo)

- **Decision**: `TokenInsertInfo.modelScale` (`int?`, omitido = 100), `TokenInfo.modelScale` e `MapTokenInfo.modelScale`
  (`int`). O formulário reenvia o valor guardado, como já faz com o arquivo e as animações.
- **Rationale**: o PUT de token já substitui todos os campos (CLAUDE.md); seguir a mesma regra evita um caso especial.

## R4 — Como aplicar na vista 3D

- **Decision**: `fitModel(bounds, width, center, yaw, scale = 1)` e `fitLyingModel(..., scale = 1)` multiplicam a
  escala (`figureHeight(width) / tall × scale`). A posição dos pés e do centro já é calculada a partir da escala, então
  os pés continuam no chão e no centro da peça. `ModelSpec.scale` vem de `spriteSpec.modelScale / 100`.
- **Rationale**: uma multiplicação; com `scale = 1` o resultado é idêntico ao atual (SC-003).
- **Alternatives considered**: escalar o `Object3D` depois do encaixe — moveria os pés para fora do chão.

## R5 — Balões e cabeça

- **Decision**: no `StoryView`, o proxy escondido da peça com modelo (`RenderSprite.hidden`) usa `width × fator`. A
  figura mantém a proporção 3:4 e os pés no chão, então o topo do proxy (de onde o balão pendura) e o teste "cabeça
  visível" acompanham a altura do modelo. A sombra no chão cresce junto, coerente com o modelo maior.
- **Rationale**: o raycaster e os balões não mudam; só a largura do proxy, e só enquanto ele está escondido (enquanto
  o modelo carrega ou se falhar, a figura 2,5D aparece no tamanho normal, porque o Tamanho é do modelo — FR-011).
- **Alternatives considered**: um campo de altura no `RenderSprite` — mexeria no raycaster e no teste de quadro de
  referência por nada.

## R6 — Prévia do formulário

- **Decision**: `ModelPreview` recebe `scale`. O modelo é normalizado como hoje (`PREVIEW_HEIGHT`) e depois
  multiplicado pelo fator. O disco do chão (raio 1,1) fica fixo como referência da base. A câmera e o alvo se afastam
  e sobem por `max(1, fator)`, para um modelo grande caber inteiro, enquanto um pequeno encolhe sobre o disco. A troca é
  feita no objeto já carregado (sem recarregar), dentro do mesmo quadro (SC-001). A regra de enquadramento fica num
  helper puro (`lib/modelScale.previewFraming`) testado.
- **Rationale**: o disco fixo torna "maior" e "menor" visíveis (FR-003); afastar a câmera evita cortar o modelo a 400%.

## R7 — Tempo real (FR-010)

- **Decision**: `IMapTokenRepository.ListCampaignIdsByTokenAsync(tokenId)`: campanhas distintas de mapas com peças
  daquele token. `TokenLibraryService.UpdateAsync` publica, depois de gravar, `mapTokens.changed` com `mapId` null em
  cada uma (`IRealtimeNotifier` como último parâmetro do construtor, como nos outros serviços). Os clientes já recarregam
  as peças com esse evento.
- **Rationale**: hoje nenhuma alteração de token chega à mesa sem recarregar (nem o modelo, nem as imagens); o evento
  existente resolve o Tamanho e, de quebra, as outras alterações do token, sem tipo novo. Mapas que não são o atual
  vão só ao mestre (039, `TableEventAudience`), o que já é o comportamento desse evento com `mapId` null — a regra trata
  null como "todos os mapas" e manda ao grupo todo.
- **Alternatives considered**: um tipo de evento novo `token.changed` — exigiria tratar no cliente sem ganho.

## R8 — Foto da pose (Q2 = A)

- **Decision**: nada muda. `capturePose` enquadra pelo `Box3` do modelo posado, e a escala da prévia não altera a
  proporção. O `Box3` é medido no próprio objeto, então a escala aplicada não muda a imagem.
- **Rationale**: a imagem 2D sempre ocupa a peça inteira.

## R9 — MCP

- **Decision**: `modelScale` (int, opcional) em `create_token`/`update_token`, descrito em `McpDocs.MODEL_SCALE`, e uma
  linha na seção "3D view" do guia. Sem endpoint novo: a contagem fica em 109 operações / 110 ferramentas.
