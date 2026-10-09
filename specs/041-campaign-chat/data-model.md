# Data Model: Chat da campanha (041)

## Turn (`turns`) — a mensagem da campanha (estendida)

`TurnType`:

| Valor | Nome | Uso |
|---|---|---|
| 1 | Movement | (existente) movimento de peça |
| 2 | Action | (existente) ação — pelo "Agir" do mapa ou pelo seletor Ação do chat |
| 3 | ActionResult | (existente) resultado, só pela API/IA |
| 4 | CharacterUpdate | (existente) mudança de personagem/NPC |
| 5 | Narration | (existente) narração, só pela API/IA |
| 6 | Text | **nova** conversa em texto |
| 7 | Image | **nova** conversa com foto (+ legenda opcional em `description`) |
| 8 | Audio | **nova** conversa com áudio (+ legenda opcional) |
| 9 | TurnFinished | **novo** divisor "Turno N finalizado" (`turn_no` = turno finalizado) |

`TurnTypes.LOG = {1..5}` (o que as leituras e regras de turno consideram) · `TurnTypes.CONVERSATION = {6,7,8}`.

Colunas novas (todas anuláveis):

| Campo | Coluna | Tipo | Regras |
|---|---|---|---|
| `DisplayName` | `display_name` | varchar(260) | conversa: nome do personagem ou "Mestre (GM) — {usuário}" no envio |
| `DisplayImage` | `display_image` | varchar(260) | conversa: `{guid}.{ext}` da foto do personagem no envio |
| `Image` | `image` | varchar(260) | obrigatório em Image (`Guard.ImageFileName`) |
| `Audio` | `audio` | varchar(260) | obrigatório em Audio (`{guid}.webm|mp4|m4a|ogg`) |
| `AudioSeconds` | `audio_seconds` | integer | Audio: 1–120 |
| `DeletedAt` | `deleted_at` | timestamp | apagada (Text/Image/Audio/Narration) |

Colunas existentes reaproveitadas na conversa: `campaign_id`, `turn_no` (turno em andamento), `map_id` (mapa atual, pode ser nulo), `user_id` (autor), `character_id` (personagem que fala; nulo = mestre), `description` (texto: 1–4000 em Text; ≤ 4000 como legenda), `created_at`.

Índice novo `ix_turns_campaign_created` (`campaign_id`, `created_at`, `turn_id`).

**Fábricas e regras de domínio** (`Turn`):
- `Turn.Text(campaignId, mapId, turnNo, userId, characterId?, displayName, displayImage?, text)` — texto 1–4000 após trim, senão 400.
- `Turn.Image(..., image, caption?)`, `Turn.Audio(..., audio, seconds, caption?)` — mídia obrigatória e válida, duração 1–120.
- `Turn.TurnFinished(campaignId, turnNo, userId)`.
- `Delete(userId, isMaster)` — autor: 6–8; mestre: 5–8; outros tipos 400; sem permissão 403; já apagada = no-op.
- `IsLog` (1–5), `IsConversation` (6–8).

**Migração `AddCampaignChat`**: colunas acima; índice; `chat_reads`; para cada campanha e cada `turn_no < current_turn` com entradas, um `TurnFinished` em `max(created_at)+1ms` (user = mestre). Mesmo SQL em `database/migrations/041-campaign-chat.sql`.

## ChatRead (`chat_reads`) — nova

| Campo | Coluna | Tipo | Regras |
|---|---|---|---|
| `ChatReadId` | `chat_read_id` | bigint identity | PK `chat_reads_pkey` |
| `CampaignId` | `campaign_id` | bigint | FK `fk_campaign_chat_read` (ClientSetNull) |
| `UserId` | `user_id` | bigint | FK `fk_user_chat_read`; único (`campaign_id`, `user_id`) |
| `LastReadAt` | `last_read_at` | timestamp | só avança |

## ChatItemInfo (DTO)

| Campo | Descrição |
|---|---|
| `key` | `t{turnId}` |
| `cursor` | `{createdAt.Ticks}_{turnId}` |
| `kind` | `text` \| `image` \| `audio` \| `movement` \| `action` \| `actionResult` \| `characterUpdate` \| `narration` \| `turnFinished` |
| `turnId`, `turnNo`, `createdAt`, `userId`, `mapId` | |
| `characterId`, `npcId`, `mapNpcId` | ator / quem fala |
| `displayName`, `displayImageUrl` | conversa: gravados; turno: rótulo do ator (mesmo do `TurnSummary`) e imagem atual do personagem/NPC |
| `authorLabel` | quem fez, quando diferente do ator (ex.: "GM (Rodrigo)") |
| `text` | conversa: texto/legenda; narração: markdown; demais: a linha do `TurnSummary` |
| `before`, `after` (`{x,y,look,lookName}`), `moved`, `movedTotal` | movimento |
| `changes` (`[{field, label, before, after}]`) | mudança de personagem |
| `imageUrl`, `audioUrl`, `audioSeconds`, `audioType` | mídia (pré-assinadas) |
| `deleted`, `canDelete` | |

## Frontend

- `types/chat.ts`: `ChatItemInfo`, `ChatPageInfo`, `ChatSendInfo`, `ChatAudioUploadInfo`; kinds como `as const`.
- `lib/layoutMode.ts`: `LAYOUT_MODE`, chave `roll6:layout`.
- Composer: `mode: 'talk' | 'action'`; pendentes `{ tempKey, status: 'sending' | 'failed', payload }`.
