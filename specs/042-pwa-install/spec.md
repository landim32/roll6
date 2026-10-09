# Feature Specification: Roll6 instalável (PWA)

**Feature Branch**: `042-pwa-install`
**Created**: 2026-10-09
**Status**: Draft
**Input**: User description: "Implemente o PWA, issue https://github.com/landim32/roll6/issues/38"

## Contexto

Hoje o Roll6 só existe como página no navegador: não pode ser posto na tela de início do celular e não abre como um aplicativo. Ser instalável é também o pré-requisito das notificações (#39), porque no iOS elas só funcionam com o aplicativo instalado na tela de início. Esta feature torna o Roll6 instalável no Android e no iOS **sem mudar nada do funcionamento da mesa**; o app continua precisando de rede.

## Clarifications

### Session 2026-10-09

- Q: Onde fica o convite para instalar o Roll6? → A: Item "Instalar o Roll6" no menu do usuário, mais um aviso discreto no celular que aparece uma única vez por aparelho, depois do login, com "Instalar" e "Agora não"; recusado, não volta (o item do menu continua).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Instalar no Android pelo botão do app (Priority: P1)

Um jogador abre o Roll6 no Chrome do Android. Quando o navegador permite instalar, o menu do usuário passa a oferecer "Instalar o Roll6". Ele toca, confirma no diálogo do sistema e o ícone do Roll6 aparece na tela de início. Ao abrir pelo ícone, o Roll6 ocupa a tela inteira, sem a barra do navegador, com as cores da marca.

**Why this priority**: É o caminho mais comum entre os jogadores (Android) e o que entrega o valor central: abrir a mesa como um aplicativo, num toque.

**Independent Test**: Num Android com Chrome, abrir o site publicado, instalar pelo item do menu e abrir pelo ícone; a mesa abre em tela cheia e funciona como no navegador.

**Acceptance Scenarios**:

1. **Given** o navegador oferece a instalação e o Roll6 não está instalado, **When** o usuário abre o menu do usuário, **Then** vê o item "Instalar o Roll6".
2. **Given** o item está visível, **When** o usuário toca nele, **Then** aparece o diálogo de instalação do próprio sistema; aceitando, o Roll6 é instalado e o item some.
3. **Given** o usuário abre a página, **When** nada foi tocado, **Then** nenhum diálogo de instalação aparece sozinho.
4. **Given** o navegador não oferece a instalação (já instalado, navegador sem suporte ou desktop sem o recurso), **When** o usuário abre o menu, **Then** o item não aparece (exceto no iOS, ver US2).
5. **Given** o Roll6 instalado, **When** o usuário abre pelo ícone, **Then** a mesa abre em tela cheia, na página inicial do app, com a cor de tema e a tela de abertura da marca.
6. **Given** um celular Android em que a instalação é possível e o aviso nunca foi mostrado, **When** o usuário entra no Roll6 (depois do login), **Then** aparece uma vez um aviso discreto "Instalar o Roll6" com "Instalar" e "Agora não", que não cobre a mesa nem bloqueia o uso.
7. **Given** o aviso, **When** o usuário toca em "Agora não" (ou o fecha), **Then** ele não volta mais naquele aparelho; o item do menu continua disponível.

---

### User Story 2 - Instalar no iPhone/iPad com o guia (Priority: P1)

No Safari do iOS não existe botão de instalar. O menu do usuário oferece "Instalar o Roll6", que abre uma janela explicando os passos: tocar em "Compartilhar" e depois em "Adicionar à Tela de Início". Feito isso, o Roll6 abre pelo ícone em tela cheia.

**Why this priority**: Metade da mesa usa iPhone, e no iOS a instalação é o único caminho para as notificações futuras (#39).

**Independent Test**: Num iPhone com Safari, abrir o site, seguir o guia do menu e abrir pelo ícone; a mesa abre em tela cheia, com o ícone e o nome "Roll6".

**Acceptance Scenarios**:

1. **Given** um iPhone/iPad no Safari com o Roll6 ainda não instalado, **When** o usuário abre o menu do usuário, **Then** vê "Instalar o Roll6".
2. **Given** o item, **When** tocado, **Then** abre uma janela com os passos ilustrados por ícones ("Compartilhar" → "Adicionar à Tela de Início") e um botão para fechar.
3. **Given** o Roll6 já aberto pelo ícone da tela de início, **When** o usuário abre o menu, **Then** o item não aparece.
3a. **Given** um iPhone no navegador e o aviso nunca mostrado naquele aparelho, **When** o usuário entra no Roll6 (depois do login), **Then** aparece uma vez o mesmo aviso discreto; "Instalar" abre o guia e "Agora não" encerra o aviso para sempre naquele aparelho.
4. **Given** o Roll6 instalado no iOS, **When** aberto pelo ícone, **Then** abre em tela cheia, com o ícone, o nome "Roll6" e a cor da barra de status da marca.

---

### User Story 3 - O app instalado se mantém atualizado e não atrapalha a mesa (Priority: P2)

Depois de cada publicação, quem usa o app instalado recebe a versão nova ao abri-lo de novo, sem precisar reinstalar nem limpar nada. Durante o jogo, tudo o que é em tempo real (peças, chat, turnos) continua chegando como no navegador, e os links de campanha e de mapa abrem dentro do app instalado.

**Why this priority**: Um app instalado que fica preso numa versão antiga ou que guarda respostas velhas quebraria a mesa; é a garantia de que instalar não piora nada.

**Independent Test**: Com o app instalado, publicar uma versão nova, fechar e abrir o app: a versão nova aparece. Jogar um turno com outra pessoa: movimentos, chat e fim de turno chegam na hora.

**Acceptance Scenarios**:

1. **Given** o app instalado e uma versão nova publicada, **When** o usuário fecha e abre o app, **Then** vê a versão nova (no máximo na segunda abertura, sem reinstalar nem limpar dados).
2. **Given** o app instalado, **When** outro jogador move uma peça ou escreve no chat, **Then** a mudança chega como no navegador.
3. **Given** um link `/campaign/{slug}` ou `/map/{slug}` aberto dentro do app instalado, **When** carregado, **Then** abre aquela campanha ou mapa, como no navegador.
4. **Given** o app instalado sem rede, **When** aberto, **Then** o comportamento é o do navegador sem rede (o Roll6 não promete funcionar offline).

---

### Edge Cases

- O usuário recusa o diálogo do sistema no Android: nada muda, o item continua no menu para outra tentativa enquanto o navegador permitir; o aviso, já mostrado, não volta.
- O aviso de instalação não aparece no desktop, dentro do app já instalado, antes do login nem por cima de janelas abertas.
- O usuário já instalou e abre o site no navegador: o Android deixa de oferecer a instalação e o item some; no iOS o Safari não informa se está instalado, então o item continua aparecendo no navegador e só some dentro do app instalado.
- Navegador do iOS que não é o Safari (Chrome/Firefox no iPhone): o guia explica que a instalação se faz pelo Safari ou pelo menu "Compartilhar" do próprio navegador, conforme o caso.
- Desktop: no Chrome/Edge o item aparece quando o navegador oferecer a instalação; nos demais não aparece.
- Ambiente de desenvolvimento local: nada de instalação nem de trabalho em segundo plano interfere com a recarga automática do desenvolvimento.
- Uma versão antiga do app instalado ainda aberta durante uma publicação: a próxima abertura usa a versão nova.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O Roll6 MUST ser instalável na tela de início no Android (Chrome) e no iOS (Safari, "Adicionar à Tela de Início"), com o nome "Roll6", o ícone do símbolo da marca (também na forma recortável dos ícones adaptativos do Android) e a cor de tema azul da marca.
- **FR-002**: Instalado, o Roll6 MUST abrir em tela cheia, sem a barra do navegador, na página inicial do app, com a cor de fundo e a tela de abertura da marca.
- **FR-003**: O menu do usuário MUST oferecer "Instalar o Roll6" somente quando a instalação for possível: no Android/desktop, quando o navegador a oferecer; no iOS, quando não estiver aberto como app instalado.
- **FR-004**: O diálogo de instalação do sistema MUST aparecer só depois de o usuário tocar em "Instalar o Roll6" (no menu ou no aviso), nunca sozinho ao abrir a página.
- **FR-004a**: No celular (Android ou iOS), quando a instalação for possível e o app não estiver instalado, o Roll6 MUST mostrar **uma única vez por aparelho**, depois do login, um aviso discreto "Instalar o Roll6" com "Instalar" e "Agora não", sem cobrir a mesa nem bloquear o uso; "Agora não" ou fechar o aviso o encerra para sempre naquele aparelho, e "Instalar" segue o mesmo caminho do item do menu (diálogo do sistema no Android, guia no iOS). No desktop o aviso não aparece.
- **FR-005**: No iOS, "Instalar o Roll6" MUST abrir uma janela com as instruções ("Compartilhar" e depois "Adicionar à Tela de Início"), com ícones, que o usuário fecha quando quiser.
- **FR-006**: A janela de instruções do iOS MUST poder ser aberta também por outras partes do app (a #39 a mostrará antes de oferecer as notificações).
- **FR-007**: O trabalho em segundo plano que torna o app instalável MUST NOT guardar nem servir respostas da API, do canal de tempo real, do servidor MCP, nem imagens e áudios dos usuários; essas requisições vão sempre à rede, como no navegador.
- **FR-008**: Cada publicação MUST chegar ao app instalado na próxima abertura (no máximo na segunda), sem reinstalar nem limpar dados.
- **FR-009**: Os links `/campaign/{slug}` e `/map/{slug}` MUST continuar funcionando dentro do app instalado.
- **FR-010**: Em desenvolvimento local, o trabalho em segundo plano MUST NOT ser ativado.
- **FR-011**: O servidor web MUST entregar os arquivos do app instalável com o tipo correto e sem cache do arquivo de trabalho em segundo plano, de modo que a versão nova seja vista a cada publicação.
- **FR-012**: Todos os textos novos MUST estar em português (pt-BR) e seguir o tema escuro e os componentes já usados no app.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um jogador instala o Roll6 no Android em até 3 toques a partir do menu do usuário ou do aviso.
- **SC-001a**: O aviso de instalação aparece no máximo uma vez por aparelho.
- **SC-002**: Um jogador com iPhone instala o Roll6 seguindo só o guia do app, sem ajuda externa, em menos de 1 minuto.
- **SC-003**: 100% das aberturas pelo ícone acontecem em tela cheia, sem a barra do navegador, no Android e no iOS.
- **SC-004**: Depois de uma publicação, o app instalado mostra a versão nova no máximo na segunda abertura, em 100% dos casos testados.
- **SC-005**: Nenhuma diferença de comportamento da mesa entre o navegador e o app instalado: movimentos, chat, turnos e links de campanha/mapa funcionam igual nos cenários de teste.
- **SC-006**: Os verificadores de instalabilidade dos navegadores (Chrome) consideram o Roll6 instalável, sem erros.

## Assumptions

- Instalar não muda permissões nem dados: a sessão, o mapa lembrado e as preferências seguem as regras atuais de cada aparelho. No iOS o app instalado tem armazenamento próprio, separado do Safari, então pode pedir login de novo na primeira abertura — isso é do iOS e não é tratado aqui.
- O app continua exigindo rede; funcionamento offline e notificações (#39) estão fora do escopo.
- A estratégia de cache é a mais simples possível: nada guardado além do exigido para ser instalável; os arquivos do site continuam vindo da rede como hoje.
- O convite à instalação é o item "Instalar o Roll6" do menu do usuário e, no celular, um aviso discreto mostrado uma única vez por aparelho (a lembrança de que já foi mostrado é guardada só naquele aparelho).
- Os ícones vêm do símbolo da logomarca escura já usado nos favicons (038/040).
- O servidor de produção (nginx compartilhado, fora do repositório) é configurado pelo responsável pelo deploy com as regras que esta feature documentar; o nginx de homologação do repositório é atualizado aqui.
- Produção já usa HTTPS; em desenvolvimento, `localhost` basta para testar a instalação.
