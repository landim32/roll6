# Feature Specification: Ficha do personagem por campanha (texto e arquivo)

**Feature Branch**: `032-campaign-sheet-copy`
**Created**: 2026-09-30
**Status**: Draft
**Input**: User description: "Faça algumas alterações:
- Crie uma ficha em markdown e imagem/pdf dos personagens para a campanha
- Ao adicionar o personagem a campanha, deve copiar do personagem original
- O GM daquela campanha não pode alterar o personagem original, mas pode alterar esse da campanha
- No frontend, na tela do personagem, o GM passa a poder alterar a ficha. Nessa tela deve exibir a ficha da campanha, não do original"

> **Terminologia**: neste documento, **ficha original** é o conjunto que pertence ao personagem e vale para
> todas as campanhas — a ficha em texto (markdown) e a ficha em arquivo (imagem ou PDF, feature 022).
> **Ficha da campanha** é a cópia desses dois itens que passa a existir dentro de cada participação do
> personagem numa campanha. **Mestre** (ou GM) é o dono da campanha; **dono** é o dono do personagem.
>
> **Relação com as features anteriores**: a feature 010 criou a ficha da campanha como cópia da original; a
> feature 023 transformou esse mesmo campo em "Anotações da Campanha", texto que começa vazio e serve só para
> registrar o que mudou. **Esta feature substitui as anotações**: a participação volta a ter uma cópia completa
> da ficha do personagem, agora também em arquivo, e passa a ter uma tela própria — separada da tela do
> personagem, que trata apenas do que é permanente.

## Decisões incorporadas

| # | Pergunta | Decisão |
|---|----------|---------|
| 1 | A ficha da campanha em texto substitui as "Anotações da Campanha" ou as duas coexistem? | **Substitui.** Uma única área de texto por campanha, que começa como cópia da ficha original. A aba passa a se chamar "Ficha da Campanha". |
| 2 | Onde o dono edita a ficha original, se a tela da campanha passa a mostrar só a da campanha? | **Dois modais diferentes.** O modal do personagem (ficha original, dados permanentes) e o modal da campanha (o que pertence à participação) deixam de ser a mesma tela. |
| 3 | Onde o dono chega ao modal do personagem para editar? | **Na lista "Selecionar personagem"**, com um ícone de editar em cada personagem, ao lado do já existente ícone de transferir. |
| 4 | O que as participações já existentes recebem na migração? | **Cópia da ficha atual do personagem com as anotações existentes anexadas ao final**, numa seção identificada. Nada é descartado. |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A campanha recebe uma cópia da ficha do personagem (Priority: P1)

Quando um personagem entra numa campanha (pedido aprovado, convite aceito ou entrada direta em campanha
aberta), a participação dele passa a guardar uma **cópia** da ficha do personagem naquele momento: o texto em
markdown e o arquivo (imagem ou PDF), se existir. A partir daí a campanha tem a própria ficha — ela não é mais
apenas um bloco de anotações sobre o que mudou, e sim a ficha completa do personagem válida para aquela mesa.

**Why this priority**: É a base de todo o resto. Sem a cópia, o mestre não tem onde registrar a ficha do
personagem na sua campanha sem mexer no personagem do jogador.

**Independent Test**: Criar um personagem com ficha em texto "Força 3" e um PDF anexado, fazê-lo entrar numa
campanha e abrir a participação: a ficha em texto da campanha é "Força 3" e o arquivo da campanha é o mesmo
PDF. Em seguida, mudar a ficha original para "Força 4" e trocar o arquivo: a ficha da campanha continua
"Força 3" com o PDF antigo.

**Acceptance Scenarios**:

1. **Given** um personagem com ficha em texto e um arquivo de ficha, **When** ele passa a ser aprovado numa campanha, **Then** a participação guarda uma cópia do texto e do arquivo exatamente como estavam no momento da entrada.
2. **Given** um personagem sem ficha em texto e sem arquivo, **When** ele entra na campanha, **Then** a ficha da campanha começa vazia nos dois formatos, sem erro.
3. **Given** um personagem com ficha em texto mas sem arquivo, **When** ele entra na campanha, **Then** a cópia traz o texto e a ficha em arquivo da campanha fica vazia.
4. **Given** um personagem aprovado em duas campanhas, **When** a ficha da campanha A é alterada, **Then** a ficha da campanha B e a ficha original continuam iguais.
5. **Given** um personagem já aprovado numa campanha, **When** o dono altera a ficha original (texto ou arquivo), **Then** a ficha da campanha mantém o conteúdo que tinha — não há sincronização automática.
6. **Given** uma ficha em arquivo copiada para a campanha, **When** ela é baixada ou aberta, **Then** o conteúdo é idêntico ao do arquivo original do momento da cópia (mesmo formato, sem conversão).

---

### User Story 2 - O mestre altera a ficha da campanha sem tocar no personagem (Priority: P1)

O mestre da campanha abre o personagem pelo card do painel e edita a ficha **da campanha**: o texto em markdown
e o arquivo (imagem ou PDF), podendo substituí-lo por outro ou removê-lo. Tudo o que pertence ao personagem em
si — nome, foto, vida total, energia total, movimento, ficha original em texto e arquivo original — nem aparece
como editável para ele e não é alterado por nenhuma operação da campanha.

**Why this priority**: É a regra de permissão pedida. Hoje o mestre só lê a ficha; com isto ele passa a conduzir
a evolução do personagem na própria mesa sem depender do jogador e sem invadir o personagem dele.

**Independent Test**: Como mestre (não dono), abrir o card de um personagem aprovado, editar o texto da ficha da
campanha, enviar um novo arquivo de ficha e salvar. Reabrir: as alterações estão lá. Como dono do personagem,
abrir a ficha original dele e confirmar que texto e arquivo não mudaram.

**Acceptance Scenarios**:

1. **Given** o mestre (não dono) abre o card de um personagem aprovado, **When** a tela aparece, **Then** ele pode editar a ficha em texto da campanha e substituir ou remover o arquivo da campanha.
2. **Given** o mestre altera a ficha da campanha e salva, **When** a tela fecha, **Then** uma mensagem confirma e os novos valores ficam gravados só naquela participação.
3. **Given** o mestre tenta alterar nome, foto, vida total, energia total, movimento, ficha original em texto ou arquivo original por qualquer meio (tela, API ou ferramenta externa), **When** a alteração é enviada, **Then** o sistema recusa informando falta de permissão e nada muda.
4. **Given** o mestre também é o dono do personagem, **When** edita o card, **Then** pode alterar a ficha da campanha ali; para alterar a ficha original ele usa o modal do personagem, como qualquer dono.
5. **Given** o dono do personagem, **When** edita a ficha da campanha, **Then** também consegue — ele mantém tudo o que já pode fazer hoje na própria participação.
6. **Given** um personagem que não está aprovado na campanha, **When** o mestre tenta alterar a ficha da campanha dele, **Then** o sistema recusa.
7. **Given** um participante aprovado que não é dono nem mestre, **When** abre o card do personagem, **Then** vê a ficha da campanha somente para leitura; qualquer tentativa de alteração é recusada.
8. **Given** o mestre envia um arquivo de tipo não permitido, acima do limite ou com conteúdo incompatível com o tipo declarado, **When** tenta salvar, **Then** recebe uma mensagem clara e nada é salvo.

---

### User Story 3 - O dono edita a ficha original num modal próprio do personagem (Priority: P1)

A edição do personagem deixa de acontecer dentro da campanha. O modal aberto pelo combo "Incluir Personagem"
passa a ter também modo de edição, tratado dos dados permanentes (nome, foto, vida total, energia total,
movimento) e da ficha original em texto e em arquivo — e é acessado pelo dono a partir de um ícone de editar em
cada personagem da lista "Selecionar personagem", ao lado do ícone de transferir que já existe. O modal aberto
pelo card do painel da campanha passa a tratar só do que pertence àquela campanha.

**Why this priority**: Sem isto o dono perde o único caminho que tem hoje para editar a ficha do próprio
personagem — seria uma regressão. Precisa chegar junto com a US2.

**Independent Test**: Como dono, abrir "Selecionar personagem", clicar no ícone de editar de um personagem,
mudar o nome e a ficha original em texto, trocar o arquivo e salvar. Reabrir pela lista: as alterações estão lá.
Abrir o card do mesmo personagem numa campanha em que ele é aprovado: a ficha da campanha continua com o
conteúdo anterior, sem as alterações da ficha original.

**Acceptance Scenarios**:

1. **Given** o dono abre "Selecionar personagem", **When** a lista aparece, **Then** cada personagem dele tem um ícone de editar, além do de transferir.
2. **Given** o dono clica no ícone de editar, **When** o modal do personagem abre, **Then** ele vê e altera nome, foto, vida total, energia total, movimento, ficha original em texto e ficha original em arquivo — e não vê nada de campanha.
3. **Given** o dono salva o modal do personagem, **When** a tela fecha, **Then** uma mensagem confirma e nenhuma participação é alterada (vida atual, energia atual, status, postura e ficha da campanha continuam como estavam).
4. **Given** o combo "Incluir Personagem", **When** o dono o usa para criar, **Then** o fluxo de criação continua o mesmo de hoje: cria o personagem e, havendo campanha atual, já o coloca nela.
5. **Given** um usuário que não é o dono, **When** tenta abrir o modal do personagem de outro usuário ou salvá-lo, **Then** o sistema recusa.
6. **Given** o modal do personagem aberto pelo dono, **When** ele altera os totais de vida ou energia para baixo, **Then** o comportamento atual de ajustar os valores atuais das participações é mantido.

---

### User Story 4 - A tela do personagem na campanha mostra a ficha da campanha (Priority: P2)

Dentro de uma campanha, o modal aberto pelo card do painel exibe a ficha **da campanha** — texto e arquivo. É
essa cópia que a mesa acompanha durante a sessão. A ficha original continua existindo e intacta, mas não aparece
ali para ninguém: quem precisa dela abre o modal do personagem.

**Why this priority**: Dá uso à cópia na mesa. Depende da US1 (existir a cópia) e da US2 (o mestre poder
alterá-la), mas pode ser testada e entregue logo em seguida.

**Independent Test**: Com um personagem aprovado cuja ficha original diz "Força 3" e a ficha da campanha diz
"Força 5", abrir o card no painel da campanha como mestre, como dono e como outro participante: os três veem
"Força 5" e nenhum vê "Força 3" naquela tela.

**Acceptance Scenarios**:

1. **Given** um personagem aprovado cuja ficha da campanha difere da original, **When** qualquer pessoa com acesso abre o card no painel da campanha, **Then** a área de ficha mostra o conteúdo da campanha, não o da original.
2. **Given** a mesma situação, **When** a ficha em arquivo da campanha é aberta, **Then** é exibido o arquivo da campanha.
3. **Given** uma campanha sem ficha em arquivo para o personagem (mesmo que o personagem tenha arquivo original), **When** alguém abre o card, **Then** a área informa que não há ficha em arquivo nesta campanha, sem exibir o arquivo original.
4. **Given** o dono do personagem, **When** abre o card na campanha, **Then** ele vê e edita só o que é da campanha; para chegar à ficha original ele usa o modal do personagem, pela lista "Selecionar personagem".
5. **Given** o personagem é criado ("Incluir Personagem") sem campanha atual, **When** o formulário é exibido, **Then** a área de ficha trata da ficha original, pois ainda não existe participação nem cópia.
6. **Given** um usuário que não participa da campanha, **When** tenta acessar a ficha da campanha, **Then** não consegue.

---

### User Story 5 - As fichas são independentes entre si e entre campanhas (Priority: P3)

Cada campanha tem a sua própria ficha do personagem, e nenhuma delas interfere na ficha original nem nas fichas
das outras campanhas. Não existe ação de "recopiar" ou "sincronizar" a ficha original para a da campanha depois
da entrada.

**Why this priority**: É a garantia de consistência que fecha a funcionalidade; sozinha não entrega valor novo,
mas protege o que as histórias anteriores criaram.

**Independent Test**: Com o mesmo personagem aprovado em duas campanhas, alterar a ficha da campanha A (texto e
arquivo) e a ficha original; conferir que a campanha B não mudou nada.

**Acceptance Scenarios**:

1. **Given** um personagem aprovado em duas campanhas, **When** a ficha da campanha A (texto ou arquivo) é alterada, **Then** nem a campanha B nem a ficha original são afetadas.
2. **Given** uma ficha da campanha já alterada, **When** o dono muda a ficha original, **Then** a ficha da campanha não é sobrescrita.
3. **Given** um personagem removido da campanha e aprovado de novo, **When** a nova participação é criada, **Then** ela recebe uma cópia nova da ficha atual do personagem (texto e arquivo), no mesmo momento em que vida e energia atuais já são reiniciadas.
4. **Given** uma participação que volta para Aprovado (ex.: pedido aprovado após convite recusado), **When** a aprovação acontece, **Then** a ficha da campanha é recopiada do personagem, junto com o reinício de vida, energia, status e postura.
5. **Given** um personagem transferido para outro usuário (021), **When** a transferência é concluída, **Then** as fichas das campanhas em que ele participa são preservadas.

---

### Edge Cases

- **Participações que já existem na migração**: recebem uma cópia da ficha em texto atual do personagem com as anotações existentes anexadas ao final, numa seção identificada; e uma cópia do arquivo atual do personagem. Se as anotações estiverem vazias, a ficha da campanha fica só com a cópia.
- **Cópia na migração que estoura o limite de 20.000 caracteres**: as anotações existentes são preservadas integralmente e o texto copiado do personagem é reduzido até caber.
- **Migração de participações não aprovadas** (convidado, acesso solicitado, recusado): também recebem a cópia, mas ela só é visível e editável quando a participação for aprovada — e é recopiada nesse momento.
- Personagem com ficha original perto do limite de 20.000 caracteres: a cópia cabe no mesmo limite, pois tem o mesmo tamanho; se a ficha da campanha for editada além do limite, o salvamento é recusado com mensagem clara.
- Arquivo de ficha original que não atenda às regras de tipo ou tamanho no momento da cópia: a cópia do arquivo é desfeita com mensagem clara e a participação é criada mesmo assim, apenas sem ficha em arquivo.
- O mestre remove o arquivo da ficha da campanha: a campanha fica sem ficha em arquivo, e o arquivo original do personagem continua existindo e acessível ao dono.
- O arquivo da ficha da campanha é substituído: o arquivo anterior da campanha deixa de ser referenciado (a limpeza de arquivos órfãos continua fora do escopo, como na 022).
- Mestre e dono editam a ficha da campanha ao mesmo tempo: vale o último salvamento.
- Envio do arquivo interrompido ou com falha: a ficha da campanha mantém o conteúdo anterior (ou fica sem arquivo), e nada é gravado parcialmente sem aviso.
- Links para o arquivo da ficha expiram depois de um tempo; quem está com a tela aberta obtém um link novo ao reabrir o card.
- Personagem sem ficha em texto e sem arquivo entra na campanha: a ficha da campanha fica vazia nos dois formatos e a tela informa isso, sem quebrar.
- Personagem que participa de muitas campanhas: cada participação guarda a própria cópia do arquivo, então o mesmo PDF pode ocupar espaço várias vezes.
- A ficha em arquivo da campanha é visível para as mesmas pessoas que já veem os dados do personagem naquela campanha (mestre, dono e participantes aprovados) — e para mais ninguém.
- O token do personagem continua sendo escolhido na tela da campanha pelo dono e pelo mestre, como hoje; a separação dos modais não muda isso.

## Requirements *(mandatory)*

### Functional Requirements

**Dados**

- **FR-001**: A participação de um personagem numa campanha MUST guardar uma ficha em texto da campanha (markdown, opcional, com o mesmo limite de tamanho da ficha do personagem: 20.000 caracteres), que **substitui** as atuais "Anotações da Campanha" — a participação MUST ter uma única área de texto.
- **FR-002**: A participação MUST guardar uma referência opcional a uma ficha em arquivo da campanha (imagem PNG, JPG ou WebP, ou documento PDF), com as mesmas regras de tipo, tamanho máximo (10 MB) e integridade de conteúdo já aplicadas à ficha em arquivo do personagem.
- **FR-003**: Sempre que uma participação é criada ou passa a Aprovado, a ficha em texto da campanha MUST ser preenchida com uma cópia da ficha em texto atual do personagem e a ficha em arquivo da campanha MUST receber uma cópia do arquivo atual do personagem (ou ficar vazia, se ele não tiver arquivo), no mesmo momento em que vida e energia atuais já são reiniciadas.
- **FR-004**: Depois da cópia, alterações na ficha original (texto ou arquivo) MUST NOT afetar a ficha da campanha, e alterações na ficha da campanha MUST NOT afetar a ficha original.
- **FR-005**: A ficha em arquivo da campanha MUST ser independente da ficha em arquivo do personagem: substituir ou remover uma MUST NOT alterar a outra.
- **FR-006**: Não MUST existir sincronização automática nem ação de "recopiar" a ficha original para a campanha depois da entrada; a única cópia acontece nos momentos descritos em FR-003.
- **FR-007**: O conteúdo copiado MUST ser idêntico ao original no momento da cópia, sem conversão, recorte, redimensionamento ou compressão.
- **FR-008**: Salvar a ficha da campanha MUST NOT alterar os dados permanentes do personagem (nome, imagem, totais, movimento, ficha original), e salvar o personagem MUST NOT alterar nenhuma participação além do ajuste de valores atuais já previsto hoje.

**Permissões**

- **FR-009**: A ficha da campanha (texto e arquivo) MUST poder ser alterada pelo dono do personagem ou pelo mestre da campanha, apenas enquanto a participação estiver Aprovada.
- **FR-010**: O mestre que não é dono MUST NOT poder alterar nenhum dado do personagem em si — nome, imagem, vida total, energia total, movimento, ficha original em texto e ficha original em arquivo. A única exceção é o token do personagem, que ele continua podendo escolher a partir da tela da campanha, como hoje.
- **FR-011**: Somente o dono MUST poder alterar os dados permanentes do personagem, incluindo anexar, substituir ou remover a ficha em arquivo original.
- **FR-012**: A ficha da campanha (texto e arquivo) MUST ser visível ao mestre, ao dono e aos participantes aprovados daquela campanha, e por mais ninguém; para quem não é dono nem mestre ela é somente para leitura.
- **FR-013**: Toda tentativa de alteração fora dessas regras MUST ser recusada com mensagem de falta de permissão, sem gravar nada.
- **FR-014**: As mesmas regras MUST valer para assistentes e ferramentas externas (MCP e chaves de API): leem e alteram a ficha da campanha conforme a permissão do usuário por trás da chamada, e nunca alteram a ficha original em nome do mestre.

**Telas**

- **FR-015**: A edição do personagem MUST passar a acontecer em um modal próprio do personagem, separado do modal aberto pelo card do painel da campanha; podem ser dois modais distintos.
- **FR-016**: O modal do personagem MUST tratar apenas do que é permanente — nome, foto, vida total, energia total, movimento, ficha original em texto e ficha original em arquivo — e MUST NOT exibir nem alterar dados de nenhuma campanha.
- **FR-017**: O modal do personagem MUST continuar servindo para criar ("Incluir Personagem", pelo combo de personagem) e MUST ganhar modo de edição, com o mesmo comportamento de envio de arquivo já usado hoje (sem recorte, mostrando nome e tipo antes de salvar).
- **FR-018**: A lista "Selecionar personagem" MUST oferecer, para cada personagem do usuário, uma ação de editar que abre o modal do personagem, ao lado da ação de transferir já existente.
- **FR-019**: O modal aberto pelo card do painel da campanha MUST tratar apenas do que pertence àquela participação: vida atual, energia atual, status do personagem, postura, token e a ficha da campanha (texto e arquivo), além de exibir nome, foto e totais do personagem somente para leitura.
- **FR-020**: Na tela da campanha, a área de ficha MUST exibir a ficha da campanha (texto e arquivo), e não a ficha original — para o mestre, para o dono e para os demais participantes.
- **FR-021**: Na tela da campanha, o mestre (não dono) e o dono MUST poder editar a ficha em texto da campanha com o mesmo editor markdown já usado, respeitando o mesmo limite e as mesmas proteções contra conteúdo malicioso.
- **FR-022**: Na tela da campanha, o mestre (não dono) e o dono MUST poder anexar, substituir ou remover a ficha em arquivo da campanha, com o mesmo comportamento de envio já usado para o personagem.
- **FR-023**: A aba hoje chamada "Anotações da Campanha" MUST passar a se chamar "Ficha da Campanha", com texto de ajuda adequado ao novo significado (é a ficha do personagem nesta campanha, não só o que mudou).
- **FR-024**: Para quem não é dono nem mestre, a ficha da campanha MUST aparecer somente para leitura, sem botão de salvar.
- **FR-025**: Quando a campanha não tem ficha em arquivo, a tela MUST informar isso claramente, em vez de exibir área vazia ou o arquivo original do personagem.
- **FR-026**: Sucesso e erro MUST ser comunicados por toast; todos os textos em pt-BR.

**Migração**

- **FR-027**: Na migração, cada participação existente MUST receber a ficha em texto atual do personagem com as anotações já gravadas anexadas ao final, numa seção identificada como anotações anteriores da campanha; se as anotações estiverem vazias, a ficha fica apenas com a cópia.
- **FR-028**: Se a soma da cópia com as anotações ultrapassar o limite de 20.000 caracteres, as anotações MUST ser preservadas integralmente e o texto copiado do personagem MUST ser reduzido até caber.
- **FR-029**: Na migração, cada participação existente MUST receber também uma cópia do arquivo de ficha atual do personagem, quando ele existir.
- **FR-030**: Nenhuma anotação existente MUST ser perdida na migração.
- **FR-031**: A migração MUST NOT alterar a ficha original de nenhum personagem.

### Key Entities

- **Personagem**: dono, nome, imagem, vida total, energia total, movimento, token, **ficha original em texto** e **ficha original em arquivo**. Só o dono altera, pelo modal do personagem.
- **Participação na campanha**: liga o personagem à campanha com a situação (Convidado / Acesso solicitado / Aprovado / Recusado) e guarda, por campanha: vida atual, energia atual, status do personagem, postura, **ficha da campanha em texto** (cópia inicial da ficha original; substitui as anotações) e **ficha da campanha em arquivo** (cópia inicial do arquivo original). Alterável pelo dono ou pelo mestre enquanto Aprovada.
- **Arquivo da ficha da campanha**: o arquivo copiado ou enviado para aquela participação, guardado no mesmo armazenamento das demais imagens e independente do arquivo original do personagem.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um personagem que entra numa campanha tem a ficha em texto da campanha idêntica à ficha original em 100% dos casos no momento da entrada, e o arquivo da campanha idêntico ao original em 100% dos casos em que o personagem tem arquivo.
- **SC-002**: 100% das tentativas do mestre (não dono) de alterar a ficha original (texto ou arquivo) ou qualquer outro dado permanente do personagem são recusadas; 100% das alterações dele na ficha da campanha de uma participação aprovada são aceitas.
- **SC-003**: Alterar a ficha da campanha em uma campanha não altera nenhum dado de outra campanha nem do personagem original, em 100% dos casos testados.
- **SC-004**: 100% dos arquivos da ficha da campanha baixados ou abertos são idênticos, byte a byte, ao arquivo que foi copiado ou enviado.
- **SC-005**: Dentro de uma campanha, a ficha exibida na tela do personagem é a da campanha em 100% das aberturas, para mestre, dono e participantes aprovados; a ficha original não aparece nessa tela em nenhum caso.
- **SC-006**: O mestre substitui a ficha da campanha (texto ou arquivo) em no máximo 3 passos a partir do card do personagem.
- **SC-007**: O dono altera a ficha original do próprio personagem em no máximo 3 passos a partir do combo de personagem, sem precisar estar dentro de uma campanha.
- **SC-008**: Após a migração, 100% das participações aprovadas cujo personagem tem ficha original ficam com ficha da campanha preenchida, e 100% das anotações existentes continuam legíveis na ficha da campanha.
- **SC-009**: Quem não participa da campanha é recusado em 100% das tentativas de acessar a ficha da campanha.
- **SC-010**: Nenhum dado permanente de personagem é alterado pela migração, em 100% dos casos.

## Assumptions

- A mudança envolve backend e frontend: novos campos na participação (o de texto já existe e muda de significado; o de arquivo é novo), cópia no momento da entrada, migração dos dados existentes, nova permissão para o mestre, separação dos modais e nova ação de editar na lista de personagens.
- "Ficha em markdown e imagem/pdf" refere-se aos dois formatos que o personagem já suporta hoje (texto markdown e arquivo de imagem ou PDF, feature 022); não há um terceiro formato nem geração automática de um formato a partir do outro (ex.: transformar o markdown em PDF está fora do escopo).
- A cópia do arquivo é independente por campanha: o mesmo personagem em N campanhas pode ocupar até N cópias do arquivo. O custo de armazenamento é aceito em troca da independência.
- O token do personagem continua sendo um dado do personagem, escolhível pelo dono e pelo mestre a partir da tela da campanha (features 011 e 012); esta funcionalidade não muda isso.
- O ajuste dos valores atuais das participações quando o dono reduz os totais de vida ou energia continua como hoje (009), agora disparado a partir do modal do personagem.
- NPCs não ganham ficha por campanha nesta funcionalidade; mantêm o comportamento atual.
- A limpeza de arquivos órfãos (arquivo da campanha substituído ou participação removida) continua fora do escopo, como já acontece com imagens e com a ficha em arquivo do personagem.
- A visualização de PDF continua usando o leitor do próprio navegador; não haverá leitor embutido.
- A busca pública de personagens continua sem expor ficha nem status de campanha; a visibilidade da ficha da campanha vale só dentro da campanha.
- O comportamento de reiniciar a participação ao voltar para Aprovado (recopiar a ficha e zerar status, postura, vida e energia) é mantido, por coerência com o que já acontece hoje.
- A ficha da campanha vale só enquanto a participação existir; remover o personagem da campanha descarta a ficha daquela campanha.
- O registro de alterações de personagem no log de turno (024) passa a cobrir a ficha da campanha no lugar das anotações, já que é o mesmo campo com novo nome.
