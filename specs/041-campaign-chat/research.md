# Research: Chat da campanha — turno e conversa numa linha só (041)

Nenhum `NEEDS CLARIFICATION` ficou aberto (spec com 6 decisões em Clarifications). Ponto de partida no código:

- **`Turn` (`turns`)**: `turn_type` 1–5 (Movement, Action, ActionResult, CharacterUpdate, Narration), `turn_no`, ator (`character_id` / `npc_id` / `map_npc_id`), `map_id`, `user_id`, `description` (varchar 10000), posições, `moved`, `changes` (jsonb) e `created_at`.
- **`TurnService`**: `.cs`, `.Admin.cs` e `.Processing.cs`, com estado, resumo, narração, histórico, dados, agir, resetar, finalizar, processar, CRUD admin e `set_current`.
- **Turnos em outros lugares**: `MapTokenService` (movimento e postura), `CampaignCharacterService`, `MapNpcService` e `CharacterService` (mudanças), além do `TurnSummary`.
- **Turnos no frontend**: `TurnContext` (balões, pontos, sino), `TurnConsole` e `TurnConsoleModal` (028), `TurnLogModal` (024).
- **Contexto da mesa**: `TableHub` + `IRealtimeNotifier` (017), `POST /api/image`, "Personagem atual" (`'gm' | characterId`), `MainPage` com camadas presas à tela.

## D1 — A linha do tempo é a tabela `turns`, estendida (FR-001, FR-002)

- **Decision**: a mensagem da campanha **é** a entidade `Turn`, que passa a guardar também a conversa. O nome da tabela e da classe fica (`turns`, `Turn`). `TurnType` ganha:
  - `Text = 6`, `Image = 7`, `Audio = 8` (conversa);
  - `TurnFinished = 9` (divisor).

  Colunas novas, todas anuláveis:
  - `display_name` (varchar 260) e `display_image` (varchar 260): a identidade gravada no envio da conversa;
  - `image` e `audio` (varchar 260), `audio_seconds` (int);
  - `deleted_at` (timestamp).

  O texto da conversa usa a `description` que já existe. O turno da mensagem é o `turn_no` que já existe.
- **Rationale**:
  - **Uma linha só, sem cópia** (decisão do usuário): todo registro novo, de qualquer tipo, cai no mesmo lugar.
  - **Regras intactas**: o movimento único por turno, o reset, o finalizar e o processar continuam consultando a mesma tabela, filtrando os tipos 1–5.
  - **Contratos da API e do MCP preservados** (Clarification): `TurnInfo`, `turnType` e as rotas não mudam.
  - **Nada a migrar**: o registro antigo já está na tabela, e o FR-003 sai de graça.
- **Alternatives considered**:
  - Tabela nova `campaign_messages` copiando `turns` e renomeando `Turn` em todo o código: centenas de referências, risco alto e nenhum ganho para o usuário.
  - Duas fontes juntadas na leitura (o plano anterior): a decisão do usuário a rejeitou.

## D2 — Tipos de conversa não vazam nos contratos de turno (FR-012)

- **Decision**: toda leitura de turno existente passa a considerar **só os tipos 1–5 e não apagados**:
  - estado e lista do turno (`GET …/turn`, `…/turn/{n}`), usados pelo `TurnContext` para balões e pontos;
  - resumo, dados, narração e histórico;
  - finalizar (pendentes), resetar (já filtra Movement e Action), `ExistsMovementAsync` (já filtra Movement);
  - `ListLastMovementsAsync` e `TurnSummary`/`BuildLines`.

  Isso entra num filtro único no `TurnRepository` (`TurnTypes.LOG`) e num predicado nas leituras do `TurnService`. O CRUD admin (`POST`/`PUT`/`DELETE /api/turn`, `create/update/delete_turn_entry`) só aceita os tipos 1–5: criar outro tipo → 400 (como hoje), e alterar ou apagar uma mensagem de conversa ou um divisor por ali → 404.
- **Rationale**: as ferramentas de IA devolvem exatamente o mesmo conteúdo de antes (SC-002).

## D3 — Divisor de fim de turno (FR-009, edge cases)

- **Decision**: o `Turn.TurnFinished(campaignId, turnNo, userId)` é gravado na mesma transação de `campaign.AdvanceTurn()`, em `FinishAsync`, `ProcessAsync` e em `SetCurrentAsync` quando avança (um divisor por turno pulado). `SetCurrentAsync` para trás:
  - **com descarte**: já apaga as entradas de `turn_no > novo`, inclusive divisores e conversa desses turnos (é o comportamento pedido: "as mensagens dos turnos descartados somem");
  - **sem descarte**: só é permitido quando os turnos posteriores não têm entradas (contando a conversa), então apaga só os divisores `>= novo`.
- **Migração** (`AddCampaignChat`):
  - acrescenta as colunas;
  - para cada campanha e cada `turn_no < current_turn` que tenha entradas, insere um `TurnFinished` com `created_at = max(created_at) do turno + 1 ms` e `user_id` = mestre;
  - turnos antigos sem nenhuma entrada não ganham divisor, porque não há onde posicioná-lo (registrado como desvio mínimo da Assumption da spec).

  O mesmo SQL vai para `database/migrations/041-campaign-chat.sql`.

## D4 — Identidade (FR-005)

- **Decision**:
  - **Conversa**: grava `display_name`/`display_image` no envio. Com personagem, o nome e a imagem dele. Como mestre: `display_name` = "Mestre (GM) — {nome do usuário}", `display_image` = null (avatar do mestre no front) e `character_id` = null.
  - **Registros do turno, novos e antigos**: continuam com o rótulo calculado na leitura (`LoadNamesAsync`, o mesmo do `TurnSummary`), que preserva o texto das ferramentas de IA. As colunas de identidade ficam nulas neles.
- **Desvio da Assumption da spec**: a spec previa preencher a identidade dos registros antigos na migração. Calcular na leitura dá o mesmo nome no dia da migração e mantém o resumo idêntico ao de hoje, então nada é gravado.

## D5 — Leitura do chat (FR-004, FR-019)

- **Decision**: `GET /api/campaign/{id}/chat?before=&after=&limit=50` (máximo 100), lendo **só `turns`**:
  - **Cursor e ordem**: o cursor é `{createdAtTicks}_{turnId}`, com ordem total por (`created_at`, `turn_id`). Índice novo `ix_turns_campaign_created` (`campaign_id`, `created_at`, `turn_id`).
  - **Resposta** (`ChatPageInfo`): itens em ordem ascendente, `hasMore`, `unreadCount` e `firstUnreadCursor`.
  - **Itens de turno**: o `ChatItemInfo` traz **campos estruturados**, como ator, antes/depois, direção, pontos gastos e mudanças, para o front desenhar as linhas discretas (FR-014), mais `text` = a linha do `TurnSummary`, que serve a assistentes e de reserva. O acumulado de movimento vem de `BuildLines` sobre todas as entradas 1–5 dos turnos da página.
  - **Itens apagados**: `deleted: true`, sem texto nem mídia.

## D6 — Envio, foto e áudio (FR-005..FR-008)

- **Decision**:
  - **Envio**: `POST /api/campaign/{id}/chat` (`ChatSendInfo`: `characterId?`, `text?`, `image?`, `audio?`, `audioSeconds?`) cria `Turn.Text/Image/Audio(...)` com o `turn_no` atual e o `map_id` atual. A identidade é validada no servidor: um personagem do usuário aprovado, ou mestre com `characterId = null`; caso contrário, 403.
  - **Foto**: `POST /api/image`, que já existe.
  - **Áudio**: `POST /api/chat/audio` (multipart, até 5 MB). Aceita WebM (`1A 45 DF A3`), MP4/M4A (`ftyp` no byte 4) e Ogg (`OggS`), guarda os bytes como vieram, com o `Content-Type`, e devolve `{ fileName, url, contentType }`. A duração é medida no cliente (1–120).
  - **Compatibilidade**: o player usa `<audio>` com a URL pré-assinada. WebM não toca no iOS antes do 17.4, e o player avisa "formato não suportado neste aparelho" (limitação registrada).

## D7 — Ação pelo chat (FR-013a)

- **Decision**: **nenhum endpoint novo**. O seletor **Ação** do composer chama o `POST /api/turn/action` que já existe (`{ mapTokenId, description }`), com a peça do personagem atual no mapa atual, encontrada no `MapTokenContext`.
  - Sem peça no mapa atual (ou sem mapa), o seletor fica desativado com a dica "Coloque o personagem no mapa para agir".
  - Ação é só texto, até 2000 caracteres, o limite de hoje (`Turn.MAX_DESCRIPTION`).
  - O seletor só aparece com um personagem do usuário escolhido, nunca com "Mestre (GM)".
- **Rationale**: as mesmas regras, respostas e o mesmo balão do "Agir", por construção.

## D8 — Apagar (FR-016, FR-017)

- **Decision**: `DELETE /api/chat/{turnId}` grava `deleted_at`.
  - **Quem pode**: o autor, para Text/Image/Audio, ou o mestre, para Text/Image/Audio/Narration.
  - **Outros tipos** → 400. **Sem permissão** → 403.
  - **Evento**: publica `chat.deleted` `{ itemKey }`.
  - **Efeito no turno**: a narração apagada some do resumo, da narração e do histórico, porque as leituras de D2 excluem `deleted_at`.

## D9 — Tempo real (FR-005, FR-011)

- **Decision**:
  - **Tipos novos** em `TableEventType`: `chat.message` (data = `ChatItemInfo`, depois de cada conversa e de cada divisor gravado) e `chat.deleted`.
  - **Registros de turno**: as gravações dos services **continuam** publicando `turn.changed`/`turn.finished`. Ao receber esses eventos, o cliente pede `after` o último item e recarrega a página mais recente, trocando os itens de turno desse intervalo. Assim, desfazer e corrigir somem ou mudam na hora (edge cases). O `resync` ao reconectar faz o mesmo.
- **Rationale**: as ~25 gravações de turno não precisam publicar nada novo.
- **Limitação**: uma correção do mestre num turno antigo, fora da página carregada, aparece quando o usuário recarregar ou rolar até ele.

## D10 — Não lidas (FR-018, FR-019)

- **Decision**: tabela `chat_reads` (`campaign_id`, `user_id` único, `last_read_at`).
  - `PUT /api/campaign/{id}/chat/read` com `{ until }` só avança a marca.
  - `unreadCount` = entradas da campanha não apagadas, de **qualquer** tipo, com `user_id ≠ eu` e `created_at > last_read_at`, limitado a 100.
  - O cliente marca como lido quando o chat fica visível e conforme chegam itens com ele visível.

## D11 — Exclusões

- **Decision**:
  - **Campanha**: `CampaignService.DeleteAsync` já apaga os `turns` da campanha, e agora também os `chat_reads`. Depois do commit, apaga do bucket a foto e o áudio da conversa (`IImageStorageAppService.DeleteAsync`, novo, em modo melhor esforço). A mídia do chat tem referência única, por isso a regra write-once de 032 não se aplica a ela.
  - **Personagem**: `TurnRepository.DeleteByCharacterAsync` passa a apagar só os tipos 1–5 e a anular `character_id` da conversa, que mantém `display_name`/`display_image` (edge case).
  - **NPC e ocorrência de NPC**: inalterados, porque não falam no chat.

## D12 — Layout em três modos (FR-020..FR-024)

- **Decision**:
  - **Modo e persistência**: `lib/layoutMode.ts` (`LAYOUT_MODE` `map`/`split`/`chat`, `localStorage` `roll6:layout` com try/catch), limpo no logout. O estado `layoutMode` fica no `ChatContext`.
  - **Estrutura**: o `MainPage` ganha uma coluna abaixo do `TopMenu` com `.stm-map-region` (relativa) e `.stm-chat-region`, em 50%/50% fixos no modo `split`. No modo `chat`, `MapCanvas`/`StoryView` **não são montados**; o zoom, o pan e a câmera continuam no `MapEditorContext`/`useStoryCamera`.
  - **Camadas do mapa**: `PartyPanel`, `NpcPanel`, `MapControls`, `GridSizeFooter`, joystick e balões passam para dentro de `.stm-map-region`, com CSS relativo à região.
  - **Medidas**: o centro do zoom (`MapControls`) e o `centerOn` (`MapEditorContext`) passam a usar o tamanho da região (`hooks/useMapRegionSize`, com `ResizeObserver`), não mais `window.innerWidth/innerHeight`.
  - **Botão**: `components/menu/LayoutToggle.tsx`, um `btn-group` no `TopMenu` com os ícones `map`, `layout-split` e `chat-dots` em `icons.tsx`, `aria-pressed`, `title`/`aria-label` e o contador no ícone do chat quando o modo é `map`.
  - **Teclado do celular**: `100dvh`, campo de digitar no fim do fluxo e `visualViewport` no iOS.

## D13 — Frontend do chat e aparência por tipo (FR-014, FR-015)

- **Decision**: com a skill `react-architecture` e as regras da constituição:
  - **Estado e serviço**: `types/chat.ts`, `Services/chatService.ts`, `Contexts/ChatContext.tsx` (depois de `TurnProvider`) e `hooks/useChat.ts`.
  - **Componentes**: `components/chat/` com `ChatPanel`, `ChatMessageList` (carga ao topo, marca "Novas mensagens", ancoragem no fim), `ChatItem`, `ChatComposer` (seletor Conversa / Ação, foto, gravador, enviar, estados), `AudioRecorder` e `ImageLightbox`.
  - **Aparência**:

| Tipo | Aparência |
|---|---|
| Text/Image/Audio | balão com avatar (`CharacterAvatar`) e nome; as próprias à direita; Markdown seguro (`MarkdownView`) |
| Movement | linha pequena, `text-body-secondary`, ícone `arrows-move`: "**Aria** (3, 2) → (4, 4), Sul · 3 pts" |
| Action | linha pequena, ícone `lightning`: "**Aria**: *Ataco o goblin*" |
| CharacterUpdate | linha pequena, ícone `pencil`: "**Aria**: Vida 12 → 8 · por GM" |
| ActionResult | cartão leve do mestre com borda de destaque, "Resultado para **Aria**" |
| Narration | cartão largo em destaque, rótulo "Narração — GM (nome)", Markdown |
| TurnFinished | divisor centralizado "Turno N finalizado" |
| apagada | "Mensagem apagada" em itálico |

  - **Compactação** (FR-015): linhas discretas seguidas são agrupadas sem repetir o cabeçalho, e conversa seguida do mesmo autor em até 5 minutos também.
  - **Regras puras**:
    - `lib/chatItems.ts`: mesclar e deduplicar, reconciliar o intervalo de turno, agrupar, contar não lidas, formatar as linhas discretas a partir dos campos estruturados;
    - `lib/layoutMode.ts`;
    - `lib/audioFormat.ts`.
- **Remoções (FR-013)**: saem `TurnConsole`, `TurnConsoleModal`, `hooks/useTurnHistory` (só a UI; o endpoint e o MCP ficam) e `TurnLogModal`. O chevron do rodapé sai e o "Turno N" deixa de ser clicável. Os balões e o sino com "Turno N finalizado" ficam.

## D14 — MCP (FR-025)

- **Decision**: ferramentas novas:
  - `list_chat_messages` (`GET /api/campaign/{id}/chat`);
  - `send_chat_message` (`POST /api/campaign/{id}/chat`, com `characterId` opcional; foto pelo nome devolvido por `upload_image`);
  - `delete_chat_message` (`DELETE /api/chat/{id}`).

  As ferramentas de turno ficam iguais, mas as descrições e o guia passam a dizer que o registro do turno **é** o chat da campanha. `PUT …/chat/read` e `POST /api/chat/audio` entram em `McpToolCatalog.EXCLUDED`. Ficam 89 operações e 90 ferramentas.
