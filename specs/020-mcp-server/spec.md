# Feature Specification: Servidor MCP do Roll6

**Feature Branch**: `020-mcp-server`
**Created**: 2026-09-26
**Status**: Draft
**Input**: User description: "Crie um MPC com todos os recursos da API, funcionando exatamente com os mesmos recursos, mas o MCP deve ser mais descritivo"

## Contexto

MCP (Model Context Protocol) é o padrão pelo qual assistentes de IA (Claude Desktop, Claude Code e outros)
descobrem e usam ferramentas. Um servidor MCP do Roll6 permite que um mestre ou jogador peça a um
assistente coisas como "mova a Aria dois hexes para cima", "crie um NPC goblin e coloque no mapa" ou
"resuma o que aconteceu no turno 3" — e o assistente executa usando os mesmos recursos da API.

Escopo: as 73 operações da API disponíveis para chaves de API (feature 019), agrupadas por área:

| Área | Operações |
|---|---|
| Usuário | ver o próprio perfil |
| Imagens | enviar imagem |
| Tokens (biblioteca) | listar/buscar, ver, criar, alterar, excluir |
| Personagens | listar os meus, buscar públicos, ver, criar, alterar, excluir |
| NPCs (biblioteca) | listar/buscar, ver, criar, alterar, excluir |
| Campanhas | listar/buscar, ver, criar, renomear, abrir/fechar, excluir, mapa atual; listar personagens, NPCs, mapas e planos |
| Participação | pedir acesso, convidar, convites pendentes, aceitar, recusar, aprovar, negar, minhas participações, ver, alterar dados na campanha, remover |
| NPCs da campanha / do mapa | incluir/retirar da campanha; colocar no mapa, alterar ocorrência, excluir ocorrência; listar NPCs do mapa |
| Modelos de mapa | listar/buscar, ver, criar, alterar, excluir |
| Mapas da campanha | ver, criar, renomear/arquivar, excluir, listar peças |
| Peças do mapa | incluir objeto, colocar personagem, mover/girar, trocar token, alterar, excluir |
| Turnos | estado do turno, registros de um turno, agir, resetar, registrar/excluir (mestre), finalizar |
| Plano da campanha | ver, criar, alterar, excluir |

Fora do escopo (exigem login humano, como na API): cadastro e login, alterar nome/senha e gerenciar chaves de API.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Conectar um assistente ao Roll6 (Priority: P1)

O usuário gera uma chave de API (019), configura o servidor MCP do Roll6 no seu assistente e o assistente
passa a listar as ferramentas do Roll6, agindo como aquele usuário.

**Why this priority**: Sem a conexão nenhuma ferramenta pode ser usada.

**Independent Test**: Configurar o assistente com a chave e pedir "quais campanhas eu tenho?": o assistente
chama a ferramenta certa e responde com as campanhas do usuário.

**Acceptance Scenarios**:

1. **Given** uma chave válida configurada, **When** o assistente conecta, **Then** ele recebe a lista completa de ferramentas do Roll6 com nome, descrição e parâmetros.
2. **Given** uma chave inválida, expirada ou revogada, **When** o assistente tenta usar uma ferramenta, **Then** recebe uma mensagem clara de "chave inválida ou expirada" e nada é executado.
3. **Given** a chave de um jogador, **When** ele usa ferramentas de mestre em campanha alheia, **Then** recebe a mesma recusa que a API daria, com a explicação.

---

### User Story 2 - Todas as operações da API como ferramentas (Priority: P1)

Cada uma das 73 operações do escopo existe como ferramenta, com o mesmo comportamento, as mesmas regras de
permissão e validação e os mesmos resultados da API.

**Why this priority**: É o pedido central ("todos os recursos, funcionando exatamente com os mesmos recursos").

**Independent Test**: Para uma amostra de operações de cada área, o resultado pela ferramenta é idêntico ao da
chamada direta à API com a mesma chave (dados, erros e efeitos).

**Acceptance Scenarios**:

1. **Given** uma peça no mapa, **When** o assistente move a peça pela ferramenta, **Then** a peça muda de lugar, o movimento entra no turno e os outros participantes veem na hora (017), exatamente como pela API.
2. **Given** dados inválidos (ex.: nome vazio), **When** a ferramenta é chamada, **Then** o erro devolvido traz os mesmos campos e mensagens de validação da API.
3. **Given** uma lista paginada, **When** a ferramenta é chamada com página e busca, **Then** devolve a mesma página e o total da API.
4. **Given** uma operação que a API recusa (conflito, permissão, não encontrado), **When** feita pela ferramenta, **Then** a recusa tem o mesmo motivo.

---

### User Story 3 - Descrições que ensinam o assistente a usar o Roll6 (Priority: P2)

As ferramentas são mais descritivas que a API: cada uma explica o que faz, quem pode usar, o que cada
parâmetro significa (com unidades, limites e exemplos), o que devolve, os erros comuns e quais ferramentas
usar antes ou depois. Há também um guia geral do Roll6 (conceitos: campanha, mestre, participação, mapa e
modelo, grade hexagonal com coluna/linha e sentido 0–5, turnos) disponível ao assistente — tudo **em inglês**, o padrão das ferramentas de IA (as mensagens de erro vindas da API continuam em português).

**Why this priority**: É o diferencial pedido ("mais descritivo"); sem ele o assistente erra parâmetros como
coordenadas e sentido.

**Independent Test**: Um assistente sem conhecimento prévio do Roll6, só com as descrições, consegue realizar
um roteiro de 10 tarefas (criar campanha, mapa, personagem, colocar e mover peças, agir, finalizar turno)
sem erros de parâmetro.

**Acceptance Scenarios**:

1. **Given** a ferramenta de mover peça, **When** o assistente lê a descrição, **Then** ela explica coluna/linha, o sentido 0–5 no sentido horário a partir do topo, o custo do movimento e que o jogador só move o próprio personagem uma vez por turno.
2. **Given** qualquer ferramenta, **When** lida, **Then** informa quem pode usá-la (mestre, dono, participante aprovado, qualquer usuário).
3. **Given** um identificador necessário (ex.: `mapTokenId`), **When** o assistente não o tem, **Then** a descrição indica qual ferramenta o fornece.

---

### Edge Cases

- Imagens: o envio aceita o conteúdo do arquivo enviado pelo assistente, com os mesmos formatos e limite de tamanho da API.
- Respostas grandes (fichas, planos em markdown): devolvidas integralmente; listas continuam paginadas como na API.
- Operações destrutivas (excluir campanha, mapa, personagem): a descrição avisa que são irreversíveis e pede para o assistente confirmar com o usuário.
- A API muda (novo endpoint): fica fora do MCP até ser incluído — a lista de ferramentas é mantida junto com a API.
- Muitas chamadas seguidas: cada chamada é uma operação da API; não há transações entre ferramentas.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST oferecer um servidor MCP que expõe uma ferramenta para cada uma das 73 operações do escopo.
- **FR-002**: Cada ferramenta MUST produzir exatamente o mesmo efeito, resultado, validação e permissão que a operação equivalente da API.
- **FR-003**: O acesso MUST ser autenticado com as chaves de API da feature 019, agindo como o dono da chave; sem chave válida, nenhuma ferramenta executa.
- **FR-004**: Operações que exigem login humano (cadastro, login, nome/senha, chaves de API) MUST NOT ser expostas.
- **FR-005**: Cada ferramenta MUST ter uma descrição que explique: o que faz, quem pode usar, cada parâmetro (tipo, obrigatoriedade, limites, unidades, exemplo), o retorno, erros comuns e ferramentas relacionadas.
- **FR-006**: O servidor MUST disponibilizar um guia geral dos conceitos do Roll6 que o assistente possa consultar.
- **FR-007**: Erros MUST ser devolvidos de forma legível para o assistente, preservando o motivo e os campos de validação da API.
- **FR-008**: Ferramentas destrutivas MUST ser marcadas como tais (descrição e indicação padrão do protocolo), e ferramentas só de leitura MUST ser marcadas como somente leitura.
- **FR-009**: Alterações feitas pelo MCP MUST disparar os mesmos avisos em tempo real (017) que as feitas pela API.
- **FR-010**: A documentação MUST explicar como configurar o servidor MCP em um assistente (endereço/comando e chave).
- **FR-011**: O servidor MCP MUST ser como **serviço remoto hospedado junto com a API**: o assistente conecta por um endereço (ex.: `https://{domínio}/mcp`) informando a chave, sem instalar nada; o serviço sobe junto nos ambientes de homologação e produção.

### Key Entities

- **Ferramenta MCP**: operação exposta ao assistente — nome, descrição detalhada, parâmetros descritos, indicação de leitura/destrutiva, operação da API correspondente.
- **Guia do Roll6**: texto de referência dos conceitos do domínio, consultável pelo assistente.
- **Chave de API**: existente (019); identifica o usuário por trás do assistente.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das 73 operações do escopo estão disponíveis como ferramentas.
- **SC-002**: Em uma amostra de pelo menos 2 operações por área, 100% dos resultados via MCP são idênticos aos da API (sucesso e erro).
- **SC-003**: Um assistente sem conhecimento prévio completa o roteiro de 10 tarefas do quickstart sem erros de parâmetro.
- **SC-004**: Um usuário configura o MCP no seu assistente em menos de 5 minutos seguindo a documentação.
- **SC-005**: 0 operações executadas sem chave válida nos testes.

## Assumptions

- Autenticação exclusivamente por chave de API (019), com o mesmo alcance do usuário (019 Q1 → A).
- As regras de negócio não são duplicadas: o MCP usa as mesmas regras da API, garantindo comportamento idêntico.
- Nomes de ferramentas, descrições, parâmetros e o guia em inglês (Q2 → B), com nomes curtos e estáveis (ex.: `move_map_token`); as mensagens de validação/erro da API continuam em português e são repassadas como estão.
- Servidor remoto no mesmo endereço público da API (Q1 → A); não há versão local para instalar.
- Sem novas operações além das da API (ex.: nada de "resumir campanha" composto); composições ficam a cargo do assistente.
