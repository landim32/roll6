> **Superseded by 086-web-animation-editor** (2026-10-18): the Windows tool `roll6anime/` was removed; its capabilities live in the web editor (`/animation/:id`) and the generic console `backend/Roll6.Console`. Kept as history.

# Feature Specification: roll6anime — editor de animações com o Claude local

**Feature Branch**: `062-roll6anime-editor`
**Created**: 2026-10-14
**Status**: Draft
**Input**: User description: "Crie uma ferramenta de edição de animações: Projeto chamado roll6anime (uma pasta nesse projeto); Deve usar .NET para windows; Deve usar o mesmo padrão em .json usando aqui; Deve conectar com o claude local (usando a conta não API), na pasta C:\repos\gurps-adventure; Deve exibir um modelo .glb; Deve dar a possibilidade de selecionar a animação; Deve ter uma barra com o tempo de animação; Deve ter um campo de texto para digitar prompts para o claude local; Deve salvar as animações na pasta C:\repos\gurps-adventure\animacoes, a pasta fica no appsettings; Deve alterar os arquivos em tempo real"

## Contexto

Desde a 059, o Roll6 tem uma **biblioteca de animações**. Cada animação é um arquivo JSON no formato
**`roll6-animation` (versão 1)**: para cada osso de um esqueleto Mixamo, uma lista de instantes e de giros em
graus. O mesmo arquivo é validado igual em três lugares: no servidor, no site e na skill `criar-animacao` do
projeto da mesa (`C:\repos\gurps-adventure`).

Hoje, criar uma animação com a skill é um ciclo às cegas:

1. o usuário descreve o movimento ao Claude;
2. o Claude escreve o arquivo em `animacoes/`;
3. o usuário envia o arquivo ao Roll6 e só então vê o resultado num token.

Corrigir um detalhe ("o braço sobe demais", "feche a mão") repete o ciclo inteiro.

O **roll6anime** é uma ferramenta de desktop, para Windows, que fecha esse ciclo num só lugar. Ela mostra um
modelo 3D tocando a animação, tem uma barra de tempo e um campo para conversar com o **Claude local**: o Claude
Code instalado na máquina, logado com a conta do usuário (não com chave de API), trabalhando na pasta da mesa.
Quando o Claude altera o arquivo, o modelo na tela já toca a versão nova.

O roll6anime é uma pasta própria dentro deste repositório. Ele não faz parte do site nem do servidor do Roll6
e não fala com eles.

## Clarifications

### Session 2026-10-14

- Q: Além dos pedidos ao Claude, o usuário edita a animação diretamente na ferramenta? → A: Não. Toda mudança no
  arquivo vem do Claude ou de outro programa; a ferramenta mostra, toca e conversa, e nunca grava o JSON por conta
  própria.
- Q: A ferramenta envia a animação pronta para a biblioteca do Roll6? → A: Não. Ela só trabalha na pasta; o envio
  continua pelo site, pelo `enviar.py` da skill ou pedindo ao Claude. A ferramenta não guarda chave de API do Roll6.
- Q: Os pedidos seguidos continuam a mesma conversa com o Claude? → A: Uma conversa por animação. Os pedidos seguem
  a mesma conversa enquanto a mesma animação estiver aberta; trocar de animação começa outra (ou retoma a dela, se
  já houver), e um botão "Nova conversa" recomeça quando o usuário quiser.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver uma animação tocando num modelo (Priority: P1)

O usuário abre o roll6anime e escolhe um modelo `.glb`, por exemplo o orc do projeto da mesa. A ferramenta
lista as animações da pasta de animações. Ele escolhe uma, e o modelo passa a tocá-la, do mesmo jeito que
tocaria no Roll6. Uma barra mostra o tempo da animação: ele pausa, arrasta a barra até um instante e vê a pose
daquele instante.

**Why this priority**: sem ver a animação no modelo, nada mais na ferramenta faz sentido. Sozinha, esta
história já substitui o "enviar ao Roll6 para ver como ficou".

**Independent Test**: com um `.glb` de esqueleto Mixamo e os arquivos de exemplo na pasta, escolher cada
animação e conferir que o modelo toca, pausa, volta ao início e mostra a pose do instante escolhido na barra.

**Acceptance Scenarios**:

1. **Given** a ferramenta aberta, **When** o usuário escolhe um arquivo `.glb`, **Then** o modelo aparece na
   tela, de frente, inteiro, e pode ser girado para ser visto de outros lados.
2. **Given** um modelo aberto, **When** o usuário escolhe uma animação da lista, **Then** o modelo a toca: em
   ciclo se ela repete, ou uma vez, parando no último quadro, se não repete.
3. **Given** uma animação tocando, **When** o usuário pausa e arrasta a barra de tempo, **Then** o modelo fica
   na pose daquele instante, e a barra mostra o tempo atual e a duração.
4. **Given** um arquivo inválido na pasta, **When** o usuário o escolhe, **Then** a ferramenta mostra o erro
   com a mesma chave e o mesmo texto que o Roll6 daria e não toca o arquivo.
5. **Given** um modelo cujo esqueleto não segue os nomes do Mixamo, **When** ele é aberto, **Then** a
   ferramenta avisa que as animações não se aplicam a esse modelo.

---

### User Story 2 - Pedir ao Claude local para criar ou ajustar a animação (Priority: P1)

Com o modelo e uma animação abertos, o usuário digita um pedido no campo de texto, por exemplo "faça ele
erguer o machado acima da cabeça e golpear para baixo" ou "a mão esquerda está aberta, feche em punho". O
roll6anime envia o pedido ao Claude local, que trabalha na pasta da mesa com a skill `criar-animacao`. A
resposta do Claude aparece na tela enquanto ele trabalha. Quando ele grava o arquivo, o modelo passa a tocar a
versão nova sem o usuário fazer nada.

**Why this priority**: é o motivo de a ferramenta existir. Descrever, ver o resultado e pedir um ajuste, sem
sair da tela, é o ciclo que hoje leva minutos.

**Independent Test**: com o Claude Code instalado e logado, pedir uma animação nova, ver o arquivo aparecer na
lista e o modelo tocá-lo; depois pedir um ajuste e ver o modelo mudar sozinho.

**Acceptance Scenarios**:

1. **Given** uma animação aberta, **When** o usuário envia um pedido, **Then** o Claude local recebe o pedido
   junto com o nome do arquivo aberto, e o que ele responde aparece na conversa enquanto chega.
2. **Given** um pedido em andamento, **When** o Claude grava o arquivo da animação, **Then** o modelo toca a
   versão nova em até 1 segundo, sem recarregar o modelo nem perder o ponto de vista.
3. **Given** um pedido em andamento, **When** o usuário clica em "Parar", **Then** o Claude é interrompido e o
   campo volta a aceitar pedidos.
4. **Given** um pedido que cria uma animação nova, **When** o Claude grava o arquivo, **Then** ele aparece na
   lista e fica selecionado.
5. **Given** o Claude Code não instalado ou não logado, **When** o usuário envia um pedido, **Then** a
   ferramenta explica o que falta (instalar ou fazer login) e não trava.
6. **Given** a versão nova gravada pelo Claude é inválida, **When** o arquivo muda, **Then** a ferramenta
   mostra o erro e continua tocando a última versão válida.
7. **Given** um ajuste já pedido numa animação, **When** o usuário pede "agora um pouco menos", **Then** o
   Claude entende a partir do pedido anterior da mesma animação. Trocar de animação passa para a conversa dela,
   e "Nova conversa" recomeça a da animação aberta.

---

### User Story 3 - Acompanhar mudanças feitas fora da ferramenta (Priority: P2)

O arquivo de animação também pode mudar por fora: o usuário o edita num editor de texto, ou o Claude Code
roda num terminal em paralelo. A ferramenta percebe a mudança e o modelo toca a versão nova, como na história
anterior. Arquivos criados, renomeados ou apagados na pasta também aparecem na lista, ou somem dela, na hora.

**Why this priority**: "alterar os arquivos em tempo real" vale para qualquer origem. Também deixa a ferramenta
útil sem o campo de pedidos.

**Independent Test**: com uma animação aberta, mudar um giro no arquivo num editor de texto e salvar. O modelo
muda sozinho. Criar e apagar arquivos na pasta e ver a lista acompanhar.

**Acceptance Scenarios**:

1. **Given** uma animação aberta, **When** o arquivo é salvo por outro programa, **Then** o modelo toca a
   versão nova em até 1 segundo.
2. **Given** a lista aberta, **When** um arquivo `.json` é criado, renomeado ou apagado na pasta, **Then** a
   lista mostra a mudança.
3. **Given** a animação aberta é apagada por fora, **When** a ferramenta percebe, **Then** ela avisa e deixa o
   modelo parado.

---

### User Story 4 - Configurar as pastas (Priority: P3)

A pasta das animações e a pasta onde o Claude local trabalha vêm do arquivo de configuração da ferramenta. Os
valores iniciais são `C:\repos\gurps-adventure\animacoes` e `C:\repos\gurps-adventure`. O usuário pode trocar
a pasta das animações sem recompilar a ferramenta.

**Why this priority**: os valores iniciais já servem a quem usa a mesa. Trocar a pasta é raro.

**Independent Test**: mudar a pasta no arquivo de configuração, abrir a ferramenta e ver a lista da pasta nova.

**Acceptance Scenarios**:

1. **Given** uma pasta de animações configurada, **When** a ferramenta abre, **Then** ela lista os `.json`
   dessa pasta.
2. **Given** a pasta configurada não existe, **When** a ferramenta abre, **Then** ela diz qual pasta falta e
   não fecha.

### Edge Cases

- O modelo não tem um osso que a animação move: aquele osso é ignorado e o resto toca. É a regra do Roll6.
- A animação tem só alguns ossos: os outros ficam na pose de descanso, como no Roll6.
- O arquivo é salvo várias vezes em sequência, por exemplo pelo Claude gravando aos poucos: a ferramenta lê
  só quando a gravação termina e nunca mostra um arquivo pela metade como erro definitivo.
- Um arquivo que não é JSON ou está fora do formato aparece na lista marcado como inválido, com o motivo.
- Um `.glb` inválido ou sem esqueleto: a ferramenta diz que não conseguiu abrir o modelo.
- O Claude demora ou fica sem resposta: o pedido pode ser parado a qualquer momento.
- O Claude altera outros arquivos da pasta da mesa: isso é normal, porque ele trabalha no projeto. A
  ferramenta só acompanha a pasta de animações.
- Dois pedidos seguidos: um novo pedido só é aceito depois que o anterior termina ou é parado.

## Requirements *(mandatory)*

### Functional Requirements

**Modelo e reprodução**

- **FR-001**: A ferramenta MUST abrir um modelo `.glb` escolhido pelo usuário e mostrá-lo inteiro, de frente,
  podendo girá-lo e aproximá-lo. Ela MUST lembrar o último modelo aberto na próxima vez.
- **FR-002**: A ferramenta MUST tocar uma animação `roll6-animation` (versão 1) no modelo exatamente como o
  Roll6 toca:
  - giros no referencial do personagem;
  - braços relaxados antes das trilhas;
  - subida do quadril (`hipsLift`), inclusive `of: "hips"`;
  - repetir quando `loop` é verdadeiro, ou tocar uma vez e parar no último quadro quando é falso.
- **FR-003**: A ferramenta MUST ter uma barra de tempo com tocar/pausar, o tempo atual e a duração. Arrastar a
  barra MUST mostrar a pose daquele instante.
- **FR-004**: A ferramenta MUST avisar quando o esqueleto do modelo não segue os nomes do Mixamo, porque nesse
  caso as animações não se aplicam.

**Animações e arquivos**

- **FR-005**: A ferramenta MUST listar os arquivos `.json` da pasta de animações configurada. Cada item mostra:
  - nome e tipo sugeridos pelo arquivo, quando houver;
  - duração e se repete;
  - se o arquivo é inválido.
- **FR-006**: Escolher um item da lista MUST tocá-lo no modelo aberto.
- **FR-007**: A ferramenta MUST validar cada arquivo com as mesmas regras, chaves e mensagens de erro do
  Roll6 (servidor, site e `validar.py`). Os casos compartilhados de
  `specs/059-token-animation-library/fixtures/` MUST dar o mesmo resultado.
- **FR-008**: A ferramenta MUST acompanhar a pasta de animações. Quando um arquivo é criado, alterado,
  renomeado ou apagado, por ela, pelo Claude ou por outro programa:
  - a lista MUST ser atualizada;
  - se o arquivo aberto mudou, o modelo MUST tocar a versão nova em até 1 segundo, mantendo o ponto de vista;
  - uma versão inválida MUST mostrar o erro e manter tocando a última versão válida.
- **FR-009**: A ferramenta MUST NOT gravar nem alterar arquivos de animação por conta própria. Toda mudança vem
  do Claude local, que grava na pasta configurada como a skill `criar-animacao` faz (formato `roll6-animation`,
  nomes em minúsculas com hífens), ou de outro programa. A ferramenta só lê, valida e toca (Q1 = A).

**Claude local**

- **FR-010**: A ferramenta MUST ter um campo de texto para enviar pedidos ao Claude local:
  - o Claude Code da máquina, usando o login da conta do usuário, não uma chave de API;
  - trabalhando na pasta configurada (por padrão `C:\repos\gurps-adventure`), onde está a skill
    `criar-animacao`.
- **FR-011**: Cada pedido MUST ir ao Claude com o contexto da tela:
  - o arquivo de animação aberto (ou o pedido de criar um novo, quando não há nenhum aberto);
  - o modelo aberto.

  Assim o usuário pode dizer "feche a mão esquerda" sem citar o arquivo.
- **FR-012**: A resposta do Claude MUST aparecer na conversa enquanto chega, inclusive quais arquivos ele
  está lendo ou gravando. Um pedido em andamento MUST poder ser parado.
- **FR-013**: A conversa com o Claude MUST ser uma por animação (Q3 = A):
  - os pedidos seguem a mesma conversa enquanto a mesma animação estiver aberta, e o Claude lembra os pedidos
    anteriores dela ("agora um pouco menos");
  - trocar de animação passa para a conversa daquela animação, retomando-a se já existir nesta sessão da
    ferramenta;
  - o botão "Nova conversa" recomeça a conversa da animação aberta;
  - um pedido sem animação aberta (criar uma nova) começa uma conversa que passa a ser a da animação criada.
- **FR-014**: Se o Claude Code não estiver instalado, não estiver logado ou falhar, a ferramenta MUST dizer o
  motivo em português e continuar funcionando para ver e tocar animações.
- **FR-015**: Um arquivo novo criado pelo Claude na pasta de animações durante um pedido MUST aparecer na
  lista e ficar selecionado.

**Configuração e escopo**

- **FR-016**: O arquivo de configuração da ferramenta MUST guardar:
  - a pasta das animações (padrão `C:\repos\gurps-adventure\animacoes`);
  - a pasta de trabalho do Claude (padrão `C:\repos\gurps-adventure`).

  Trocar esses valores MUST valer na próxima abertura, sem recompilar.
- **FR-017**: A ferramenta MUST rodar no Windows como um programa de desktop, numa pasta própria deste
  repositório (`roll6anime`), sem depender do servidor nem do site do Roll6.
- **FR-018**: A ferramenta MUST NOT enviar animações para a biblioteca do Roll6 nem guardar credenciais do Roll6
  (Q2 = A). O envio continua pelo site, pelo `enviar.py` da skill ou pedindo ao Claude.
- **FR-019**: Todos os textos da ferramenta MUST estar em português.

### Key Entities

- **Arquivo de animação**: um `.json` no formato `roll6-animation` v1 na pasta configurada. Tem:
  - nome do arquivo;
  - nome, tipo e descrição sugeridos (opcionais);
  - duração;
  - se repete;
  - trilhas por osso;
  - subida do quadril (opcional);
  - estado de validação (válido, ou a chave e a mensagem do primeiro erro).
- **Modelo**: um `.glb` escolhido pelo usuário. Tem um esqueleto, que segue ou não os nomes do Mixamo; serve
  só para ver as animações e nunca é alterado.
- **Pedido ao Claude**: o texto do usuário mais o contexto da tela (arquivo aberto, modelo). Tem um estado:
  em andamento, concluído, parado ou falhou. A resposta chega aos poucos.
- **Conversa**: a sequência de pedidos e respostas de uma animação, com a memória do Claude. Vale enquanto a
  ferramenta está aberta e recomeça com "Nova conversa".
- **Configuração**: a pasta das animações e a pasta de trabalho do Claude.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Do pedido de ajuste ("feche a mão esquerda") até ver o modelo tocar o resultado, o usuário não
  precisa sair da ferramenta nem fazer nenhuma ação além de escrever e enviar o pedido.
- **SC-002**: Uma alteração salva no arquivo aberto, por qualquer programa, aparece no modelo em até
  1 segundo em 95% das vezes.
- **SC-003**: Para os 23 arquivos de teste compartilhados (5 válidos e 18 inválidos), a ferramenta dá o mesmo
  resultado de validação que o Roll6, com a mesma chave em 100% dos casos.
- **SC-004**: Uma animação vista na ferramenta e depois no Roll6, com o mesmo modelo, mostra as mesmas poses
  nos mesmos instantes. As juntas principais (mãos, pés, cabeça) não diferem a olho.
- **SC-005**: A ferramenta abre um modelo de até 20 MB e começa a tocar uma animação em até 3 segundos numa
  máquina de uso comum.
- **SC-006**: Com o Claude Code ausente ou deslogado, 100% das tentativas de pedido mostram uma mensagem que
  diz o que fazer, e a ferramenta continua aberta e usável.

## Assumptions

- **"Claude local"** é o Claude Code (CLI) instalado na máquina e logado com a conta do usuário (assinatura,
  não chave de API). A ferramenta o executa na pasta da mesa, onde ficam as skills, inclusive a
  `criar-animacao`. O que o Claude pode fazer na pasta segue as permissões que o usuário já configurou nesse
  projeto.
- **"O mesmo padrão em .json"** é o formato `roll6-animation` v1 da 059 (contrato em
  `specs/059-token-animation-library/contracts/animation-format.md`). A ferramenta passa a ser um quarto lugar
  que valida esse formato e deve mudar junto com os outros três.
- **"Alterar os arquivos em tempo real"** quer dizer que o Claude grava direto no arquivo da pasta, sem passo de
  exportar, e a ferramenta mostra na hora o que mudou, venha de onde vier (Q1 = A: ela própria não edita).
- **"Selecionar a animação"** é escolher um arquivo da pasta de animações. Os clipes que vêm dentro do `.glb`
  não fazem parte da lista, porque a ferramenta trabalha com animações `roll6-animation`, não com as do arquivo do modelo.
- **"Uma pasta nesse projeto"** é `roll6anime/`, na raiz do repositório Roll6, ao lado de `backend/` e
  `frontend/`. É um programa à parte, só para Windows, fora da stack web fixa da constituição (Princípio II),
  que vale para o backend e o frontend do Roll6. O plano registra isso como exceção justificada.
- O modelo é só referência visual: a ferramenta nunca altera o `.glb`.
- A ferramenta é de uso pessoal, numa máquina: não tem login, não tem usuários e não fala com a rede nem com o
  Roll6, exceto pelo que o Claude Code fizer.
- A memória das conversas vale enquanto a ferramenta está aberta; não é preciso guardá-la entre aberturas.
- O Windows da máquina é 10 ou 11, com aceleração gráfica comum.
