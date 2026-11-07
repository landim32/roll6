# Feature Specification: Aviso de nova versão do site

**Feature Branch**: `110-pwa-update-notice`
**Created**: 2026-11-07
**Status**: Draft
**Input**: User description: "Já vi em outros PWA quando ele atualiza o frontend, exibe uma mensagem de tela falando que existe uma nova versão e pede para atualizar. Implemente isso"

## Contexto

O Roll6 é instalável e costuma ficar aberto por horas ou dias, no celular (app instalado) e no computador (aba da
mesa). Hoje o app não guarda cópia do site: cada abertura carrega a versão publicada. Quem já está com o site aberto,
porém, continua na versão antiga até recarregar por conta própria. Não há nada que avise que existe uma versão nova.
Enquanto isso, a versão antiga pode conversar com uma API mais nova e falhar sem explicação, inclusive ao abrir telas
carregadas sob demanda (vista 3D, editores), cujos arquivos antigos deixam de existir depois da publicação.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ser avisado de que há uma versão nova (Priority: P1)

Um jogador está com a mesa aberta. O site é publicado de novo. Pouco depois, sem precisar fazer nada, ele vê um aviso
discreto na tela, "Nova versão do Roll6 disponível", com o botão "Atualizar". Ao tocar, o site recarrega já na versão
nova, no mesmo endereço (mesma campanha/mapa).

**Why this priority**: É o pedido; sem isso a pessoa fica dias numa versão velha.

**Independent Test**: Abrir o site, publicar uma versão nova e conferir que o aviso aparece no tempo esperado e que
"Atualizar" carrega a versão nova na mesma página.

**Acceptance Scenarios**:

1. **Given** o site aberto numa versão, **When** uma versão nova é publicada, **Then** em até 5 minutos com a tela em uso
   (ou logo ao voltar para o app/aba) aparece o aviso com "Atualizar".
2. **Given** o aviso visível, **When** a pessoa toca "Atualizar", **Then** a página recarrega na versão nova, no mesmo
   endereço, com a sessão mantida (sem novo login).
3. **Given** o site aberto na versão mais recente, **When** nada foi publicado, **Then** nenhum aviso aparece.
4. **Given** o app instalado no celular, **When** ele volta do segundo plano depois de uma publicação, **Then** o aviso
   aparece logo ao voltar.

---

### User Story 2 - Não perder trabalho ao atualizar (Priority: P1)

A pessoa tem alterações não salvas (mapa em edição, animação, página da biblioteca, mensagem sendo escrita no chat).
Atualizar não pode apagar isso sem ela saber.

**Why this priority**: Recarregar sem cuidado perderia trabalho, o pior efeito possível do aviso.

**Independent Test**: Com um mapa alterado e não salvo, tocar "Atualizar" e conferir que o site pergunta antes de
recarregar.

**Acceptance Scenarios**:

1. **Given** alterações não salvas em qualquer tela que hoje já protege a saída (mapa, editor de animação, gerador de
   mapas, páginas da biblioteca), **When** a pessoa toca "Atualizar", **Then** o site pergunta, com as mesmas opções que
   ela já conhece, antes de recarregar; ao cancelar, nada muda e o aviso continua.
2. **Given** um texto digitado e ainda não enviado no chat (ou numa janela de ação), **When** a pessoa toca "Atualizar",
   **Then** o site pergunta antes de descartá-lo, como nas outras alterações não salvas.
3. **Given** nenhuma alteração pendente, **When** a pessoa toca "Atualizar", **Then** recarrega direto, sem pergunta.

---

### User Story 3 - Adiar a atualização (Priority: P2)

No meio de uma cena, a pessoa não quer recarregar agora. Ela fecha o aviso e continua jogando; o aviso volta mais tarde.

**Why this priority**: O aviso não pode atrapalhar o jogo.

**Independent Test**: Fechar o aviso e conferir que ele some, não cobre controles da mesa e volta depois.

**Acceptance Scenarios**:

1. **Given** o aviso visível, **When** a pessoa toca "Depois", **Then** ele some e reaparece só depois de 30 minutos,
   ou na próxima vez que o app/aba voltar ao primeiro plano, o que vier primeiro.
2. **Given** o aviso visível, **When** a pessoa usa a mesa, **Then** o aviso não cobre o menu superior, os botões do mapa,
   o painel lateral nem o campo do chat, em celular e em computador.
3. **Given** a pessoa recarregou a página por conta própria, **When** a nova versão abre, **Then** nenhum aviso aparece.

---

### User Story 4 - Telas que não abrem por causa da versão antiga (Priority: P2)

Depois de uma publicação, quem está na versão antiga abre uma tela carregada sob demanda (vista 3D, isométrica, editor)
e ela não carrega mais. Em vez de um erro sem explicação, aparece o mesmo aviso, já pedindo para atualizar.

**Why this priority**: Esse é o sintoma mais confuso de uma versão velha.

**Independent Test**: Numa aba antiga, depois de publicar, abrir a vista 3D e conferir que surge o aviso de nova versão,
em vez de tela em branco ou erro genérico.

**Acceptance Scenarios**:

1. **Given** uma versão nova publicada e a aba ainda na antiga, **When** uma parte do site falha ao carregar porque os
   arquivos antigos não existem mais, **Then** aparece o aviso de nova versão com "Atualizar", e o resto da tela segue
   funcionando.
2. **Given** a mesma falha sem que exista uma versão nova (rede caiu), **When** acontece, **Then** o site mostra o erro de
   conexão de hoje, não o aviso de versão.

---

### Edge Cases

- Sem conexão: a verificação falha em silêncio e é tentada de novo depois; nunca aparece aviso falso.
- Duas publicações seguidas: um único aviso; atualizar leva à mais recente.
- Várias abas abertas: cada uma mostra o seu aviso; atualizar uma não recarrega as outras sem pedir.
- Ambiente de desenvolvimento (`npm run dev`): nenhum aviso.
- Tela de login, página de animação, biblioteca, mesa: o aviso aparece em todas, sem mudar o layout delas.
- Tela com uma janela (modal) aberta: o aviso continua visível e clicável, sem fechar a janela.
- Recarregar não pode trazer de volta a versão antiga de um cache do navegador.
- A verificação não pode pesar: no máximo uma consulta pequena a cada 5 minutos por aba visível, e nenhuma com a aba
  em segundo plano.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Cada versão publicada do site MUST ter uma identificação própria, diferente da anterior, conhecida tanto
  pela página carregada quanto pelo servidor que entrega o site.
- **FR-002**: O site aberto MUST verificar se a versão publicada mudou a cada 5 minutos enquanto a aba/app estiver em
  primeiro plano, e também sempre que voltar ao primeiro plano. Em segundo plano, não verifica.
- **FR-003**: Ao detectar uma versão diferente, o site MUST mostrar um aviso não bloqueante com o texto "Nova versão do
  Roll6 disponível" e os botões "Atualizar" e "Depois", em português, no visual do site, nas telas de login, mesa,
  biblioteca e editores.
- **FR-004**: "Atualizar" MUST recarregar no mesmo endereço, buscando a versão nova (nunca uma cópia antiga guardada),
  mantendo a sessão e as preferências guardadas no aparelho.
- **FR-005**: Antes de recarregar, o site MUST passar pela mesma proteção de alterações não salvas que já existe na saída
  de cada tela, e MUST tratar também como alteração pendente um texto digitado e não enviado no chat; cancelar mantém a
  pessoa na página e o aviso visível.
- **FR-006**: "Depois" MUST esconder o aviso até 30 minutos passarem ou o app voltar ao primeiro plano.
- **FR-007**: Quando uma parte do site carregada sob demanda falhar por não existir mais e houver uma versão nova
  publicada, o site MUST mostrar o aviso de nova versão em vez de um erro genérico.
- **FR-008**: Falhas de verificação (sem rede, servidor fora) MUST ser silenciosas e nunca gerar aviso.
- **FR-009**: Em desenvolvimento local, o aviso MUST ficar desligado.
- **FR-010**: O aviso MUST NOT cobrir o menu superior, os botões do mapa, os painéis laterais nem o campo do chat, e MUST
  respeitar as áreas seguras do app instalado (entalhe, barra inferior).

### Key Entities

- **Versão do site**: identificação de uma publicação do frontend; a da página aberta é comparada com a publicada.
- **Aviso de nova versão**: estado da tela (oculto, visível, adiado até um horário) da aba atual; nada é gravado no
  servidor.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Depois de uma publicação, 100% das abas em primeiro plano mostram o aviso em até 5 minutos, e um app que
  volta do segundo plano mostra em até 5 segundos.
- **SC-002**: Em 100% dos casos, "Atualizar" abre a versão nova no mesmo endereço sem pedir login.
- **SC-003**: Nenhuma alteração não salva é perdida por causa de "Atualizar" sem uma confirmação explícita.
- **SC-004**: Zero avisos sem uma publicação nova (incluindo quedas de rede), medido em uma semana de uso.
- **SC-005**: Atualizar leva no máximo dois toques (Atualizar e, se houver alterações, a confirmação).

## Assumptions

- O site continua sem guardar cópia offline (o app instalado só deixa instalar e recebe notificações); a novidade é
  apenas detectar e avisar.
- A identificação da versão é gerada a cada build do frontend e publicada junto com ele, num endereço que o servidor
  entrega sempre atualizado (sem cache), como já acontece com o arquivo do app instalável.
- A publicação do frontend em produção continua sendo feita como hoje; esta feature não muda o deploy, só exige que o
  novo arquivo de versão seja publicado junto.
- O texto não enviado do chat hoje não é guardado no aparelho; em vez de passar a guardá-lo, ele entra na pergunta de
  alterações pendentes antes de atualizar.
- Sem atualização forçada: a pessoa sempre decide quando recarregar.
