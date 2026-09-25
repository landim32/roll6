# Feature Specification: Submenu do Usuário (Editar, Trocar senha, Sair)

**Feature Branch**: `007-user-menu`
**Created**: 2026-09-25
**Status**: Draft
**Input**: User description: "No frontend, no menu na parte onde está o nome, crie um submenu com: Editar - abre um modal para alterar o usuário; Trocar senha - abre um modal para trocar a senha com senha antiga, nova senha, confirmar senha; Sair - Desloga e vai para a tela de login"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Abrir o submenu e sair (Priority: P1)

No menu superior, o nome do usuário logado passa a ser um botão. Ao clicar nele, abre um submenu
com três opções: "Editar", "Trocar senha" e "Sair". Ao escolher "Sair", a sessão é encerrada e o
usuário vai para a tela de login. O botão "Sair" que hoje fica solto no menu deixa de existir.

**Why this priority**: o submenu é a base das outras histórias e "Sair" substitui um comportamento
que já existe; sem ele o usuário perderia a forma de deslogar.

**Independent Test**: logar, clicar no nome, escolher "Sair" e confirmar que a tela de login é
exibida e que recarregar a página não volta ao mapa.

**Acceptance Scenarios**:

1. **Given** um usuário logado, **When** ele clica no seu nome no menu, **Then** abre um submenu com
   "Editar", "Trocar senha" e "Sair".
2. **Given** o submenu aberto, **When** o usuário clica fora dele ou pressiona Esc, **Then** o
   submenu fecha sem nenhuma ação.
3. **Given** o submenu aberto e o mapa atual salvo, **When** o usuário escolhe "Sair", **Then** a
   sessão é encerrada, a tela de login é exibida e um toast confirma a saída.
4. **Given** o mapa atual com alterações não salvas, **When** o usuário escolhe "Sair", **Then** o
   sistema pergunta se deseja salvar, descartar ou cancelar antes de sair (mesmo aviso usado hoje);
   cancelar mantém o usuário logado no mapa.

---

### User Story 2 - Editar o usuário (Priority: P2)

Ao escolher "Editar", abre um modal com os dados do usuário: o nome (editável) e o e-mail (apenas
exibido). Ao salvar, o nome novo passa a aparecer no menu e um toast confirma a alteração.

**Why this priority**: permite corrigir o nome exibido para os outros participantes das campanhas;
útil, mas não impede o uso do app.

**Independent Test**: abrir "Editar", trocar o nome, salvar, e confirmar que o menu mostra o nome
novo e que ele continua após recarregar a página.

**Acceptance Scenarios**:

1. **Given** o submenu aberto, **When** o usuário escolhe "Editar", **Then** abre um modal com o nome
   atual preenchido e o e-mail exibido sem possibilidade de edição.
2. **Given** o modal de edição, **When** o usuário altera o nome e salva, **Then** o modal fecha, o
   menu mostra o nome novo e um toast confirma a alteração.
3. **Given** o modal de edição, **When** o usuário deixa o nome vazio (ou só espaços) e tenta salvar,
   **Then** o modal permanece aberto e um toast informa que o nome é obrigatório.
4. **Given** o modal de edição, **When** o usuário cancela ou fecha o modal, **Then** nada é alterado.

---

### User Story 3 - Trocar a senha (Priority: P2)

Ao escolher "Trocar senha", abre um modal com três campos: senha atual, nova senha e confirmar nova
senha. Ao salvar com dados válidos, a senha é trocada, o modal fecha e um toast confirma. O usuário
continua logado.

**Why this priority**: segurança básica da conta; mesma prioridade da edição, independente dela.

**Independent Test**: trocar a senha, sair, e confirmar que o login funciona com a senha nova e
falha com a antiga.

**Acceptance Scenarios**:

1. **Given** o submenu aberto, **When** o usuário escolhe "Trocar senha", **Then** abre um modal com
   os campos senha atual, nova senha e confirmar nova senha, todos vazios e mascarados.
2. **Given** o modal preenchido corretamente, **When** o usuário salva, **Then** a senha é trocada, o
   modal fecha, um toast confirma e o usuário continua logado no mapa.
3. **Given** a nova senha e a confirmação diferentes, **When** o usuário tenta salvar, **Then** nada
   é enviado e um toast informa que as senhas não conferem.
4. **Given** a nova senha com menos de 8 caracteres, **When** o usuário tenta salvar, **Then** nada é
   enviado e um toast informa o tamanho mínimo.
5. **Given** a senha atual incorreta, **When** o usuário salva, **Then** o modal permanece aberto com
   os campos preenchidos e um toast informa que a senha atual está incorreta.

---

### Edge Cases

- Sessão expirada enquanto um modal está aberto: ao salvar, o usuário é levado à tela de login (como
  em qualquer outra ação do app).
- Clique duplo em "Salvar": o botão fica desabilitado enquanto a operação está em andamento, para
  não enviar duas vezes.
- Nome com espaços no início/fim: é salvo sem esses espaços.
- Nome maior que o limite aceito pelo sistema: o campo não permite digitar além do limite.
- Nova senha igual à atual: aceita (não há regra contra reutilização).
- Nome muito longo no menu: é exibido truncado com reticências, sem quebrar o layout do menu.
- Falha de rede ao salvar: o modal permanece aberto com os dados digitados e um toast informa o erro.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O nome do usuário logado no menu superior MUST funcionar como botão que abre um
  submenu com as opções, nesta ordem: "Editar", "Trocar senha" e "Sair".
- **FR-002**: O submenu MUST fechar ao escolher uma opção, ao clicar fora dele ou ao pressionar Esc,
  e MUST ser operável por teclado.
- **FR-003**: O botão "Sair" separado que existe hoje no menu MUST ser removido; sair passa a ser
  feito apenas pelo submenu.
- **FR-004**: "Sair" MUST aplicar o mesmo aviso de alterações não salvas já usado pelo app (salvar,
  descartar ou cancelar) e, confirmado, MUST encerrar a sessão, levar à tela de login e exibir um
  toast.
- **FR-005**: "Editar" MUST abrir um modal com o nome atual editável e o e-mail somente leitura.
- **FR-006**: Salvar a edição MUST exigir nome não vazio (após remover espaços do início e do fim),
  MUST persistir o nome e MUST atualizar imediatamente o nome exibido no menu e na sessão guardada,
  de modo que continue correto após recarregar a página.
- **FR-007**: "Trocar senha" MUST abrir um modal com os campos senha atual, nova senha e confirmar
  nova senha, com os valores mascarados.
- **FR-008**: Antes de enviar a troca de senha, o sistema MUST verificar que todos os campos estão
  preenchidos, que a nova senha tem no mínimo 8 caracteres e que a confirmação é igual à nova senha.
- **FR-009**: A troca de senha MUST ser recusada quando a senha atual estiver incorreta, com mensagem
  clara, sem fechar o modal.
- **FR-010**: Após trocar a senha com sucesso, o usuário MUST continuar logado e os campos do modal
  MUST ser limpos.
- **FR-011**: Toda ação (sucesso ou erro) nos dois modais e no "Sair" MUST ser comunicada por toast,
  e todos os textos MUST seguir o idioma do app (pt-BR).
- **FR-012**: Enquanto uma operação de salvar estiver em andamento, o botão de salvar do modal MUST
  ficar desabilitado.

### Key Entities

- **Usuário**: pessoa logada; tem nome (editável nesta feature) e e-mail (somente leitura). A senha
  nunca é exibida, só substituída mediante a senha atual.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O usuário chega a qualquer uma das três opções com no máximo 2 cliques a partir do mapa.
- **SC-002**: Após salvar a edição, o nome novo aparece no menu em menos de 1 segundo, sem recarregar
  a página.
- **SC-003**: 100% das tentativas de troca com confirmação diferente ou senha curta são bloqueadas
  antes do envio, com mensagem explicando o motivo.
- **SC-004**: Após trocar a senha, o login funciona com a senha nova e falha com a antiga em 100% dos
  casos.
- **SC-005**: Após "Sair", recarregar a página ou voltar no navegador não reabre o mapa sem um novo
  login.

## Assumptions

- "Alterar o usuário" significa alterar apenas o **nome**; o e-mail é o login e fica somente leitura
  (troca de e-mail está fora do escopo).
- O sistema já oferece as operações de alterar o nome e de trocar a senha exigindo a senha atual; esta
  feature é apenas de frontend.
- A regra de senha é a já existente no cadastro: mínimo de 8 caracteres.
- Trocar a senha não encerra a sessão atual nem outras sessões abertas.
- O submenu segue o mesmo tema escuro e o padrão de modais e toasts do restante do app.
- Excluir a conta, foto/avatar e recuperação de senha por e-mail estão fora do escopo.
