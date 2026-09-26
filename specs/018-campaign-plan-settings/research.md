# Research: Plano de campanha e configuração da campanha (018)

## R1 — Imagens no markdown sem links que expiram

- **Decision**: o texto guarda a imagem como `![legenda](roll6-image:{guid}.{ext})` — só o nome do arquivo
  devolvido por `POST /api/image`, como todas as entidades já fazem. Na leitura, o backend extrai as
  referências (regex `roll6-image:([0-9a-f-]{36}\.[a-z0-9]+)`, validadas por `Guard.ImageFileName`) e devolve
  `imageUrls: { [fileName]: presignedUrl }` junto do plano. O frontend nunca grava a URL: no editor e na
  visualização, o componente `img` troca `roll6-image:x` por `imageUrls[x]` (ou pela URL recebida no upload,
  para imagens inseridas agora).
- **Rationale**: as URLs pré-assinadas expiram (`S3:UrlExpirationMinutes`); guardar só o nome mantém o
  padrão do projeto (FR-003, SC-002) e o texto portátil.
- **Alternatives**: guardar a URL (quebra ao expirar); URL pública do bucket (o bucket é privado);
  proxy `GET /api/image/{file}` (novo endpoint e tráfego pela API — desnecessário).

## R2 — Sanitização com o protocolo próprio

- **Decision**: `rehype-sanitize` com o `defaultSchema` estendido só em `protocols.src` para aceitar
  `roll6-image`, mais `components.img` que resolve a URL. Tudo o mais continua sanitizado como nas fichas
  (FR-004). Novo `lib/planImages.ts` (puro): `planImageRef(fileName)`, `resolvePlanImage(src, urls)`,
  `extractPlanImages(markdown)` + testes; componente `PlanMarkdown` (visualização) e `MarkdownEditor` recebe
  `imageUrls` opcional para a pré-visualização.
- **Alternatives**: substituir as referências no texto antes de renderizar (o editor edita o texto; trocaria
  o que é salvo).

## R3 — Inserir imagem no editor

- **Decision**: botão "Inserir imagem" acima do editor abre o seletor de arquivo → `imageService.upload`
  (mesmos limites do upload atual) → acrescenta `![](roll6-image:{fileName})` na posição do cursor (ou no
  fim) e registra `{ fileName: url }` no mapa local de URLs. Sem recorte (imagens de plano são livres).
- **Alternatives**: comando na toolbar do `@uiw/react-md-editor` (API de comandos mais acoplada; o botão
  externo é simples e testável).

## R4 — Entidade e API

- **Decision**: `CampaignPlan` (`campaign_plans`): `campaign_plan_id`, `campaign_id` (FK
  `fk_campaign_plan`, `ClientSetNull`), `title` (260, obrigatório), `description` (varchar(50000),
  opcional), `created_at`, `changed_at`. Só o mestre lê e escreve (FR-005). Lista sem a descrição (leve);
  detalhe com descrição e `imageUrls`. Excluir a campanha exclui os planos (`CampaignService.DeleteAsync`,
  dentro da transação). Sem evento em tempo real: só o mestre vê os planos.
- Endpoints: `GET /api/campaign/{id}/plan`, `GET /api/campaignplan/{id}`, `POST /api/campaignplan`,
  `PUT /api/campaignplan/{id}`, `DELETE /api/campaignplan/{id}`.

## R5 — Modal de configuração reaproveitando o que existe

- **Decision**: `CampaignSettingsModal` (grande) com `Tabs` Personagens / NPCs / Mapas / Plano; aba lembrada
  em localStorage `roll6:settings-tab`.
  - **Personagens**: extrair o conteúdo do `ManageCharactersModal` para `components/campaign/ManageCharactersPanel`
    (Na campanha / Convidar); o modal antigo passa a embrulhar o painel (o combo "Gerenciar" continua).
  - **NPCs**: lista `NpcContext.campaignNpcs` com editar (`NpcFormModal`, que já tem "Retirar da campanha")
    e "Incluir NPC" (`NpcPickerModal`).
  - **Mapas**: `mapService.listByCampaign` paginado; ações Abrir (guard de alterações não salvas → fecha o
    modal → `loadMapModel` → vira o mapa atual, 017), Arquivar/Reativar (`PUT /api/map/{id}` com `status`) e
    Excluir (`DELETE /api/map/{id}`, com confirmação); selo "Atual" no `currentMapId`. Adicionar
    `mapService.update` e `mapService.remove`.
  - **Plano**: lista (título, datas) + editor (título, `MarkdownEditor` com imagens), Novo/Salvar/Excluir;
    alterações não salvas → `ConfirmModal` antes de trocar de plano, de aba ou fechar (FR-011).
- **Rationale**: reaproveita permissões, textos e testes existentes; nada de lógica duplicada.

## R6 — Botão

- **Decision**: ícone de engrenagem (`btn btn-sm btn-outline-secondary`) logo à direita do `FakeSelect`
  "Campanha atual" no `TopMenu`, visível só com `isMaster && currentCampaign`; `aria-label`/`title`
  "Configuração da campanha".
