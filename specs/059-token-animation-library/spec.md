# Feature Specification: Biblioteca de animações dos tokens 3D

**Feature Branch**: `059-token-animation-library`
**Created**: 2026-10-14
**Status**: Draft
**Input**: User description: "Melhorias no Token 3D: Crie um formato de animações em json; Armazene essas animações no S3 e crie uma entidade para armazenar isso; Essa entidade de ter: Nome, UserId, Tipo (Parado, Andando, Correndo, Agachado, Derrotado, Atacando, Defendendo), Url do arquivo; Os usuários poderão fazer upload dessas animações; No model de tokens, o usuário poderá selecionar essa animações; Crie em outro projeto na pasta C:\repos\gurps-adventure, uma skill criar-animacao que cria exatamente nesse formato, baseado em uma imagem ou na descrição dada pelo usuário; O MCP tb poderá fazer upload direto dessas animações"

## Contexto

Desde a 055, um token pode ter um **modelo 3D**. Na aba **"3D"** do token, o usuário escolhe a animação de cada estado: **Parado**, **Caminhando** e, desde a 058, **Caído**. As escolhas possíveis são:

- um clipe que já vem dentro do arquivo do modelo;
- uma das animações próprias do Roll6 (respiração, caminhada, posição defensiva e morte);
- nenhuma animação.

As animações do Roll6 são **dados**: para cada osso de um esqueleto no padrão Mixamo, uma lista de instantes e de giros em graus. Hoje elas estão escritas no código, e só quem programa o Roll6 consegue criar uma nova.

Esta feature transforma esse formato num **arquivo de animação** que qualquer usuário pode enviar:

1. Um **formato JSON documentado** para animações. É o mesmo que o Roll6 já usa internamente, então qualquer pessoa ou assistente de IA pode escrever um arquivo nele.
2. Uma **biblioteca de animações**. Cada animação tem nome, dono, tipo (Parado, Andando, Correndo, Agachado, Derrotado, Atacando, Defendendo) e o arquivo, guardado no armazenamento de arquivos do Roll6.
3. **Envio** de animações pelo site e pelo MCP.
4. **Escolha** dessas animações na aba "3D" do token, ao lado das opções que já existem.
5. Uma skill **`criar-animacao`** no projeto da mesa (`C:\repos\gurps-adventure`), que escreve animações exatamente nesse formato a partir de uma descrição ou de uma imagem de referência.

## Clarifications

### Session 2026-10-14

- Q: A biblioteca de animações é compartilhada entre usuários? → A: Sim, como a de tokens: todos veem e usam as animações de todos (abas "Minhas" e "Buscar"); só o dono edita ou apaga.
- Q: Como os sete tipos se ligam aos estados do token? → A: Por enquanto, cada estado aceita só o seu tipo: Parado ← tipo "Parado", Caminhando ← tipo "Andando", Caído ← tipo "Derrotado". Os outros tipos (Correndo, Agachado, Atacando, Defendendo) já podem ser enviados e guardados, mas ainda não são oferecidos no token; o usuário vai incluir estados para eles depois.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enviar uma animação para a biblioteca (Priority: P1)

O usuário tem um arquivo de animação no formato do Roll6, escrito por ele ou gerado por um assistente. Ele abre a biblioteca de animações, envia o arquivo, dá um nome e escolhe o tipo (por exemplo, "Ataque com machado", tipo Atacando). A animação fica guardada e aparece na lista dele.

**Why this priority**: sem animações guardadas, não há o que escolher no token. É a base de todas as outras histórias.

**Independent Test**: enviar um arquivo válido com nome e tipo e ver a animação na lista. Enviar um arquivo inválido e ver a mensagem que explica o erro.

**Acceptance Scenarios**:

1. **Given** um arquivo de animação válido, **When** o usuário o envia com nome e tipo, **Then** a animação é guardada e aparece na lista com nome, tipo e duração.
2. **Given** um arquivo que não segue o formato (JSON quebrado, osso desconhecido, giros e instantes de tamanhos diferentes, instantes fora de ordem, duração acima do limite), **When** o usuário o envia, **Then** nada é guardado e a mensagem diz o que está errado.
3. **Given** uma animação do próprio usuário, **When** ele muda o nome ou o tipo, **Then** a mudança é salva.
4. **Given** uma animação do próprio usuário que nenhum token usa, **When** ele a apaga, **Then** ela sai da biblioteca.
5. **Given** uma animação usada por algum token, **When** o dono tenta apagá-la, **Then** a remoção é recusada com uma mensagem que diz que ela está em uso.

---

### User Story 2 - Usar uma animação da biblioteca no token (Priority: P1)

Na aba "3D" do token, os seletores de Parado, Caminhando e Caído passam a listar também as animações da biblioteca **do tipo daquele estado**: Parado lista as do tipo "Parado", Caminhando as do tipo "Andando" e Caído as do tipo "Derrotado". Primeiro aparecem as do próprio usuário, depois as dos outros. Ao escolher uma, a prévia a toca na hora. Ao salvar o token, a peça usa essa animação na vista 3D da mesa.

**Why this priority**: é o motivo de ter a biblioteca. Junto com a US1, forma o menor recorte que entrega valor.

**Independent Test**: num token com modelo de esqueleto Mixamo, escolher uma animação da biblioteca no estado Parado, ver a prévia, salvar e abrir a vista 3D de um mapa com essa peça em pé.

**Acceptance Scenarios**:

1. **Given** um token com modelo de esqueleto Mixamo e animações na biblioteca, **When** o usuário abre um seletor de estado, **Then** vê, além das opções de hoje, só as animações da biblioteca do tipo daquele estado (Parado → "Parado", Caminhando → "Andando", Caído → "Derrotado"), as suas primeiro.
6. **Given** uma animação do tipo Atacando, Correndo, Agachado ou Defendendo, **When** o usuário abre qualquer seletor do token, **Then** ela não aparece (fica guardada na biblioteca para estados futuros).
2. **Given** uma animação da biblioteca escolhida, **When** a prévia toca, **Then** o modelo se move como o arquivo descreve, e a linha do tempo, a pausa e "Gerar imagem" funcionam como nas outras animações.
3. **Given** o token salvo com uma animação da biblioteca em Parado, **When** a peça está em pé na vista 3D, **Then** o modelo toca essa animação.
4. **Given** uma animação da biblioteca escolhida para Caído, **When** a peça cai na vista 3D, **Then** a animação toca uma vez e fica parada no último quadro, como a morte da 058.
5. **Given** um modelo cujo esqueleto não segue o padrão Mixamo, **When** o usuário abre os seletores, **Then** as animações da biblioteca não são oferecidas, como já acontece com as do Roll6.

---

### User Story 3 - Assistente de IA envia animações pelo MCP (Priority: P2)

Um assistente de IA conectado ao Roll6 pelo MCP, com a chave de API do usuário, envia uma animação com nome, tipo e conteúdo. Depois lista as animações do usuário e coloca uma delas num token, tudo sem passar pela tela.

**Why this priority**: é o caminho natural da skill `criar-animacao`. O envio pela tela (US1) já entrega o valor principal.

**Independent Test**: pelo MCP, enviar uma animação, listá-la e atribuí-la a um token. Conferir no site que ela aparece na biblioteca e no token.

**Acceptance Scenarios**:

1. **Given** uma chave de API válida, **When** o assistente envia uma animação válida com nome e tipo, **Then** ela é guardada em nome do dono da chave e a resposta traz a animação criada.
2. **Given** um conteúdo inválido, **When** o assistente o envia, **Then** recebe o mesmo erro explicativo que o site mostraria.
3. **Given** uma animação guardada, **When** o assistente cria ou edita um token escolhendo essa animação para um estado, **Then** o token passa a usá-la.
4. **Given** as ferramentas de animação, **When** o assistente as lista, **Then** cada uma tem descrição, parâmetros documentados e o formato do arquivo explicado no guia do Roll6.

---

### User Story 4 - Skill `criar-animacao` no projeto da mesa (Priority: P2)

No projeto `C:\repos\gurps-adventure`, o usuário pede, por exemplo, "/criar-animacao um orc golpeando com o machado de cima para baixo" ou anexa a imagem de uma pose. A skill escreve o arquivo de animação exatamente no formato do Roll6, valida o arquivo com um script e explica o que a animação faz. Se o usuário pedir, ela envia a animação ao Roll6 com nome e tipo.

**Why this priority**: torna o formato útil na prática, porque ninguém precisa escrever graus à mão. Ela depende do formato (US1), mas não da tela.

**Independent Test**: no projeto da mesa, pedir uma animação por descrição e outra por imagem. Os dois arquivos passam na validação da skill e são aceitos pelo envio do Roll6.

**Acceptance Scenarios**:

1. **Given** uma descrição de movimento e um tipo, **When** a skill roda, **Then** gera um arquivo no formato do Roll6 que passa no validador da skill e no do Roll6.
2. **Given** uma imagem com uma pose, **When** a skill roda, **Then** gera uma animação que leva o personagem da posição de descanso até essa pose e a mantém. Nos tipos que repetem (Parado, Defendendo, Agachado), a pose é mantida com uma leve respiração.
3. **Given** uma animação gerada, **When** o usuário pede o envio, **Then** a skill a manda ao Roll6 pelo caminho que o projeto já usa para falar com a mesa, e informa o nome com que ela ficou guardada.
4. **Given** a skill, **When** é lida, **Then** documenta o formato, os ossos aceitos, os eixos e sinais dos giros, os limites e exemplos prontos para cada tipo.

---

### Edge Cases

- **Animação que só toca uma vez em estado que repete**: uma animação marcada como "não repete" em Parado ou Caminhando toca uma vez e fica no último quadro. Uma marcada como "repete" em Caído toca uma vez e para no último quadro, porque Caído sempre para no fim.
- **Ossos que o modelo não tem**: são ignorados. Os outros ossos tocam normalmente.
- **Animação que deforma o modelo**: toca completa, como a guarda e a morte da 058. A prévia mostra o aviso de deformação que já existe.
- **Animação de outro usuário usada num token**: o token guarda a referência e continua funcionando; o dono não consegue apagá-la enquanto algum token (de qualquer usuário) a usar.
- **Dono muda o tipo de uma animação em uso** (por exemplo, de "Parado" para "Atacando"): a mudança é recusada enquanto algum token a usar num estado que exige o tipo antigo, com mensagem que diz que ela está em uso.
- **Animação escolhida que deixou de existir ou não carrega** (arquivo indisponível, falha de rede): o estado volta à escolha automática e a peça nunca some da vista 3D.
- **Token sem modelo**: as escolhas de animação são descartadas, como hoje.
- **Arquivo grande demais ou com quadros demais**: recusado no envio, com o limite na mensagem.
- **Mesmo nome duas vezes**: permitido. O nome é só um rótulo, e a lista mostra também o tipo e a duração.

## Requirements *(mandatory)*

### Functional Requirements

**Formato**

- **FR-001**: O Roll6 MUST definir e documentar um formato de arquivo JSON de animação, equivalente às animações próprias do Roll6:
  - versão do formato;
  - duração em segundos;
  - se a animação repete ou toca uma vez;
  - para cada osso (nomes do padrão Mixamo, sem prefixo), os instantes e um giro em graus (X, Y, Z no referencial do personagem) por instante;
  - opcionalmente, a subida e a descida do quadril ao longo do tempo.
- **FR-002**: As animações próprias do Roll6 (respiração, caminhada, posição defensiva e morte) MUST poder ser escritas nesse formato sem perda. Elas são a referência de que o formato basta.
- **FR-003**: O arquivo MUST ser validado no envio, com mensagem que diga o que está errado:
  - JSON válido e versão conhecida;
  - duração positiva e até 30 s;
  - ao menos um osso, todos do padrão aceito, sem repetição;
  - instantes em ordem crescente, de 0 até a duração, com um giro por instante;
  - números finitos;
  - arquivo de até 1 MB.

**Biblioteca**

- **FR-004**: Cada animação MUST ter:
  - nome (até 100 caracteres);
  - dono (o usuário que enviou);
  - tipo, um entre Parado, Andando, Correndo, Agachado, Derrotado, Atacando e Defendendo;
  - o arquivo guardado no armazenamento de arquivos do Roll6, lido por um endereço do próprio Roll6;
  - a duração e se repete, lidas do arquivo.
- **FR-005**: Usuários logados MUST poder enviar animações. O arquivo é guardado sem alteração.
- **FR-006**: Só o dono MUST poder mudar o nome e o tipo de uma animação, ou apagá-la. A remoção MUST ser recusada enquanto algum token a usar, e a mudança de tipo também, enquanto algum token a usar num estado que exige o tipo atual.
- **FR-007**: A biblioteca MUST ser compartilhada como a de tokens: todo usuário logado vê e pode usar as animações de todos, com a lista separada em "Minhas" e "Buscar" (Q1 = A). Editar e apagar continuam só do dono (FR-006).
- **FR-008**: O site MUST ter uma tela para listar, enviar, editar e apagar animações, com filtro por tipo e busca por nome.

**Uso no token**

- **FR-009**: Os seletores de animação da aba "3D" do token MUST oferecer, além das opções de hoje, as animações da biblioteca do tipo do estado, só para modelos com esqueleto no padrão Mixamo (Q2):
  - Parado ← tipo "Parado";
  - Caminhando ← tipo "Andando";
  - Caído ← tipo "Derrotado".
  Os tipos Correndo, Agachado, Atacando e Defendendo MUST poder ser enviados e guardados, mas ainda não são oferecidos no token. O servidor MUST recusar, com erro no campo do estado, uma animação de tipo diferente do estado em que foi escolhida.
- **FR-010**: A escolha de uma animação da biblioteca MUST ser salva com o token, MUST valer na vista 3D da mesa para todos os que veem a peça, e MUST ser descartada quando o token deixa de ter modelo.
- **FR-011**: A prévia MUST tocar a animação escolhida na hora, com linha do tempo, pausa, aviso de deformação e "Gerar imagem", como as animações do Roll6.
- **FR-012**: No estado Caído, a animação da biblioteca MUST tocar uma vez e parar no último quadro, com as mesmas regras da morte da 058: começar no último quadro quando a peça já está caída, tocar uma vez quando cai na tela e voltar a Parado quando levanta.

**MCP**

- **FR-013**: O MCP MUST ter ferramentas para enviar uma animação (nome, tipo e conteúdo do arquivo), listar, ler, editar e apagar animações, com as mesmas regras e erros do site.
- **FR-014**: As ferramentas de criar e editar token MUST aceitar uma animação da biblioteca como escolha de cada estado, com a mesma regra de tipo do FR-009.
- **FR-015**: O guia do Roll6 para assistentes MUST explicar o formato com um exemplo completo.

**Skill `criar-animacao` (projeto `C:\repos\gurps-adventure`)**

- **FR-016**: O projeto da mesa MUST ganhar a skill `criar-animacao`, no mesmo estilo das skills que já existem lá. Ela:
  - gera arquivos exatamente no formato do FR-001, a partir de uma descrição ou de uma imagem de pose;
  - escolhe o tipo, ou pergunta qual é;
  - valida o arquivo com um script próprio, com as mesmas regras do FR-003;
  - guarda o arquivo numa pasta do projeto.
- **FR-017**: A skill MUST documentar o formato, os ossos aceitos, o referencial e o sinal dos giros, e os limites. MUST trazer exemplos para os sete tipos.
- **FR-018**: A skill MUST poder enviar a animação gerada ao Roll6 quando o usuário pedir, usando o acesso que o projeto já tem à mesa.

### Key Entities *(include if feature involves data)*

- **Animação**: um arquivo de movimento enviado por um usuário.
  - Campos: nome, dono, tipo (Parado, Andando, Correndo, Agachado, Derrotado, Atacando, Defendendo), nome do arquivo guardado, duração, se repete, data de criação.
  - O endereço do arquivo é gerado na leitura e não fica guardado.
  - Pode ser usada por vários tokens.
- **Token (modelo 3D)**: as escolhas de animação dos três estados (Parado, Caminhando, Caído) passam a aceitar também "uma animação da biblioteca" do tipo do estado. Não se criam campos para os outros quatro tipos agora.
- **Arquivo de animação**: o JSON do FR-001, guardado sem alteração.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: As quatro animações próprias do Roll6, convertidas para o formato e enviadas como arquivos, tocam igual às originais na prévia, com a mesma pose em cada instante.
- **SC-002**: Um usuário envia uma animação e a vê tocando num token em menos de 2 minutos, sem sair do site.
- **SC-003**: 100% dos arquivos gerados pela skill `criar-animacao` nos exemplos documentados (sete tipos, por descrição e por imagem) passam na validação do Roll6 na primeira tentativa.
- **SC-004**: Um arquivo inválido é sempre recusado com uma mensagem que aponta o campo com problema. Nenhum arquivo inválido chega a ser guardado.
- **SC-005**: Tokens existentes continuam com as mesmas animações. Nada muda para quem não usa a biblioteca.
- **SC-006**: Usar uma animação da biblioteca não reduz de forma perceptível a fluidez da vista 3D em relação às animações do Roll6.

## Assumptions

- O formato vale para esqueletos no **padrão Mixamo**, como as animações do Roll6. Outros esqueletos continuam só com os clipes do próprio arquivo.
- Os sete tipos descrevem o movimento. A mesa ainda não sabe quando alguém está correndo, agachado, atacando ou defendendo: ela só conhece em pé, caminhando e caído. Estados novos no token e gatilhos na mesa para os outros quatro tipos ficam para features futuras (Q2).
- O arquivo é guardado como enviado, no mesmo armazenamento das imagens e modelos, e é lido pelo próprio Roll6, porque o armazenamento não aceita leitura direta do navegador.
- "Url do arquivo" é atendida pelo endereço de leitura gerado na consulta. Guardar a URL fixa não funcionaria, porque as URLs do armazenamento expiram.
- O nome da animação não precisa ser único.
- Na skill, "baseada em uma imagem" quer dizer uma **pose de referência**: a skill infere a pose da imagem e escreve a animação que chega nela. Ela não extrai movimento de vídeo nem de uma sequência de quadros.
- A skill é criada no repositório `C:\repos\gurps-adventure`. As mudanças que já estão pendentes nesse repositório não são tocadas.
- Ainda não há banco local. A validação manual na mesa fica pendente, como nas features anteriores, e os testes automáticos cobrem as regras puras e o validador.
