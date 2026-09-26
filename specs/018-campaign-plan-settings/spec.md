# Feature Specification: Plano de campanha e configuração da campanha

**Feature Branch**: `018-campaign-plan-settings`
**Created**: 2026-09-26
**Status**: Draft
**Input**: User description: "crie entidade chamada CampaignPlan para armazenar um plano de campanha. Devem ser textos em formato markdown. Os campos são: CampaignId, Title, Description, createdat, changedat. A descrição é em markdown e debe aceitar imagem. Do lado no combo de campanha deve aparecer um botão de configuração. Esse botão deve abrir um modal com todos os dados da campanha, dividido em abas, com personagens, npcs, mapas e plano"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Escrever o plano da campanha (Priority: P1)

O mestre registra o planejamento da campanha (enredo, capítulos, encontros, segredos) em **várias entradas
de plano** — por exemplo uma por capítulo, sessão ou arco —, cada uma com título e descrição formatada
(títulos, listas, negrito, links) e imagens (mapas desenhados, retratos, referências). Ele cria, edita e
exclui essas entradas; a lista mostra as entradas em ordem de criação com as datas.

**Why this priority**: É a funcionalidade nova pedida (a entidade CampaignPlan); sem ela a aba "Plano" não
existe.

**Independent Test**: Como mestre, abrir a configuração da campanha → aba Plano, criar um plano com título,
texto formatado e uma imagem, salvar, fechar e reabrir: o conteúdo e a imagem aparecem iguais.

**Acceptance Scenarios**:

1. **Given** o mestre na aba Plano, **When** cria um plano com título e descrição em markdown, **Then** o plano é salvo com data de criação e aparece formatado.
2. **Given** o mestre editando a descrição, **When** insere uma imagem (enviando um arquivo), **Then** a imagem aparece no texto e continua aparecendo ao reabrir dias depois.
3. **Given** um plano salvo, **When** o mestre altera o texto, **Then** a data de alteração é atualizada e a de criação não.
4. **Given** um plano, **When** o mestre o exclui (com confirmação), **Then** ele some da lista.
5. **Given** um título vazio, **When** o mestre tenta salvar, **Then** recebe uma mensagem de campo obrigatório.

---

### User Story 2 - Abrir a configuração da campanha (Priority: P1)

Ao lado do seletor de campanha, no menu superior, há um botão de configuração (engrenagem). Ele abre uma
janela com os dados da campanha divididos em abas: **Personagens**, **NPCs**, **Mapas** e **Plano**.
**Só o mestre** da campanha vê e usa o botão (o plano guarda os segredos do mestre).

**Why this priority**: É o ponto de entrada da funcionalidade e reúne num lugar só dados hoje espalhados em
várias janelas.

**Independent Test**: Com uma campanha atual, clicar na engrenagem e navegar pelas quatro abas vendo os
personagens, NPCs, mapas e planos da campanha.

**Acceptance Scenarios**:

1. **Given** o mestre com uma campanha atual, **When** clica na engrenagem, **Then** abre a janela "Configuração da campanha — {nome}" com as abas Personagens, NPCs, Mapas e Plano.
2. **Given** nenhuma campanha selecionada, ou um jogador (não mestre), **When** olha o menu, **Then** a engrenagem não aparece.
3. **Given** a janela aberta, **When** o usuário troca de aba, **Then** a aba escolhida é lembrada na próxima abertura.

---

### User Story 3 - Gerenciar personagens, NPCs e mapas pela configuração (Priority: P2)

Nas abas Personagens, NPCs e Mapas o mestre vê as listas completas da campanha **e as gerencia**, com as
ações que já existem hoje em outras janelas: aprovar/negar pedidos, convidar e remover personagens;
incluir, editar e retirar NPCs; abrir, arquivar e excluir mapas. É o painel central da campanha.

**Why this priority**: Organiza o que já existe; a mesa funciona sem isso.

**Independent Test**: Abrir cada aba, conferir as listas e executar uma ação de cada (aprovar um pedido,
retirar um NPC, arquivar um mapa), vendo a lista atualizar.

**Acceptance Scenarios**:

1. **Given** a aba Personagens, **When** aberta, **Then** lista os personagens da campanha com dono e status da participação (aprovado, convidado, pedido de acesso, negado).
2. **Given** a aba NPCs, **When** aberta, **Then** lista os NPCs da campanha com imagem e vida/energia base.
3. **Given** a aba Mapas, **When** aberta, **Then** lista os mapas da campanha (nome, grade, situação) destacando o mapa atual.
4. **Given** um pedido de acesso na aba Personagens, **When** o mestre aprova ou nega, **Then** o status muda na lista; convidar abre a busca de personagens; remover pede confirmação.
5. **Given** a aba NPCs, **When** o mestre inclui (Meus NPCs / Novo NPC), edita ou retira um NPC (com confirmação), **Then** a lista atualiza.
6. **Given** a aba Mapas, **When** o mestre abre um mapa, **Then** a janela fecha e o mapa é aberto (tornando-se o mapa atual da mesa); arquivar e excluir (com confirmação) atualizam a lista.
7. **Given** uma alteração feita em uma aba, **When** a mesa está conectada em tempo real, **Then** os demais participantes veem o reflexo (grupo, NPCs, mapas) como já acontece hoje.

---

### Edge Cases

- Campanha sem personagens, NPCs, mapas ou planos: cada aba mostra uma mensagem de lista vazia.
- Imagem muito grande ou em formato não suportado: upload recusado com mensagem, o texto não é perdido.
- Texto de plano muito longo: aceito até um limite generoso (ver Assumptions); acima disso, mensagem de erro.
- Conteúdo malicioso no markdown (scripts, HTML perigoso): nunca é executado ao exibir.
- Campanha excluída: seus planos são excluídos junto.
- A campanha é trocada com a janela aberta: a janela fecha ou passa a mostrar a nova campanha.
- Alterações não salvas no plano ao fechar a janela ou trocar de aba: pedir confirmação antes de descartar.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST armazenar planos de campanha com: campanha, título, descrição em markdown, data de criação e data de alteração.
- **FR-002**: O título MUST ser obrigatório (até 260 caracteres); a descrição é opcional, em markdown, com um limite de tamanho.
- **FR-003**: A descrição MUST aceitar imagens enviadas pelo usuário, que continuam visíveis em aberturas futuras.
- **FR-004**: A exibição do markdown MUST neutralizar conteúdo perigoso (scripts/HTML ativo).
- **FR-005**: Somente o mestre da campanha MUST poder ler, criar, alterar e excluir planos (os jogadores nunca veem os planos).
- **FR-005a**: Uma campanha MUST poder ter várias entradas de plano, listadas em ordem de criação.
- **FR-006**: A data de alteração MUST ser atualizada a cada edição; a de criação nunca muda.
- **FR-007**: O menu superior MUST exibir um botão de configuração ao lado do seletor de campanha somente para o mestre da campanha atual.
- **FR-008**: O botão MUST abrir uma janela com as abas Personagens, NPCs, Mapas e Plano da campanha atual.
- **FR-009**: As abas Personagens, NPCs e Mapas MUST listar os dados atuais da campanha e oferecer as ações de gerenciamento já existentes (personagens: aprovar, negar, convidar, remover; NPCs: incluir, editar, retirar; mapas: abrir, arquivar, excluir), com confirmação nas ações destrutivas.
- **FR-010**: Excluir a campanha MUST excluir seus planos.
- **FR-011**: Alterações não salvas de um plano MUST ser confirmadas antes de serem descartadas.

### Key Entities

- **Plano de campanha (CampaignPlan)**: uma entrada do planejamento de uma campanha (várias por campanha) — título, descrição em markdown (com imagens), data de criação e de alteração; pertence a uma campanha.
- **Campanha**: já existente; passa a ter planos.
- **Imagem do plano**: imagem enviada pelo mestre e referenciada dentro da descrição.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O mestre cria um plano com texto formatado e uma imagem em menos de 2 minutos.
- **SC-002**: 100% das imagens inseridas em planos continuam visíveis ao reabrir o plano em outro dia.
- **SC-003**: A partir do menu, qualquer dado da campanha (personagens, NPCs, mapas, planos) é alcançado em no máximo 2 cliques.
- **SC-004**: Nenhum conteúdo de plano executa código ao ser exibido (0 ocorrências nos testes de conteúdo malicioso).

## Assumptions

- Imagens usam o mesmo armazenamento de imagens já existente (envio único, referência guardada no texto) e são exibidas por endereços válidos no momento da leitura, não por links que expiram.
- Limite da descrição: 50.000 caracteres (planos podem ser longos).
- O editor de markdown é o mesmo já usado nas fichas (com pré-visualização).
- Datas são exibidas no formato local pt-BR.
- A ordem dos planos é pela data de criação (mais antigos primeiro).
