# Feature Specification: Status e Ficha do Personagem por Campanha

**Feature Branch**: `010-campaign-character-sheet`
**Created**: 2026-09-25
**Status**: Draft
**Input**: User description: "Essa alteração é no back e front: Status do personagem só deve existir no CampaignCharacter; no CampaignCharacter deve existir outro campo Ficha, será uma copia inicial do mesmo campo em Character; o GM só pode alterar os dados do CampaignCharacter"

> **Terminologia**: neste documento, **status do personagem** é o texto livre que descreve a condição do
> personagem (ex.: "envenenado", "inconsciente") — hoje guardado no personagem. Não confundir com a
> **situação da participação** (Convidado / Acesso solicitado / Aprovado / Recusado), que não muda.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mestre ajusta o personagem só dentro da campanha (Priority: P1)

O mestre clica no ícone de editar de um card do painel da campanha. O modal mostra o nome, a foto e os
totais de vida/energia do personagem apenas para leitura, e deixa editar somente o que pertence à
campanha: vida atual, energia atual, status e a ficha da campanha. Ao salvar, o personagem original do
jogador (nome, foto, totais, movimento, ficha original) continua intacto.

**Why this priority**: é a regra de permissão pedida — o mestre não pode mais mexer no personagem do
jogador, só no que acontece com ele na sua mesa.

**Independent Test**: como mestre, editar o card do personagem de um jogador, mudar status para
"envenenado" e a ficha da campanha; salvar; como jogador, abrir o personagem em "Gerenciar personagens"
e confirmar que nome, totais e ficha original não mudaram.

**Acceptance Scenarios**:

1. **Given** o mestre abre o editar do card de um personagem de outro jogador, **When** o modal aparece,
   **Then** nome, imagem, vida total, energia total e movimento aparecem somente para leitura, e vida
   atual, energia atual, status e ficha da campanha são editáveis.
2. **Given** o mestre altera status e ficha da campanha e salva, **When** o modal fecha, **Then** um
   toast confirma e os novos valores ficam gravados só nessa participação.
3. **Given** o mestre tenta alterar dados do personagem em si (nome, imagem, totais, movimento, ficha
   original) por qualquer meio, **When** a alteração é enviada, **Then** o sistema recusa informando que
   não tem permissão, e nada muda.
4. **Given** o mestre também é o dono do personagem, **When** edita o card dele, **Then** pode alterar
   tanto os dados do personagem quanto os da campanha (vale a regra do dono).
5. **Given** o personagem não está aprovado na campanha do mestre, **When** o mestre tenta alterar os
   dados de campanha dele, **Then** o sistema recusa.
6. **Given** um jogador aprovado olha o card do personagem de outro jogador, **When** clica no ícone
   de visualizar, **Then** vê todos os dados (personagem, vida/energia atuais, status e ficha da
   campanha) somente para leitura; qualquer tentativa de alteração é recusada.

---

### User Story 2 - Ficha da campanha nasce como cópia da ficha do personagem (Priority: P1)

Quando um personagem entra numa campanha, a participação recebe uma cópia da ficha do personagem naquele
momento. Daí em diante as duas fichas são independentes: o que o mestre (ou o dono) anota na ficha da
campanha não altera a ficha original, e mudanças posteriores na ficha original não alteram a da
campanha.

**Why this priority**: sem a cópia o mestre não teria onde registrar a evolução do personagem na
campanha sem mexer no personagem do jogador — é a base da US1.

**Independent Test**: criar um personagem com ficha "Força 3", fazê-lo entrar numa campanha, conferir
que a ficha da campanha é "Força 3"; mudar a ficha original para "Força 4" e conferir que a da campanha
continua "Força 3".

**Acceptance Scenarios**:

1. **Given** um personagem com ficha "Força 3", **When** ele passa a ser aprovado numa campanha (pedido
   aprovado, convite aceito ou entrada direta), **Then** a ficha da campanha começa igual a "Força 3" e o
   status começa vazio.
2. **Given** um personagem aprovado em duas campanhas, **When** a ficha da campanha A é alterada,
   **Then** a ficha da campanha B e a ficha original não mudam.
3. **Given** o dono altera a ficha original depois de entrar na campanha, **When** a ficha da campanha é
   consultada, **Then** ela mantém o conteúdo anterior.
4. **Given** um personagem sem ficha, **When** entra na campanha, **Then** a ficha da campanha começa
   vazia.
5. **Given** a ficha da campanha é exibida, **When** tem conteúdo formatado, **Then** é exibida e
   editada da mesma forma que a ficha original (mesmo editor, mesmo limite de tamanho, mesma proteção
   contra conteúdo malicioso).

---

### User Story 3 - Status existe só na campanha (Priority: P2)

O cadastro do personagem deixa de ter o campo "Status". O status passa a ser registrado por campanha,
editável pelo dono ou pelo mestre, a partir do card do painel.

**Why this priority**: o status é algo que acontece durante o jogo (numa mesa específica); mantê-lo no
personagem fazia o mesmo "envenenado" aparecer em todas as campanhas.

**Independent Test**: abrir "Incluir Personagem" e confirmar que não há campo Status; editar o card do
personagem numa campanha, definir "ferido", e confirmar que em outra campanha o status do mesmo
personagem continua vazio.

**Acceptance Scenarios**:

1. **Given** o usuário cria ou edita um personagem fora do contexto de uma campanha, **When** o modal é
   exibido, **Then** não existe o campo Status.
2. **Given** o dono edita o card do próprio personagem no painel, **When** o modal é exibido, **Then**
   ele pode editar os dados do personagem e também vida atual, energia atual, status e ficha desta
   campanha.
3. **Given** um status com mais de 260 caracteres, **When** o usuário tenta salvar, **Then** um toast
   informa o limite e nada é salvo.
4. **Given** personagens que já tinham status antes desta mudança, **When** a mudança é aplicada,
   **Then** o status existente é copiado para as participações desse personagem e deixa de existir no
   personagem.

---

### Edge Cases

- Personagem removido da campanha e aprovado de novo: a nova participação começa com cópia nova da
  ficha atual do personagem, status vazio e vida/energia nos totais (nada da participação anterior é
  recuperado).
- Participação que muda de volta para Aprovado (ex.: pedido aprovado após convite recusado): a ficha da
  campanha é recopiada e o status zerado, junto com vida/energia (mesmo momento em que vida/energia já
  são reiniciadas hoje).
- Participações existentes antes da mudança: recebem cópia da ficha atual do personagem e o status que
  ele tinha.
- Mestre e dono editam os dados de campanha ao mesmo tempo: vale o último salvamento.
- Outro jogador aprovado na campanha (nem dono nem mestre) vê o status e a ficha da campanha de todos
  os personagens aprovados, mas não pode alterá-los: o card dele abre o modal só para leitura.
- Dono salva o modal do card com dados do personagem válidos mas dados de campanha inválidos (ex.:
  vida atual acima do total): nada é salvo parcialmente sem aviso — o toast indica o erro.

## Requirements *(mandatory)*

### Functional Requirements

**Dados**

- **FR-001**: O personagem MUST deixar de ter o campo status; o status MUST existir apenas na
  participação do personagem na campanha, como texto livre opcional de até 260 caracteres.
- **FR-002**: A participação MUST ter um campo ficha da campanha, texto opcional com o mesmo limite de
  tamanho da ficha do personagem (20.000 caracteres).
- **FR-003**: Sempre que uma participação é criada ou passa a Aprovado, a ficha da campanha MUST ser
  preenchida com uma cópia da ficha atual do personagem e o status MUST começar vazio (no mesmo momento
  em que vida e energia atuais são reiniciadas).
- **FR-004**: Depois da cópia, alterações na ficha original MUST NOT afetar a ficha da campanha, e
  vice-versa.
- **FR-005**: Na migração, cada participação existente MUST receber a ficha atual do personagem e o
  status que o personagem tinha; em seguida o status MUST ser removido do personagem.

**Permissões**

- **FR-006**: Somente o dono MUST poder alterar os dados do personagem (nome, imagem, vida total,
  energia total, movimento, ficha original); o mestre da campanha MUST NOT poder alterá-los, a menos
  que também seja o dono.
- **FR-007**: Os dados da participação (vida atual, energia atual, status, ficha da campanha) MUST poder
  ser alterados pelo dono do personagem ou pelo mestre da campanha, apenas enquanto a participação
  estiver Aprovada.
- **FR-008**: Status e ficha da campanha MUST ser visíveis a todos que veem o painel da campanha (mestre
  e participantes aprovados); só o dono e o mestre podem alterá-los.
- **FR-009**: O mestre MUST continuar podendo ver nome, imagem e totais de vida/energia dos personagens
  aprovados na sua campanha (necessários para o painel e para o modal), sem poder alterá-los.
- **FR-010**: Toda tentativa de alteração fora dessas regras MUST ser recusada com mensagem de falta de
  permissão.

**Telas**

- **FR-011**: O modal de cadastro do personagem (inclusão e edição fora do painel) MUST NOT ter o campo
  Status.
- **FR-012**: O modal aberto pelo card do painel MUST mostrar uma área "Nesta campanha" com vida atual,
  energia atual, status e ficha da campanha; a ficha da campanha usa o mesmo editor da ficha original.
- **FR-013**: Quando aberto pelo mestre que não é dono, o modal MUST exibir os dados do personagem
  somente para leitura e permitir salvar apenas a área "Nesta campanha".
- **FR-014**: Quando aberto pelo dono, o modal MUST permitir alterar os dados do personagem e os da
  campanha num único salvamento.
- **FR-015**: Para quem não é dono nem mestre, o card MUST oferecer um ícone de visualizar (no lugar do
  editar) que abre o modal inteiro somente para leitura, com os dados do personagem e a área "Nesta
  campanha", sem botão de salvar.
- **FR-016**: Sucesso e erro MUST ser comunicados por toast; todos os textos em pt-BR.

### Key Entities

- **Personagem**: dono, nome, imagem, vida total, energia total, movimento, ficha original. **Sem
  status.** Só o dono altera.
- **Participação na campanha**: liga o personagem à campanha com a situação (Convidado/Acesso
  solicitado/Aprovado/Recusado) e guarda, por campanha, vida atual, energia atual, **status** e **ficha
  da campanha** (cópia inicial da ficha original). Alterável pelo dono ou pelo mestre enquanto
  Aprovada.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das tentativas do mestre (não dono) de alterar dados do personagem em si são
  recusadas; 100% das alterações dele nos dados da participação aprovada são aceitas.
- **SC-002**: Um personagem que entra numa campanha tem a ficha da campanha idêntica à ficha original em
  100% dos casos no momento da entrada.
- **SC-003**: Alterar a ficha ou o status em uma campanha não altera nenhum dado de outra campanha nem do
  personagem (verificado em 100% dos casos testados).
- **SC-004**: Após a migração, nenhum status existente é perdido: todo personagem que tinha status o tem
  em cada uma das suas participações.
- **SC-005**: O mestre registra status e anotação na ficha da campanha a partir do mapa em no máximo 3
  passos (editar → alterar → salvar).

## Assumptions

- A mudança envolve backend e frontend: remoção do status do personagem, novos campos status e ficha na
  participação, migração dos dados existentes, nova regra de permissão (o mestre deixa de editar o
  personagem, revogando essa permissão dada na feature 009) e ajustes no modal e no painel.
- O dono também pode editar status e ficha da campanha (o pedido restringe o mestre, não o dono), do
  mesmo jeito que já pode editar vida/energia atuais.
- A cópia da ficha acontece nos mesmos momentos em que vida/energia atuais já são reiniciadas (entrada
  na campanha); não existe ação de "recopiar" ou sincronizar a ficha manualmente.
- Participações não aprovadas guardam os campos, mas eles só são editáveis e relevantes enquanto
  Aprovadas; ao aprovar, são reiniciados.
- O card do painel continua mostrando só foto, nome e barras; exibir o status no card fica fora do
  escopo.
- A visibilidade vale só dentro da campanha (painel): a busca pública de personagens continua sem expor
  ficha nem status, e quem não participa da campanha não vê nada.
