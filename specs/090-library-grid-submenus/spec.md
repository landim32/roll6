# Feature Specification: Biblioteca com submenus e listas em colunas

**Feature Branch**: `090-library-grid-submenus`
**Created**: 2026-10-18
**Status**: Draft
**Input**: User description: "Melhorias na biblioteca: em Campanhas, no lugar das abas, submenus de Campanhas — Minhas campanhas, Buscar, Jogando (nessa ordem e com esses nomes) —, a lista de campanhas em 3 colunas e com uma imagem; em Mapas a mesma lógica (submenus e colunas); Personagens e NPCs só divididos em colunas (4, 3 no celular); Tokens sem abas, com submenus, em colunas (4, 3 no celular); Armas e Animações sem abas, com submenus, um thumbnail (se possível gerado do modelo), em colunas (4, 3 no celular), sem a aba Enviar e com um botão Incluir como nas outras telas."

## Clarifications

### Session 2026-10-18

- Q: De onde vem a imagem da campanha? → A: Uma imagem que o mestre envia (opcional); sem ela, a imagem padrão.
- Q: Como os thumbnails de armas e animações são gerados? → A: Gerados ao salvar e guardados como imagem; itens sem imagem guardada são desenhados no navegador.
- Q: Sobre qual figura aparece o thumbnail da animação? → A: Um boneco de esqueleto padrão na pose principal.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Submenus no menu da esquerda no lugar das abas (Priority: P1)

Na biblioteca (087), as seções que hoje têm abas no topo da página — Campanhas, Mapas, Tokens, Armas e Animações — passam a mostrar as suas subdivisões como **submenus** no menu da esquerda, logo abaixo do item da seção. A página não tem mais abas: o submenu escolhido fica marcado e o conteúdo é o daquela subdivisão. Cada submenu tem o seu endereço próprio, como as páginas de 087.

Submenus, nesta ordem:

- **Campanhas**: Minhas campanhas · Buscar · Jogando
- **Mapas**: Meus mapas · Buscar · Da campanha
- **Tokens**: Meus tokens · Buscar
- **Armas**: Minhas armas · Buscar
- **Animações**: Minhas animações · Buscar

**Why this priority**: é a mudança de navegação pedida em todas as seções com abas; as outras histórias se apoiam nela.

**Independent Test**: abrir cada seção com submenus, passar por todos os submenus, recarregar a página em um deles e conferir que nenhuma página da biblioteca mostra abas de lista.

**Acceptance Scenarios**:

1. **Given** a biblioteca aberta, **When** o usuário escolhe "Campanhas" no menu da esquerda, **Then** vê abaixo dele os submenus "Minhas campanhas", "Buscar" e "Jogando", nessa ordem, com "Minhas campanhas" marcado e a lista das suas campanhas, sem abas na página.
2. **Given** uma seção com submenus, **When** escolhe um submenu, **Then** o conteúdo muda, o submenu fica marcado e o endereço passa a ser o daquele submenu; recarregar ou abrir o endereço em outra aba mostra o mesmo submenu.
3. **Given** uma seção sem submenus (Personagens, NPCs), **When** é escolhida, **Then** o menu mostra só o item da seção, como hoje.
4. **Given** um endereço antigo de 087 com `?tab=` (por exemplo `/library/campaigns?tab=search`, usado por "Outras campanhas…" da mesa), **When** é aberto, **Then** leva ao submenu correspondente ("Buscar").
5. **Given** um celular, **When** abre a biblioteca, **Then** o menu recolhível do topo também lista os submenus da seção, recuados sob o item da seção.

---

### User Story 2 - Campanhas e mapas em 3 colunas com imagem (Priority: P1)

As listas de campanhas (os três submenus) e de mapas (os três submenus) passam a ser **cartões em 3 colunas**, cada cartão com uma **imagem** no topo, o nome e as informações e ações que a linha tem hoje (mestre, status, aberta/fechada, "Atual"; abrir na mesa, engrenagem, lápis, "Tornar atual", arquivar/apagar onde já existem). A paginação e a busca continuam como hoje.

**Why this priority**: é a melhoria visual mais visível e foi pedida explicitamente para as duas primeiras seções.

**Independent Test**: abrir os três submenus de Campanhas e os três de Mapas num computador e num celular, conferir as colunas, as imagens e que cada ação de antes continua funcionando no cartão.

**Acceptance Scenarios**:

1. **Given** um computador, **When** abre qualquer submenu de Campanhas, **Then** vê as campanhas em 3 colunas, cada cartão com a imagem da campanha, o nome, o mestre, o status e as ações de hoje.
2. **Given** uma campanha sem imagem, **When** aparece na lista, **Then** o cartão mostra uma imagem padrão neutra do mesmo tamanho, sem quebrar o alinhamento das colunas.
3. **Given** um computador, **When** abre qualquer submenu de Mapas, **Then** vê os mapas em 3 colunas, cada cartão com a imagem do mapa (a do cenário), o nome e as ações de hoje.
4. **Given** telas mais estreitas, **When** abre essas listas, **Then** as colunas diminuem (2 em telas médias, 1 no celular) sem rolagem horizontal.
5. **Given** um jogador em "Da campanha", **When** abre o submenu, **Then** continua vendo só o mapa atual da campanha (039), agora como cartão.
6. **Given** o mestre na criação ou na página da campanha, **When** escolhe, troca ou remove a imagem da campanha e salva, **Then** o cartão da campanha passa a mostrar a nova imagem (ou a padrão) para todos os usuários; só o mestre pode alterá-la.

---

### User Story 3 - Personagens, NPCs e tokens em 4 colunas (Priority: P2)

As listas de Personagens, NPCs e Tokens (Meus tokens e Buscar) passam a ser cartões em **4 colunas no computador e 3 no celular**, com a imagem já existente (retrato do personagem/NPC, imagem do token), o nome e as ações de hoje (lápis, transferir, situação na campanha atual, pedir acesso/aceitar/usar para personagens). O botão "Incluir"/"Novo" de cada seção continua no cabeçalho.

**Why this priority**: é só leiaute, sem mudança de comportamento; depende da História 1 apenas para os tokens.

**Independent Test**: abrir Personagens, NPCs e os dois submenus de Tokens num computador e num celular e contar as colunas; executar as ações de um cartão de cada.

**Acceptance Scenarios**:

1. **Given** um computador, **When** abre Personagens, NPCs ou Tokens, **Then** vê 4 cartões por linha.
2. **Given** um celular, **When** abre as mesmas listas, **Then** vê 3 cartões por linha, com o nome encurtado com reticências e as ações em ícones que cabem no cartão.
3. **Given** um personagem com situação na campanha atual (pedido, convite, aprovado), **When** aparece no cartão, **Then** a situação e as ações de hoje continuam visíveis e funcionando.

---

### User Story 4 - Armas e animações com thumbnail, colunas e "Incluir" (Priority: P2)

As listas de Armas e Animações passam a ser cartões em **4 colunas no computador e 3 no celular**, cada um com um **thumbnail** — gerado do modelo 3D no caso das armas e, no caso das animações, uma imagem da sua pose — além do nome, do dono e das ações de hoje. A aba "Enviar" sai: no cabeçalho de cada seção aparece um botão **"Incluir"**, como em Campanhas, Tokens e NPCs, que leva a uma página de inclusão em tela cheia com o mesmo formulário de envio de hoje; ao salvar, a página da arma/animação nova é aberta.

**Why this priority**: completa o padrão das outras seções; o thumbnail é o item mais incerto e depende da decisão em FR-011.

**Independent Test**: abrir os dois submenus de Armas e de Animações, ver os thumbnails, tocar em "Incluir", enviar um arquivo e cair na página da arma/animação nova.

**Acceptance Scenarios**:

1. **Given** Armas ou Animações, **When** a seção é aberta, **Then** não há aba "Enviar" e há um botão "Incluir" no cabeçalho.
2. **Given** "Incluir", **When** o usuário envia um arquivo válido, **Then** a arma/animação é criada com as mesmas validações de hoje e a sua página é aberta; "Voltar" no cabeçalho retorna à lista.
3. **Given** uma arma na lista, **When** aparece no cartão, **Then** mostra um thumbnail do seu modelo 3D na pose padrão (083).
4. **Given** uma animação na lista, **When** aparece no cartão, **Then** mostra um thumbnail que represente a sua pose.
5. **Given** um thumbnail que não pode ser gerado (arquivo com erro, aparelho sem 3D), **When** o cartão é mostrado, **Then** aparece um ícone padrão da seção no lugar, sem erro na tela.
6. **Given** a inclusão com dados não salvos, **When** o usuário tenta sair, **Then** recebe a mesma pergunta "Descartar as alterações?" das outras páginas (087).

---

### Edge Cases

- Endereços antigos com `?tab=` (inclusive `upload` de Armas/Animações) levam ao submenu ou à página de inclusão correspondente.
- Um submenu não pode ser confundido com o endereço de um item (por exemplo uma campanha cujo endereço é "search").
- "Jogando" vazio, "Da campanha" sem campanha atual e buscas sem resultado mostram a mensagem de lista vazia de hoje, ocupando a largura toda (não uma coluna).
- Nomes longos são encurtados com reticências no cartão e aparecem inteiros ao passar o mouse.
- Muitos thumbnails 3D na mesma página não podem travar a página nem gastar memória sem limite: só os cartões visíveis geram o seu, um de cada vez.
- Ao trocar de submenu, a busca digitada no submenu anterior não vaza para o próximo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O menu da esquerda da biblioteca DEVE mostrar, sob Campanhas, Mapas, Tokens, Armas e Animações, os submenus listados na História 1, nessa ordem e com esses nomes; Personagens e NPCs ficam sem submenus.
- **FR-002**: Nenhuma página de lista da biblioteca DEVE ter abas para escolher a subdivisão; o submenu marcado é o único seletor.
- **FR-003**: Cada submenu DEVE ter um endereço próprio, que sobrevive a recarregar, voltar/avançar e copiar o endereço; o submenu padrão de uma seção é o primeiro.
- **FR-004**: Os endereços de 087 com `?tab=` DEVEM continuar funcionando, levando ao submenu (ou à inclusão) equivalente, e os pontos de entrada da mesa ("Outras campanhas…", "Mapas…") DEVEM levar ao submenu certo.
- **FR-005**: No celular o menu recolhível DEVE listar os submenus recuados sob a seção.
- **FR-006**: As listas de Campanhas DEVEM ser cartões em 3 colunas no computador (2 em telas médias, 1 no celular), cada um com imagem, nome, mestre, status, aberta/fechada, "Atual" e as ações de hoje.
- **FR-007**: A imagem da campanha DEVE vir de uma imagem que o mestre envia para a campanha (Q1 = A), opcional, escolhida e trocada/removida na página da campanha na biblioteca e na criação da campanha; sem imagem, DEVE aparecer uma imagem padrão neutra.
- **FR-008**: As listas de Mapas DEVEM seguir o leiaute de FR-006, com a imagem do cenário do mapa e as ações de hoje (abrir na mesa, lápis, "Tornar atual", arquivar/apagar onde existirem).
- **FR-009**: Personagens, NPCs, Tokens, Armas e Animações DEVEM ser cartões em 4 colunas no computador e 3 no celular, com imagem, nome e as ações de hoje.
- **FR-010**: Armas e Animações NÃO DEVEM ter a aba "Enviar"; DEVEM ter um botão "Incluir" no cabeçalho que leva a uma página de inclusão própria (com endereço), com o formulário de envio atual e a proteção de saída de 087, abrindo a página do item criado ao salvar.
- **FR-011**: Cada arma DEVE mostrar um thumbnail do seu modelo 3D na pose padrão e cada animação um thumbnail da sua pose, gerados uma vez ao salvar (inclusão ou troca do arquivo, e para armas também ao mudar a pose) e guardados como imagem; enquanto um item não tiver imagem guardada (os que já existem), o navegador desenha o thumbnail na hora (Q2 = C). A animação é mostrada sobre um boneco de esqueleto padrão, na sua pose principal (Q3 = A)
- **FR-012**: Se um thumbnail não puder ser gerado ou carregado, o cartão DEVE mostrar o ícone padrão da seção, sem mensagem de erro.
- **FR-013**: Thumbnails gerados no aparelho DEVEM ser feitos só para os cartões visíveis e um de cada vez, sem travar a rolagem.
- **FR-014**: Busca, paginação, mensagens de lista vazia, permissões e confirmações DEVEM continuar as de hoje; só mudam o leiaute, a navegação e as figuras.

### Key Entities

- **Submenu da biblioteca**: uma subdivisão de uma seção (nome, ordem, endereço próprio), que substitui uma aba de 087.
- **Cartão de lista**: a apresentação de um item (campanha, mapa, personagem, NPC, token, arma, animação) com imagem ou thumbnail, nome, informações e ações.
- **Imagem da campanha**: imagem opcional enviada pelo mestre, guardada com a campanha.
- **Thumbnail de arma/animação**: imagem guardada com a arma/animação, gerada ao salvar (modelo na pose padrão; boneco de esqueleto na pose principal da animação).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0 páginas de lista da biblioteca com abas; 100% das subdivisões alcançáveis pelo menu da esquerda e por endereço direto.
- **SC-002**: Num computador (≥ 1200 px de largura útil), Campanhas e Mapas mostram 3 cartões por linha e as outras cinco seções 4; num celular (≤ 430 px), essas cinco seções mostram 3 cartões por linha, sem rolagem horizontal.
- **SC-003**: 100% dos cartões de campanha, mapa, arma e animação têm imagem, thumbnail ou figura padrão — nenhum cartão sem figura.
- **SC-004**: Uma página de Armas ou Animações com 12 itens fica utilizável (rolagem e cliques respondendo) em até 2 s num celular comum, com os thumbnails aparecendo progressivamente.
- **SC-005**: Incluir uma arma ou animação pelo botão "Incluir" não leva mais passos do que a aba "Enviar" levava.
- **SC-006**: Todas as ações que existiam nas linhas de 087 continuam disponíveis no cartão correspondente (verificado seção por seção).

## Assumptions

- A ordem dos submenus de Mapas segue a de Campanhas: os próprios, a busca e os da campanha ("Meus mapas · Buscar · Da campanha"); "Meus tokens", "Minhas armas" e "Minhas animações" seguem o padrão "Minhas campanhas".
- "Buscar" de Tokens, Armas e Animações é a biblioteca de todos os usuários, como as abas "Buscar" de hoje.
- "Incluir" de Armas e Animações é uma página de tela cheia da biblioteca, como "Nova campanha" e "Incluir token"; o formulário de envio (prévia, pose e ponto de pega das armas, validação do arquivo das animações) não muda.
- No celular, 3 colunas é o pedido explícito para as cinco seções de 4 colunas; Campanhas e Mapas, sem pedido para o celular e com mais texto e ações, ficam com 1 coluna.
- A imagem da campanha e os thumbnails são o único dado novo; o MCP ganha os parâmetros correspondentes, como toda mudança de endpoint.
- O que não for leiaute, navegação, imagens ou thumbnails (regras, permissões, demais endpoints) fica como está; a mesa e as janelas que continuam nela (`TokenModal` como seletor etc.) não mudam.
