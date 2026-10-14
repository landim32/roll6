# Feature Specification: Modelo 3D no token e caminhada em terceira pessoa

**Feature Branch**: `055-token-3d-model`
**Created**: 2026-10-13
**Status**: Draft
**Input**: User description: "Crie uma opção de, ao inves de usar 2.5D, pode usar 3D no modelo: no token, entra em uma aba 3D e faz upload de um arquivo .glb; nessa mesma tela consegue visualizar o modelo; no 3D ele vai visualizar o modelo parado; quando estiver em modo livre, o jogador visualiza seu personagem em 3a pessoa e pode andar livremente com ele; deve ter a animação dele parado e caminhando; ele pode aproximar ou afastar a camera, mas ela fica travada nas costas do personagem dele; quando não estive em Modo Livre, continua com está hoje; um exemplo de modelo está em C:\repos\gurps-adventure\personagens\urzog-bigorna\orc-gordo.glb"

## Contexto

Hoje a vista 3D da mesa mostra cada peça como uma **figura "2,5D"**: até quatro imagens recortadas (frente, direita, esquerda, costas) que o token carrega e que a vista escolhe conforme o lado que a câmera vê. A câmera fica atrás da peça do personagem escolhido e a segue, mas a pessoa é só observadora: nada na vista 3D move uma peça, e qualquer movimento passa pelo "Mover" do mapa 2D.

Esta feature dá ao token uma terceira forma de aparecer: um **modelo 3D** (arquivo `.glb`) enviado numa aba "3D" do formulário do token, com prévia na própria tela. Na vista 3D, uma peça cujo token tem modelo aparece como esse modelo, de pé, com uma animação de parado; as peças sem modelo continuam como figuras 2,5D, lado a lado com as que têm modelo. Em **modo livre** (054) o jogador passa a **andar** com o seu personagem na vista 3D, em terceira pessoa, a câmera presa às costas dele e aproximável ou afastável, com a animação de caminhada enquanto anda e a de parado quando para. Essa caminhada é **só de quem anda**: a peça continua no seu hex do mapa e os outros participantes não a veem andar. Fora do modo livre nada muda em relação a hoje.

O modelo de exemplo indicado (um orc gordo, cerca de 4,7 MB, 7,8 mil triângulos, esqueleto humanoide com nomes padrão e **sem nenhuma animação embutida**) é a referência de tamanho e de tipo de arquivo que a feature deve aceitar.

## Clarifications

### Session 2026-10-13

- Q: A caminhada no 3D move a peça para os outros? → A: Não. A caminhada é só local, na vista 3D de quem anda: a peça não sai do hex, nada é enviado ao servidor e ninguém mais vê o personagem andar. O "Mover" do mapa 2D continua sendo o único jeito de mudar a peça de hex.
- Q: De onde vêm as animações de parado e de caminhada? → A: Das duas fontes: os clipes do arquivo quando existem (pelo nome, "Idle"/"Walk" e variantes) e, quando faltam e o esqueleto tem os nomes humanoides padrão, as animações próprias do Roll6. Um modelo sem clipes e com esqueleto fora do padrão fica estático, e a prévia do token avisa.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enviar e ver o modelo 3D do token (Priority: P1)

Quem cria ou edita um token encontra, ao lado das abas "Token" e "2,5D", a aba **"3D"**. Nela escolhe um arquivo `.glb` do computador ou do celular; assim que o arquivo é lido, o modelo aparece numa prévia na própria aba, de pé, girando devagar ou girável pelo toque, para conferir que é o modelo certo, que está em pé e que a frente está para a frente. Salvando o token, o modelo fica associado a ele; abrindo o token de novo, a aba mostra o modelo salvo e permite trocá-lo ou removê-lo. Um token pode ter modelo 3D, imagens 2,5D, os dois ou nenhum.

**Why this priority**: Sem o arquivo no token não há nada para mostrar na vista 3D; é a base das outras histórias e já entrega valor como catálogo (ver o modelo do personagem na própria ficha do token).

**Independent Test**: Criar um token, enviar o modelo de exemplo na aba "3D", ver a prévia, salvar, reabrir e ver o mesmo modelo; trocar por outro arquivo; remover. Arquivo que não é `.glb` ou maior que o limite é recusado com mensagem.

**Acceptance Scenarios**:

1. **Given** o formulário de um token, **When** o usuário abre a aba "3D" e escolhe um `.glb` válido, **Then** a prévia mostra o modelo de pé em até 5 s e o botão de salvar fica disponível.
2. **Given** um token salvo com modelo, **When** qualquer usuário abre o token, **Then** a aba "3D" mostra a prévia do modelo salvo, e só o criador do token vê as opções de trocar e remover.
3. **Given** a aba "3D", **When** o usuário escolhe um arquivo que não é `.glb`, está corrompido ou passa do limite de tamanho, **Then** nada é enviado e uma mensagem explica o motivo; o token continua como estava.
4. **Given** um token com modelo e com imagens 2,5D, **When** o criador remove o modelo, **Then** o token volta a aparecer na vista 3D como figura 2,5D.

---

### User Story 2 - Ver os modelos parados na vista 3D (Priority: P1)

Na vista 3D da mesa, toda peça cujo token tem modelo 3D aparece como esse modelo, no mesmo lugar e virado para o mesmo lado da peça no mapa 2D, no tamanho que a figura 2,5D de uma peça do mesmo espaço teria, de pé sobre o chão, com a animação de parado rodando (respiração, balanço leve). As peças sem modelo continuam como figuras 2,5D; as paredes, o chão, o fundo, os balões de fala e a oclusão por paredes funcionam para o modelo como funcionam para as figuras. Uma peça caída ou fora de combate não aparece em 3D, como hoje.

**Why this priority**: É o que todo mundo da mesa vê, com ou sem modo livre; junto com a história 1 já substitui o 2,5D para quem tem modelo.

**Independent Test**: Com um token com modelo colocado no mapa, abrir a vista 3D como mestre e como jogador: o modelo aparece onde a peça está, com a frente para o lado que a peça olha, animado parado; andar com a câmera ao redor dele mostra os outros lados; atrás de uma parede ele some.

**Acceptance Scenarios**:

1. **Given** uma peça cujo token tem modelo, **When** alguém abre a vista 3D, **Then** vê o modelo no hex da peça, virado conforme o `look` dela, com a animação de parado.
2. **Given** duas peças, uma com modelo e outra só com imagens 2,5D, **When** a vista 3D é aberta, **Then** as duas aparecem, cada uma do seu jeito, ocluídas pelas paredes do mesmo modo.
3. **Given** uma peça com modelo que muda de postura para "Caído", **When** a vista 3D é atualizada, **Then** o modelo deixa de aparecer, como a figura 2,5D deixaria.
4. **Given** um aparelho sem suporte à renderização 3D, **When** a vista 3D é aberta, **Then** a pessoa recebe o aviso de hoje e volta ao 2D (o modelo não quebra a vista).

---

### User Story 3 - Andar com o personagem em modo livre (Priority: P2)

Com a campanha em **modo livre**, um jogador cujo personagem escolhido tem uma peça no mapa atual abre a vista 3D e vê o seu personagem **em terceira pessoa**: a câmera fica presa às costas dele. Com as mesmas entradas que hoje movem a câmera (teclas, joystick virtual no toque), o jogador **anda com o personagem**: ele vira e caminha pelo mapa com a animação de caminhada, para com a de parado, não atravessa paredes nem sai do mapa nem entra no lugar de outra peça. A câmera gira junto com ele e pode ser **aproximada ou afastada**, mas não se solta: enquanto o modo livre estiver ligado não existe "andar com a câmera" separado do personagem. A caminhada é **local**: só quem anda a vê; a peça no mapa 2D e na vista dos outros participantes continua no seu hex, e nada é salvo.

**Why this priority**: É a razão da feature para quem joga; depende das duas primeiras histórias e do modo livre já existente.

**Independent Test**: Ligar o modo livre, entrar com um jogador cujo personagem tem modelo, abrir o 3D: a câmera está atrás dele; mover com as teclas faz o modelo andar; soltar faz ele parar; a roda do mouse ou os botões de zoom aproximam e afastam; uma parede bloqueia; em outra sessão a peça continua no hex de antes.

**Acceptance Scenarios**:

1. **Given** modo livre ligado e o personagem escolhido com peça e modelo no mapa atual, **When** o jogador abre a vista 3D, **Then** a câmera está atrás do personagem, ele está parado com a animação de parado e os controles movem o personagem, não a câmera.
2. **Given** o jogador andando, **When** segura a tecla ou o joystick para a frente, **Then** o modelo caminha com a animação de caminhada e a câmera o segue; ao soltar, ele para e volta à animação de parado em menos de 1 s.
3. **Given** o jogador andando, **When** aproxima ou afasta a câmera, **Then** a distância muda dentro de um mínimo e um máximo e a câmera continua atrás do personagem.
4. **Given** uma parede, a borda do mapa ou outra peça à frente, **When** o jogador tenta avançar, **Then** o personagem para na borda do obstáculo e pode deslizar ou virar; nunca atravessa.
5. **Given** o jogador andando, **When** o mestre desliga o modo livre, **Then** a câmera volta ao comportamento de hoje (segue a peça, pode ser solta) e o personagem volta a ser desenhado no hex da sua peça.
6. **Given** o jogador andando, **When** outro participante olha o mapa 2D ou a vista 3D dele, **Then** vê a peça no mesmo hex de antes, parada; nenhuma linha de movimento aparece no chat.
7. **Given** o jogador andou para longe, **When** sai da vista 3D, recarrega a página ou a peça é movida pelo "Mover", **Then** a caminhada é esquecida e o personagem reaparece no hex da peça.

---

### User Story 4 - Modelo sem animação ainda anda e respira (Priority: P2)

O modelo de exemplo, como muitos gerados por ferramentas automáticas, vem com esqueleto mas **sem nenhuma animação**. Mesmo assim a mesa precisa vê-lo parado e caminhando. Quando o arquivo traz clipes de parado e de caminhada, eles são usados; quando falta algum e o esqueleto é humanoide com os nomes padrão, o Roll6 usa as suas próprias animações de parado e de caminhada para esse esqueleto. A prévia do token diz qual origem cada animação vai ter, e avisa quando o modelo vai ficar estático.

**Why this priority**: Decide se o fluxo "gerei o modelo, subi, funciona" existe sem passar por uma ferramenta de animação.

**Independent Test**: Subir o modelo de exemplo (sem animações, esqueleto padrão) e ver as animações do Roll6; subir um modelo com clipes próprios e ver os dele; subir um modelo sem clipes com esqueleto de nomes diferentes e ver o aviso de modelo estático.

**Acceptance Scenarios**:

1. **Given** um modelo com animações de parado e de caminhada embutidas, **When** aparece na vista 3D, **Then** usa as animações dele.
2. **Given** um modelo sem animações e com esqueleto humanoide de nomes padrão, **When** aparece na prévia e na vista 3D, **Then** respira parado e caminha com as animações do Roll6.
3. **Given** um modelo com só o clipe de parado, **When** o personagem anda, **Then** usa o parado do arquivo e a caminhada do Roll6.
4. **Given** um modelo sem clipes e com esqueleto fora do padrão (ou sem esqueleto), **When** é escolhido na aba "3D", **Then** a prévia avisa que ele ficará estático; ele pode ser salvo e aparece parado, sem animação, na vista 3D e ao andar.

---

### Edge Cases

- **Peça que olha para um lado** (`look` 0–5): o modelo vira para o mesmo lado que a figura 2,5D viraria; a frente do modelo é a direção "para a frente" do arquivo.
- **Tamanho do modelo**: o arquivo é ajustado para a altura da figura 2,5D de uma peça do mesmo espaço (1, 2, 3, 7 ou 10 hexes); um modelo deitado, gigante ou minúsculo no arquivo aparece com a altura esperada, de pé sobre o chão, sem nenhum ajuste manual.
- **Modelo muito pesado**: um arquivo acima do limite (ver Assumptions) é recusado no envio; um modelo pesado dentro do limite pode demorar a aparecer, e enquanto carrega a peça mostra a figura 2,5D (se tiver) ou um marcador simples, nunca nada.
- **Arquivo inválido ou com erro ao abrir** (não é `.glb`, está truncado, usa recursos não suportados): recusado na aba "3D" com mensagem; se um modelo já salvo falhar ao abrir na vista 3D, a peça cai para a figura 2,5D ou o marcador e o resto da vista continua.
- **Token com modelo usado por NPC**: um NPC cujo token tem modelo aparece como modelo na vista 3D como qualquer peça; o jogador só anda com o **seu** personagem.
- **Mestre em modo livre**: o mestre não tem personagem; na vista 3D a câmera dele continua livre, como hoje.
- **Personagem sem peça no mapa atual, ou cuja peça está caída/fora de combate**: nada para andar; a câmera fica como hoje.
- **Duas sessões do mesmo jogador**: cada uma anda por conta própria; nada é compartilhado.
- **Sair da vista 3D** ("2D", "Só o mapa", "Chat", trocar de mapa ou de personagem): a caminhada é esquecida; ao voltar, o personagem está no hex da peça.
- **A peça é movida enquanto o jogador anda** (pelo mestre, pelo "Mover" do próprio jogador ou pelo processamento do turno): o personagem volta para o novo hex da peça.
- **Outras peças como obstáculo**: a colisão usa as posições atuais das outras peças; se uma delas se move para onde o personagem está, ele volta ao hex da peça, nunca fica dentro.
- **Modo livre desligado no meio da caminhada**: ver cenário 3.5; nada da caminhada é registrado nem enviado.
- **Qualidade do 3D (053)**: o modelo é desenhado em qualquer nível; o nível só muda a resolução do que já existe.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O formulário do token MUST ter uma aba "3D" onde o criador do token envia, troca ou remove um arquivo de modelo 3D no formato `.glb`; os outros usuários veem a aba apenas com a prévia.
- **FR-002**: A aba "3D" MUST mostrar uma prévia do modelo escolhido (antes de salvar) e do modelo salvo, de pé, com a frente visível e girável pelo usuário, sem sair do formulário.
- **FR-003**: O sistema MUST recusar, com mensagem, arquivos que não sejam `.glb` válidos ou que passem do limite de tamanho, sem alterar o token.
- **FR-004**: O modelo MUST ser guardado como um arquivo do token, enviado uma vez e referenciado pelo nome, como as imagens de hoje; salvar o token sem mexer na aba "3D" MUST manter o modelo como está, e remover MUST desassociá-lo do token.
- **FR-005**: O token MUST poder ter, ao mesmo tempo, imagens 2,5D e modelo 3D; a vista 3D MUST preferir o modelo quando ele existe e usar as imagens 2,5D (ou a imagem de pé) quando não existe ou enquanto o modelo ainda carrega ou falhou.
- **FR-006**: Na vista 3D, cada peça cujo token tem modelo MUST ser desenhada como esse modelo, no hex da peça, virado para o lado que a peça olha, ajustado à altura da figura de uma peça do mesmo espaço, de pé sobre o chão, com a animação de parado em ciclo.
- **FR-007**: As regras de hoje da vista 3D MUST valer para os modelos: peças caídas ou fora de combate não aparecem, as paredes ocluem o modelo, os balões de fala ficam sobre a cabeça, os níveis de qualidade não mudam o comportamento.
- **FR-008**: Em modo livre, para um jogador cujo personagem escolhido tem uma peça de pé no mapa atual, a vista 3D MUST colocar a câmera atrás desse personagem e MUST redirecionar os controles de movimento (teclado e joystick de toque) para o personagem: virar e andar.
- **FR-009**: Enquanto anda, o modelo MUST tocar a animação de caminhada; ao parar, a de parado; a troca MUST ser suave e em menos de 1 s.
- **FR-010**: O personagem MUST ser bloqueado por paredes, pela borda do mapa e pelas outras peças (mesma regra de ocupação do mapa); nunca atravessa.
- **FR-011**: A câmera presa MUST poder ser aproximada e afastada dentro de um intervalo fixo, pelos mesmos controles de zoom de hoje (botões, roda, pinça), e MUST continuar atrás do personagem; em modo livre o jogador com personagem não solta a câmera.
- **FR-012**: Fora do modo livre, a vista 3D MUST se comportar exatamente como hoje (câmera que segue e pode ser solta, nada move peças), e o modelo só substitui a figura 2,5D no desenho.
- **FR-013**: Ao desligar o modo livre durante uma caminhada, a câmera MUST voltar ao comportamento de hoje e o personagem MUST voltar a ser desenhado no hex da sua peça.
- **FR-014**: A caminhada MUST ser local à vista 3D de quem anda: MUST NOT mudar a posição ou a direção da peça, MUST NOT enviar nada ao servidor nem aos outros participantes e MUST NOT gerar linha no chat. Ela é esquecida ao sair da vista 3D, recarregar, trocar de mapa ou de personagem, ou quando a peça é movida por outro meio (o personagem volta ao hex da peça).
- **FR-015**: As animações MUST vir, para cada estado (parado, caminhando), do clipe do arquivo quando ele existe (procurado pelo nome, sem distinguir maiúsculas: "idle"/"parado", "walk"/"caminhar" e variantes); quando falta e o esqueleto tem os nomes humanoides padrão, das animações próprias do Roll6; senão o modelo fica estático. A prévia da aba "3D" MUST mostrar a origem de cada estado e avisar quando o modelo ficará estático.
- **FR-016**: O mestre e os jogadores sem personagem andável MUST continuar com a câmera de hoje, também em modo livre.
- **FR-017**: A aba "3D", o envio, a prévia e os erros MUST estar em português, com feedback pelas notificações da tela como o resto do app; os ícones seguem o conjunto do app.
- **FR-018**: Os assistentes de IA (ferramentas do servidor MCP) MUST poder definir e remover o modelo 3D de um token ao criar ou editar o token, e as leituras do token MUST informar se há modelo e a sua URL.

### Key Entities

- **Token**: ganha um **modelo 3D** opcional (nome do arquivo guardado + URL de leitura), ao lado da imagem de pé, da deitada e das quatro imagens 2,5D. Continua sendo a biblioteca do criador, usado por personagens, NPCs e objetos.
- **Peça no mapa**: não muda; passa a expor a URL do modelo do seu token para a vista 3D.
- **Personagem em caminhada** (estado só da vista 3D do jogador, nunca salvo nem compartilhado): posição contínua dentro do mapa, direção para onde olha, se está andando ou parado, distância da câmera. Começa no hex e na direção da peça.
- **Animações padrão do Roll6**: um clipe de parado e um de caminhada para esqueleto humanoide com os nomes padrão, distribuídos com o app (não são arquivos do usuário).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário consegue enviar o modelo de exemplo e vê-lo na prévia do token em menos de 1 minuto, sem instruções.
- **SC-002**: Com o modelo de exemplo (≈ 5 MB, ≈ 8 mil triângulos) e até 8 peças com modelo na cena, a vista 3D mantém a fluidez de hoje num notebook comum e num celular recente (sem engasgo perceptível ao andar ou girar).
- **SC-003**: Em modo livre, um jogador novo entende que anda com o personagem e consegue atravessar o mapa até um ponto indicado em menos de 30 s, usando só o que já conhece (teclas/joystick e zoom).
- **SC-004**: Fora do modo livre, nenhuma diferença de comportamento é observável em relação a hoje, a não ser peças com modelo desenhadas como modelo.
- **SC-005**: Um arquivo inválido ou acima do limite nunca chega a ser salvo: 100% das tentativas são recusadas com mensagem.
- **SC-006**: Um modelo que falha ao abrir na vista 3D nunca derruba a vista: as outras peças, paredes e balões continuam.

## Assumptions

- **Formato**: só `.glb` (glTF binário, com texturas embutidas); `.gltf` com arquivos separados, `.fbx` e `.obj` ficam de fora. Limite de **20 MB** por arquivo (o exemplo tem 4,7 MB). O arquivo é guardado como os documentos de ficha: enviado uma vez, nome gerado, nunca sobrescrito.
- **Quem envia**: o criador do token, pelas mesmas telas e permissões das imagens 2,5D; o mestre que escolhe o token de alguém não edita o modelo.
- **Orientação e escala do arquivo**: o modelo é considerado de pé com a frente para a direção "frente" padrão do formato e os pés na base; o app o ajusta à altura da figura 2,5D de uma peça do mesmo espaço (uma peça de 1 hex ≈ a altura das figuras de hoje), centrado no hex. Nenhum ajuste manual de escala, rotação ou deslocamento nesta versão.
- **Frente do modelo**: o modelo vira conforme o `look` da peça, como as figuras 2,5D; andar vira a peça (o `look`) junto.
- **Animações**: dois estados apenas, parado e caminhando (sem correr, pular, atacar); a seleção dos clipes é pelo nome quando o arquivo os traz ("Idle"/"Walk" ou variantes óbvias, sem distinguir maiúsculas). "Esqueleto humanoide com nomes padrão" é a convenção de nomes do Mixamo (`Hips`, `Spine`, `LeftUpLeg`…, com ou sem o prefixo `mixamorig:`), a do modelo de exemplo e das ferramentas de geração automática mais comuns; outras convenções podem vir depois.
- **Controles de caminhada**: os mesmos de hoje para a câmera (setas/WASD e joystick virtual): frente anda, lados viram; a velocidade é fixa e razoável (cerca de 1,5 hex por segundo).
- **Colisão**: paredes da máscara 3D (qualquer altura, como a câmera hoje), borda do mapa e as outras peças por ocupação de hex; o personagem desliza ao longo de um obstáculo.
- **Câmera presa**: distância mínima e máxima fixas; sem inclinação vertical (como hoje); sem primeira pessoa.
- **Modo livre e regras do 054**: a caminhada não toca o servidor, então não há registro, custo de Deslocamento nem permissão nova; quem anda é só o jogador com o seu personagem aprovado e escolhido.
- **Mestre**: continua observador na vista 3D (câmera livre); não anda com NPCs nesta versão.
- **Compatibilidade**: as figuras 2,5D continuam funcionando; tokens sem modelo não mudam nada; a vista 3D continua a mesma para máscara, chão, fundo, textura de parede e balões.
- **Aparelhos**: a vista 3D com modelos exige o mesmo suporte de hoje; sem ele, a mensagem de hoje e a volta ao 2D.
