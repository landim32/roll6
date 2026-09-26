# Feature Specification: Chaves de API do usuário

**Feature Branch**: `019-user-api-keys`
**Created**: 2026-09-26
**Status**: Draft
**Input**: User description: "Crie um sistema para gerar API_KEY para acessado da API sem login, onde o usuário pode configurar uma data de expiração. Um usuário pode gerar mais de uma chave de API e pode selecionar quanto tempo irá demorar para expirar. Ou pode ser sem expiração. O link para acessar o modal fica no menu do usuário"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gerar uma chave de API (Priority: P1)

O usuário quer que um script, bot ou ferramenta externa use a API do Roll6 em seu nome sem precisar fazer
login com senha. No menu do usuário ele abre "Chaves de API", dá um nome à chave (ex.: "Bot do Discord"),
escolhe a validade (7 dias, 30 dias, 90 dias, 1 ano, uma data específica ou sem expiração) e gera a chave.
A chave completa é mostrada **uma única vez**, com um botão de copiar e o aviso de que não poderá ser vista
de novo.

**Why this priority**: É o objetivo da funcionalidade; sem gerar a chave nada mais existe.

**Independent Test**: Gerar uma chave pelo menu do usuário, copiá-la e chamar a API com ela (sem login),
recebendo os dados do usuário.

**Acceptance Scenarios**:

1. **Given** o usuário logado, **When** abre o menu do usuário, **Then** vê o item "Chaves de API", que abre o modal.
2. **Given** o modal aberto, **When** informa um nome e escolhe "30 dias", **Then** a chave é criada com expiração daqui a 30 dias e exibida uma única vez com botão de copiar.
3. **Given** o modal, **When** escolhe "Sem expiração", **Then** a chave é criada sem data de expiração (com um aviso de que chaves sem expiração são menos seguras).
4. **Given** o modal, **When** escolhe "Data específica" e informa uma data futura, **Then** a chave expira no fim desse dia; data passada é recusada.
5. **Given** a chave exibida, **When** o usuário fecha o aviso, **Then** a chave completa nunca mais é mostrada (só um trecho identificador).
6. **Given** um nome vazio, **When** tenta gerar, **Then** recebe mensagem de campo obrigatório.

---

### User Story 2 - Usar a API com a chave (Priority: P1)

Uma ferramenta externa envia a chave em cada requisição e é tratada como o usuário dono da chave, sem
login. A chave dá acesso a **tudo o que o usuário pode fazer na API** — ler, criar, alterar e excluir —,
com as mesmas permissões dele, exceto gerenciar chaves e alterar nome/senha da conta, que exigem login.

**Why this priority**: É o uso real da chave; junto com a US1 forma o MVP.

**Independent Test**: Com a chave, listar as campanhas do usuário e mover uma peça; com uma chave expirada,
revogada ou inventada, receber "não autorizado".

**Acceptance Scenarios**:

1. **Given** uma chave válida, **When** uma ferramenta chama a API enviando a chave, **Then** a requisição é atendida como se o dono estivesse logado, respeitando as permissões dele (mestre, participante, dono).
2. **Given** uma chave expirada, **When** usada, **Then** a API responde "não autorizado".
3. **Given** uma chave revogada, **When** usada, **Then** a API responde "não autorizado" imediatamente.
4. **Given** uma chave inexistente ou alterada, **When** usada, **Then** "não autorizado", sem revelar se a chave existe.
5. **Given** uma chave válida, **When** usada para gerenciar chaves de API ou trocar a senha/nome da conta, **Then** a operação é recusada (essas ações exigem login).
6. **Given** uma chave usada com sucesso, **When** o dono abre o modal, **Then** vê a data/hora do último uso.

---

### User Story 3 - Gerenciar as chaves (Priority: P2)

No mesmo modal o usuário vê suas chaves (nome, trecho identificador, criação, expiração, último uso e
situação: ativa, expirada, revogada) e revoga as que não usa mais, com confirmação.

**Why this priority**: Segurança e organização; importante, mas depois de gerar e usar.

**Independent Test**: Criar duas chaves, revogar uma e ver que ela para de funcionar enquanto a outra
continua.

**Acceptance Scenarios**:

1. **Given** várias chaves, **When** o usuário abre o modal, **Then** vê a lista com nome, trecho (ex.: `r6_ab12…`), criação, expiração ("Nunca" quando sem expiração), último uso e situação.
2. **Given** uma chave ativa, **When** o usuário a revoga e confirma, **Then** ela passa a "revogada" e deixa de funcionar na hora.
3. **Given** chaves de outro usuário, **When** o usuário abre o modal, **Then** não as vê nem consegue revogá-las.
4. **Given** o limite de chaves ativas atingido, **When** tenta gerar outra, **Then** recebe uma mensagem pedindo para revogar alguma.

---

### Edge Cases

- A chave é copiada errado/perdida: não há como recuperá-la; o usuário revoga e gera outra.
- Chave usada ao mesmo tempo que o usuário está logado no navegador: ambos funcionam independentemente.
- Conta com senha trocada: as chaves continuam válidas (o usuário revoga se quiser).
- Chave vazada: revogação vale imediatamente em todas as requisições seguintes.
- Tentativas repetidas com chaves inválidas: sempre "não autorizado", sem diferenciar motivos.
- Expiração exatamente agora: a chave é considerada expirada a partir do instante de expiração.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O menu do usuário MUST ter o item "Chaves de API" que abre um modal de gerenciamento.
- **FR-002**: O usuário MUST poder gerar várias chaves, cada uma com nome (obrigatório, até 100 caracteres) e validade: 7 dias, 30 dias, 90 dias, 1 ano, data específica (futura) ou sem expiração.
- **FR-003**: A chave completa MUST ser exibida apenas no momento da criação; o sistema MUST guardar só uma forma não reversível dela e um trecho identificador curto para exibição.
- **FR-004**: Requisições à API com uma chave válida (não expirada, não revogada) MUST ser tratadas como feitas pelo dono da chave, com acesso a todas as operações (leitura e escrita) e as mesmas regras de permissão já existentes (exceções em FR-006).
- **FR-005**: Chaves expiradas, revogadas, inexistentes ou malformadas MUST resultar em "não autorizado", sem indicar o motivo.
- **FR-006**: O gerenciamento de chaves e a alteração de nome/senha da conta MUST exigir login (não aceitam chave de API).
- **FR-007**: O usuário MUST poder listar suas chaves com nome, trecho, criação, expiração, último uso e situação, e revogar qualquer uma (com confirmação); revogação é imediata e definitiva.
- **FR-008**: O sistema MUST registrar a data/hora do último uso de cada chave.
- **FR-009**: Um usuário MUST ter no máximo 10 chaves ativas ao mesmo tempo.
- **FR-010**: Um usuário nunca MUST ver ou revogar chaves de outro usuário.

### Key Entities

- **Chave de API**: pertence a um usuário; nome, trecho identificador, forma não reversível da chave, data de criação, data de expiração (opcional), data do último uso, data de revogação (opcional).
- **Usuário**: já existente; passa a ter chaves de API.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário gera uma chave e faz a primeira chamada à API com ela em menos de 2 minutos.
- **SC-002**: 100% das chamadas com chaves expiradas, revogadas ou inválidas são recusadas nos testes.
- **SC-003**: Uma chave revogada é recusada já na primeira requisição após a revogação.
- **SC-004**: A chave completa não pode ser recuperada depois de criada (nem pela interface, nem pela API, nem a partir dos dados guardados).

## Assumptions

- A chave é enviada num cabeçalho próprio de cada requisição (detalhado no plano), além do login atual, que continua igual.
- "Data específica" expira no fim do dia escolhido (23:59:59, horário de Brasília convertido para UTC).
- Chaves revogadas ou expiradas continuam listadas (para histórico) até o usuário excluí-las; o limite de 10 conta só as ativas.
- O canal em tempo real (feature 017) continua exigindo login; chaves de API servem para a API REST.
- Sem escopos (leitura/escrita) nem limites de uso por chave nesta versão: toda chave tem o alcance completo do usuário, exceto o descrito em FR-006.
