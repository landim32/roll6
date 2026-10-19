# Feature Specification: Token com armas no editor de animação

**Feature Branch**: `092-editor-token-weapons`
**Created**: 2026-10-18
**Status**: Draft
**Input**: User description: "Melhoria no Editor de Animação: ao selecionar a animação, tem que poder selecionar um token com suas armas e não apenas a animação do token."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - O palco mostra o token com as suas armas (Priority: P1)

No editor de animação, o usuário escolhe em "Modelo" um dos seus tokens com modelo 3D. Hoje o palco mostra só o corpo do token, sem as armas que ele carrega. Passa a mostrar **o token como na mesa**: o modelo com as armas nos seus encaixes (mãos, costas, coldres), no tamanho e no ajuste fino salvos no token, acompanhando a animação quadro a quadro. Assim o usuário vê se um golpe atravessa o corpo com a espada, se o escudo cobre o lado certo, se a arma das costas atrapalha o movimento.

**Why this priority**: é o pedido inteiro; sem as armas o usuário monta ataques e defesas no escuro.

**Independent Test**: escolher no editor um token que tem espada na mão direita e escudo na esquerda, tocar uma animação de ataque e ver as duas armas acompanhando as mãos.

**Acceptance Scenarios**:

1. **Given** um token com armas salvas nos encaixes, **When** é escolhido em "Modelo" no editor, **Then** o palco mostra o modelo com cada arma no seu encaixe, no tamanho e no ajuste salvos no token.
2. **Given** a animação tocando ou parada em qualquer instante (barra de tempo, pose principal), **When** o palco é desenhado, **Then** as armas seguem os ossos onde estão encaixadas, como na vista 3D da mesa.
3. **Given** um token sem armas, **When** é escolhido, **Then** o palco mostra só o modelo, como hoje.
4. **Given** um encaixe cujo osso o modelo não tem, **When** o token é escolhido, **Then** aquela arma não aparece e o resto funciona normalmente.
5. **Given** o usuário troca de token em "Modelo", **When** o novo token carrega, **Then** as armas do anterior somem e as do novo aparecem.

---

### User Story 2 - Ligar e desligar as armas e contar ao Claude (Priority: P2)

Ao lado de "Esqueleto", o editor ganha o botão **"Armas"**, ligado por padrão quando o token tem armas, para ver o corpo limpo quando for preciso (girar um osso escondido atrás de um escudo, por exemplo). O print anexado à conversa mostra o palco como está (com ou sem armas) e a legenda diz quais armas o modelo carrega e onde, para que o Claude leve isso em conta ("o modelo segura uma espada na mão direita e um escudo na esquerda").

**Why this priority**: refina o uso; a História 1 já entrega o essencial.

**Independent Test**: desligar "Armas", ver o corpo sem armas, anexar um print e conferir a legenda; ligar de novo.

**Acceptance Scenarios**:

1. **Given** um token com armas, **When** o usuário desliga "Armas", **Then** as armas somem do palco e voltam ao ligar; a escolha é lembrada no aparelho.
2. **Given** um token sem armas, **When** é escolhido, **Then** o botão "Armas" fica desabilitado.
3. **Given** as armas visíveis, **When** o usuário anexa um print, **Then** o print mostra as armas e a legenda lista cada arma e o seu encaixe.
4. **Given** um pedido ao Claude com um token armado escolhido, **When** é enviado, **Then** o contexto do pedido informa as armas e os encaixes do modelo mostrado.
5. **Given** o celular, **When** o editor abre, **Then** o botão "Armas" segue a regra dos outros controles do palco no celular.

---

### Edge Cases

- Uma arma cujo arquivo falha ao carregar não aparece e não impede o resto do palco nem a animação.
- Armas de outros donos (da biblioteca compartilhada) carregadas no token aparecem igual às próprias.
- Selecionar um osso com o gizmo continua funcionando com as armas visíveis: o clique escolhe o osso, não a arma.
- Uma arma editada na biblioteca (pose, ponto de pega, arquivo) aparece atualizada ao escolher o token de novo ou recarregar o editor.
- A troca de token no meio de um pedido em andamento só muda o palco; o pedido continua com o modelo que foi enviado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O palco do editor DEVE mostrar o modelo do token escolhido com as armas salvas nos seus encaixes, no tamanho e no ajuste fino do token, seguindo a animação em qualquer instante.
- **FR-002**: A posição das armas no editor DEVE ser a mesma da vista 3D da mesa e da prévia do formulário do token para o mesmo token, a mesma pose e o mesmo instante.
- **FR-003**: Armas sem osso para o seu encaixe ou com arquivo que não carrega NÃO DEVEM aparecer nem impedir o resto do editor.
- **FR-004**: O editor DEVE ter o botão "Armas", que mostra ou esconde as armas no palco, ligado por padrão, desabilitado para tokens sem armas, com a escolha lembrada no aparelho.
- **FR-005**: O print anexado DEVE mostrar o palco como está, e a sua legenda DEVE listar as armas visíveis e os seus encaixes.
- **FR-006**: O contexto enviado ao Claude com cada pedido DEVE informar as armas e os encaixes do token mostrado.
- **FR-007**: Selecionar ossos, girar poses, desfazer/refazer e salvar (091) DEVEM funcionar igual com as armas visíveis; as armas nunca são gravadas na animação.

### Key Entities

- **Token mostrado**: o token escolhido em "Modelo" — o modelo 3D e as armas salvas nos seus encaixes, cada uma com tamanho e ajuste fino.
- **Arma no encaixe**: uma arma da biblioteca em um dos cinco encaixes (mão direita, mão esquerda, costas, coldre direito, coldre esquerdo).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das armas salvas de um token com os ossos dos seus encaixes aparecem no palco do editor ao escolher o token.
- **SC-002**: Para o mesmo token, pose e instante, a arma aparece no mesmo lugar no editor e na vista 3D da mesa (diferença imperceptível a olho).
- **SC-003**: Escolher um token armado mostra o palco completo em até 3 s numa conexão comum.
- **SC-004**: Toda legenda de print com armas visíveis cita cada arma e o seu encaixe.

## Assumptions

- "Modelo" continua listando os tokens do próprio usuário que têm modelo 3D, como hoje.
- As armas e o seu ajuste vêm do token salvo; o editor não edita armas nem encaixes (isso continua na aba "Armas" do token).
- As armas não entram no arquivo da animação nem mudam o formato `roll6-animation`.
- Nada muda no servidor além do texto de contexto enviado ao Claude, que já é montado a partir do pedido.
