# Feature Specification: Biblioteca de armas dos tokens 3D

**Feature Branch**: `082-token-weapon-library`
**Created**: 2026-10-17
**Status**: Draft
**Input**: User description: "crie então, preciso de uma biblioteca de armas separada, sera vinculada ao token, mão direita ou esquerda. Essa biblioteca deve ficar no menu do usuário"

## Contexto

Desde a 055, um token pode ter um **modelo 3D**. Ele é desenhado na vista 3D da mesa com animações nos estados Parado, Caminhando e Caído: clipes do próprio arquivo ou da biblioteca de animações (059). Hoje, se um personagem precisa de uma espada, ela tem que estar modelada dentro do próprio arquivo. Trocar de arma significa trocar o modelo inteiro.

Esta feature cria uma **biblioteca de armas**, separada da de tokens e da de animações:

1. **Armas**: cada arma é um modelo 3D próprio, com nome, dono e o arquivo. Ela é guardada no armazenamento de arquivos do Roll6, como os modelos dos tokens.
2. **Acesso pelo menu do usuário**: a biblioteca fica em "Armas", no menu do usuário, ao lado de "Animações".
3. **Vínculo com o token**: na edição do token, o usuário escolhe uma arma da biblioteca e diz em qual mão ela fica (direita ou esquerda). A arma acompanha a mão em todas as animações do modelo e aparece na prévia do token e na vista 3D da mesa.

## Clarifications

### Session 2026-10-17

- Q: Onde fica o ajuste da pegada? → A: No vínculo com cada token. A arma não guarda encaixe; cada token ajusta a sua arma em cada mão.
- Q: Quantas armas por token? → A: Uma arma por mão, até duas ao mesmo tempo (por exemplo espada e escudo, ou duas adagas). Cada mão tem a sua escolha e o seu ajuste.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enviar uma arma para a biblioteca (Priority: P1)

O usuário tem o modelo 3D de uma arma, por exemplo uma espada. Ele abre "Armas" no menu do usuário, envia o arquivo e dá um nome ("Espada longa"). A arma fica guardada e aparece na lista dele, com uma prévia em 3D.

**Why this priority**: sem armas guardadas, não há o que vincular ao token. É a base das outras histórias.

**Independent Test**: enviar um modelo válido com um nome, ver a arma na lista e girá-la na prévia. Enviar um arquivo inválido e ver a mensagem de erro.

**Acceptance Scenarios**:

1. **Given** um arquivo de modelo 3D válido, **When** o usuário o envia com um nome, **Then** a arma é guardada e aparece na lista com nome e prévia.
2. **Given** um arquivo que não é um modelo 3D aceito ou que passa do tamanho máximo, **When** o usuário o envia, **Then** nada é guardado e a mensagem explica o motivo.
3. **Given** uma arma do próprio usuário, **When** ele muda o nome ou troca o arquivo, **Then** a mudança é salva, e os tokens que usam a arma passam a mostrar a versão nova.
4. **Given** uma arma do próprio usuário que nenhum token usa, **When** ele a apaga, **Then** ela sai da biblioteca.
5. **Given** uma arma que algum token usa, **When** o dono tenta apagá-la, **Then** a remoção é recusada com uma mensagem que diz que ela está em uso.

---

### User Story 2 - Vincular uma arma à mão do token (Priority: P1)

Na edição de um token com modelo 3D, o usuário escolhe uma arma da biblioteca para a mão direita, para a esquerda ou para as duas (por exemplo espada e escudo). A prévia do token mostra a arma presa àquela mão, e ela acompanha o movimento quando o usuário toca as animações. Ao salvar, a peça aparece com a arma na vista 3D da mesa, parada, andando ou caída.

**Why this priority**: é o motivo de ter a biblioteca. Junto com a US1, é o menor recorte que entrega valor.

**Independent Test**: num token com modelo de esqueleto humanoide, escolher uma arma na mão direita e ver a prévia. Salvar, abrir a vista 3D de um mapa com a peça e ver a arma na mão certa enquanto ela anda.

**Acceptance Scenarios**:

1. **Given** um token com modelo 3D humanoide, **When** o usuário escolhe uma arma e a mão direita, **Then** a prévia mostra a arma presa à mão direita.
2. **Given** uma espada na mão direita, **When** o usuário escolhe um escudo na esquerda, **Then** a prévia mostra as duas armas, cada uma na sua mão.
3. **Given** a arma vinculada, **When** a prévia toca Parado, Caminhando ou Caído, **Then** a arma acompanha a mão o tempo todo, sem se soltar dela.
4. **Given** o token salvo com a arma, **When** qualquer participante abre a vista 3D de um mapa com essa peça, **Then** a peça aparece com a arma na mão escolhida, também andando no modo livre e caída.
5. **Given** um token com arma, **When** o usuário remove a arma ou troca a mão e salva, **Then** a vista 3D passa a mostrar a peça sem a arma, ou com ela na outra mão.
6. **Given** um modelo sem mão reconhecível (sem esqueleto ou com nomes de ossos desconhecidos), **When** o usuário abre a escolha de arma, **Then** ela fica indisponível, com um aviso que diz o motivo.
7. **Given** um token sem modelo 3D, **When** o usuário edita o token, **Then** não há escolha de arma, porque as figuras 2,5D e o mapa 2D não mostram armas.

---

### User Story 3 - Ajustar a pegada da arma (Priority: P2)

Cada arma e cada modelo seguram de um jeito: o cabo de uma espada precisa ficar na palma, um arco fica de outro jeito, e um modelo grande tem a mão maior que um pequeno. O usuário ajusta a posição, a rotação e o tamanho da arma na mão, vendo o resultado na prévia, até ficar natural.

**Why this priority**: sem ajuste, a arma pode aparecer atravessada ou fora da palma. Mesmo assim, a US2 já entrega uma arma presa à mão.

**Independent Test**: vincular uma espada, ajustar posição, giro e tamanho até o cabo ficar na palma, salvar e ver na vista 3D o mesmo encaixe da prévia.

**Acceptance Scenarios**:

1. **Given** uma arma vinculada, **When** o usuário muda posição, rotação ou tamanho, **Then** a prévia mostra o novo encaixe na hora.
2. **Given** um encaixe ajustado e salvo, **When** a peça aparece na vista 3D, **Then** o encaixe é igual ao da prévia.
3. **Given** um encaixe ajustado, **When** o usuário pede "Voltar ao padrão", **Then** a arma volta ao encaixe inicial.
4. **Given** a mesma arma em dois tokens, **When** o usuário ajusta a pegada num deles, **Then** o outro token não muda: o encaixe é de cada token (Q1 = B).
5. **Given** um token com armas nas duas mãos, **When** o usuário ajusta uma delas, **Then** só aquela mão muda.

---

### User Story 4 - Usar a biblioteca pelo MCP (Priority: P3)

Um assistente de IA conectado pelo MCP lista as armas, envia uma arma nova, muda e apaga as do usuário, e vincula uma arma à mão de um token, com as mesmas regras do site.

**Why this priority**: o Roll6 exige que todo endpoint tenha a sua ferramenta no MCP, mas o uso principal é pelo site.

**Independent Test**: com uma chave de API, enviar uma arma pelo MCP, vinculá-la a um token e ver o resultado no site.

**Acceptance Scenarios**:

1. **Given** uma chave de API válida, **When** o assistente envia uma arma com nome e arquivo, **Then** ela aparece na biblioteca do usuário.
2. **Given** uma arma e um token do usuário, **When** o assistente vincula a arma a uma das mãos do token, **Then** a vista 3D mostra a arma naquela mão.

---

### Edge Cases

- **Arma apagada ou inacessível**: se o arquivo da arma não carregar, a peça aparece sem a arma, e o resto da vista 3D continua igual.
- **Modelo que demora a carregar**: enquanto o modelo da peça carrega, aparece a figura 2,5D, sem arma. A arma surge junto com o modelo.
- **Tamanho do modelo** (063): quando o "Tamanho" do modelo muda, a arma acompanha na mesma proporção.
- **Troca do modelo do token**: se o novo modelo ainda tem uma mão reconhecível, a arma fica. Se não tem, o vínculo continua guardado, mas a arma não aparece, e a aba avisa.
- **Arma muito grande ou pequena no arquivo**: ao vincular, o tamanho inicial da arma é proporcional ao do personagem, então ela nunca aparece gigante nem invisível.
- **Arma de outro usuário**: pode ser usada em qualquer token, mas só o dono a muda ou apaga. Uma troca de arquivo feita pelo dono aparece em todos os tokens que a usam.
- **Foto da pose** (057): "Gerar imagem" fotografa o modelo com a arma.
- **Peça caída sem animação de morte** (058): o modelo deitado leva a arma junto.
- **Escolha e animações**: a arma não muda as animações. Ela só segue a mão.

## Requirements *(mandatory)*

### Functional Requirements

**Biblioteca**

- **FR-001**: O menu do usuário MUST ter um item "Armas" que abre a biblioteca de armas.
- **FR-002**: Os usuários MUST poder enviar uma arma com um nome (obrigatório, até 100 caracteres) e um arquivo de modelo 3D no mesmo formato e com o mesmo limite de tamanho aceitos para os modelos dos tokens.
- **FR-003**: O sistema MUST recusar arquivos que não sejam um modelo 3D válido ou que passem do limite, sem guardar nada e com uma mensagem clara.
- **FR-004**: A biblioteca MUST ser compartilhada como as de tokens e de animações. Ela tem uma aba com as armas do usuário e uma busca em todas as armas por nome. Qualquer usuário logado usa qualquer arma.
- **FR-005**: Só o dono MUST poder renomear uma arma, trocar o arquivo ou apagá-la.
- **FR-006**: Quando o dono troca o arquivo, a arma MUST continuar a mesma, e todos os tokens que a usam passam a mostrar o arquivo novo.
- **FR-007**: O sistema MUST recusar apagar uma arma que algum token usa e MUST dizer que ela está em uso.
- **FR-008**: A biblioteca MUST mostrar uma prévia 3D da arma, que o usuário pode girar.

**Vínculo com o token**

- **FR-009**: A edição de um token com modelo 3D MUST permitir escolher uma arma da biblioteca e a mão em que ela fica (direita ou esquerda), ou nenhuma arma.
- **FR-010**: O token MUST ter no máximo uma arma por mão, até duas ao mesmo tempo (Q2 = B). Cada mão tem a sua escolha, que pode ser vazia, e a mesma arma pode estar nas duas mãos.
- **FR-011**: A arma MUST acompanhar a mão escolhida em todos os estados e animações do modelo: parado, caminhando, caído e as animações da biblioteca. Também MUST acompanhar o modelo deitado sem animação de morte.
- **FR-012**: A prévia do token MUST mostrar a arma vinculada enquanto toca as animações, e "Gerar imagem" MUST incluir a arma.
- **FR-013**: Quando o modelo não tem uma mão reconhecível, a escolha de arma MUST ficar indisponível, com um aviso. Um vínculo já salvo continua guardado.
- **FR-014**: O usuário MUST poder ajustar a pegada de cada mão do token (posição, rotação e tamanho) vendo o resultado na prévia, e voltar ao padrão. O encaixe pertence ao token e à mão, não à arma (Q1 = B).
- **FR-015**: Ao vincular uma arma, o tamanho inicial MUST ser proporcional ao personagem.

**Mesa**

- **FR-016**: A vista 3D da mesa MUST mostrar, para todos os participantes, a arma de cada peça com modelo 3D na mão e com o encaixe salvos. Isso inclui as peças andando no modo livre (069) e as caídas.
- **FR-017**: Uma mudança no token ou na arma (vínculo, mão, encaixe, arquivo) MUST chegar às mesas abertas sem recarregar a página, como já acontece com as outras mudanças de token.
- **FR-018**: O mapa 2D, as figuras 2,5D, as regras de movimento, a ocupação dos hexes e os turnos MUST continuar iguais. A arma é só visual.
- **FR-019**: Se a arma não carregar, a peça MUST aparecer sem ela, sem erro para o usuário além do que já existe para modelos.

**Integrações**

- **FR-020**: O MCP MUST oferecer ferramentas para listar, ler, enviar, mudar e apagar armas, e para vincular uma arma a um token, com as mesmas permissões e validações do site. O guia do MCP MUST explicar a biblioteca e o vínculo.

### Key Entities

- **Arma**: um modelo 3D da biblioteca. Tem nome, dono, o arquivo do modelo e as datas de criação e alteração. Pode ser usada por qualquer token e é mudada só pelo dono.
- **Vínculo arma–token**: liga uma mão de um token (direita ou esquerda) a uma arma e guarda o encaixe dela naquela mão: posição, rotação e tamanho. Cada token tem no máximo um vínculo por mão. O vínculo só existe para tokens com modelo 3D.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário envia uma arma e a vincula à mão de um token em menos de 2 minutos, sem sair da edição do token depois que a arma está na biblioteca.
- **SC-002**: Nos modelos humanoides de exemplo do Roll6, a arma fica presa à mão escolhida em 100% dos quadros de todas as animações, sem se soltar nem ficar parada no ar.
- **SC-003**: O encaixe visto na prévia é o mesmo visto na vista 3D da mesa, em todos os participantes.
- **SC-004**: Ligar uma arma a uma peça não deixa a vista 3D visivelmente mais lenta num celular intermediário, num mapa com até 10 peças armadas.
- **SC-005**: Uma arma em uso nunca é apagada por engano, porque 100% das tentativas são recusadas com uma mensagem.

## Assumptions

- A arma usa o mesmo formato e o mesmo limite de tamanho dos modelos dos tokens (055), e é guardada no mesmo armazenamento de arquivos.
- "Mão reconhecível" quer dizer um esqueleto com os ossos das mãos nomeados no padrão Mixamo, que é o padrão que o Roll6 já reconhece para as animações (059). Outros nomes ficam para depois.
- O encaixe não fica na arma: cada token ajusta o seu (Q1 = B).
- A biblioteca é compartilhada entre os usuários, como as de tokens e de animações, e só o dono muda ou apaga uma arma.
- As armas não têm tipo, categoria nem regra de jogo (dano, alcance): são só visuais.
- Armas animadas (por exemplo, uma corda de arco que estica) ficam fora do escopo: a arma é desenhada como está no arquivo.
- As armas não aparecem nas figuras 2,5D nem no mapa 2D.
- A ferramenta de animação roll6anime (062) não precisa mostrar armas nesta entrega.
