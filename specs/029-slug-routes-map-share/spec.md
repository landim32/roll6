# Feature Specification: Slugs, combo unificado campanha/mapa, narração na notificação e compartilhar mapa

**Feature Branch**: `029-slug-routes-map-share`
**Created**: 2026-09-29
**Status**: Draft
**Input**: User description: "Implemente algumas alterações: Crie um slug para a Campanha e CampaignMap; Unifique o combo de campanha e mapa no frontend, exiba da seguinte forma: Estrada 1 → Tormento Vil / Arena 1 → Teste / Sem mapa ativo → Teste 2; Ao selecionar o mapa vai para a rota /map/<map-slug>, em campanha /campaign/<campaign-slug>; Na notificação exiba apenas a narração do turno, e exiba em markdown; Crie um botão compartilhar, junto com os botões de zoom — esse compartilhar deve compartilhar uma imagem do mapa com a última narração formatada para o WhatsApp"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Combo único de campanha e mapa (Priority: P1)

Hoje o menu superior tem dois seletores separados ("Campanha atual" e "Mapa atual"), cada um abrindo uma janela. O usuário passa a ter um único combo que lista as suas campanhas (as que mestra e as em que tem personagem aprovado). Cada entrada mostra em cima o mapa ativo da campanha e, recuada logo abaixo, o nome da campanha:

```
Estrada 1
   → Tormento Vil
Arena 1
   → Teste
Sem mapa ativo
   → Teste 2
```

Clicar na linha do mapa abre aquele mapa (e a campanha dele); clicar na linha da campanha entra na campanha e segue o mapa ativo dela.

**Why this priority**: É a navegação principal da mesa; troca dois cliques + duas janelas por uma escolha só e mostra de relance onde cada campanha está.

**Independent Test**: Com um usuário mestre de "Tormento Vil" (mapa ativo "Estrada 1") e participante aprovado de "Teste 2" (sem mapa ativo), abrir o combo e conferir as entradas; clicar em "Estrada 1" abre o mapa e seleciona "Tormento Vil".

**Acceptance Scenarios**:

1. **Given** o usuário participa de três campanhas, **When** abre o combo, **Then** vê uma entrada por campanha, com o mapa ativo em cima (ou "Sem mapa ativo") e o nome da campanha recuado abaixo, precedido de uma seta.
2. **Given** o combo aberto, **When** o usuário clica na linha do mapa "Estrada 1", **Then** a campanha "Tormento Vil" passa a ser a atual e o mapa "Estrada 1" é aberto.
3. **Given** o combo aberto, **When** o usuário clica na linha da campanha "Teste 2", **Then** a campanha passa a ser a atual e, como não há mapa ativo, a mesa mostra o estado vazio da campanha.
4. **Given** a entrada "Sem mapa ativo", **When** o usuário clica nessa linha, **Then** o efeito é o mesmo de clicar na campanha (não há mapa para abrir).
5. **Given** o combo fechado, **Then** ele mostra o mapa aberto e a campanha atual (ou um convite para escolher uma campanha quando não há nenhuma).
6. **Given** o combo aberto, **Then** no final há ações para as funções que as janelas antigas ofereciam: procurar/criar/entrar em outras campanhas e abrir/criar mapas (modelos).
7. **Given** o mapa aberto tem alterações não salvas, **When** o usuário escolhe outra entrada, **Then** o aviso Salvar/Descartar/Cancelar existente é exibido antes da troca.

---

### User Story 2 - Slugs e rotas de campanha e mapa (Priority: P1)

Cada campanha e cada mapa de campanha ganham um slug legível (ex.: "Tormento Vil" → `tormento-vil`, "Estrada 1" → `estrada-1`). A escolha no combo muda o endereço do navegador para `/campaign/<slug-da-campanha>` ou `/map/<slug-do-mapa>`, e abrir esses endereços diretamente (colar o link, recarregar a página, voltar/avançar do navegador) leva ao mesmo lugar.

**Why this priority**: Permite mandar o link da mesa para os jogadores e recarregar sem perder o lugar; é a base da navegação do combo.

**Independent Test**: Criar uma campanha "Tormento Vil", conferir o slug `tormento-vil`, abrir `/campaign/tormento-vil` numa aba nova já logado e ver a campanha selecionada.

**Acceptance Scenarios**:

1. **Given** uma campanha nova chamada "Ação & Reação", **When** ela é criada, **Then** recebe o slug `acao-reacao` (minúsculo, sem acentos, símbolos viram hífen, sem hífens repetidos ou nas pontas).
2. **Given** já existe uma campanha com slug `teste`, **When** outra campanha "Teste" é criada, **Then** ela recebe `teste-2` (e a seguinte `teste-3`).
3. **Given** um mapa de campanha criado com o nome "Estrada 1", **Then** ele recebe um slug único, derivado do nome, como `estrada-1` (ou com sufixo em caso de colisão).
4. **Given** campanhas e mapas que já existiam antes da mudança, **Then** todos recebem slugs com as mesmas regras, sem intervenção manual.
5. **Given** um usuário mestre ou participante aprovado, **When** abre `/map/estrada-1`, **Then** a campanha dona do mapa vira a atual e o mapa é aberto.
6. **Given** um usuário sem acesso à campanha (nem mestre, nem aprovado), **When** abre `/campaign/<slug>` de uma campanha aberta, **Then** a campanha é selecionada como hoje (pode pedir acesso) mas nenhum mapa é mostrado; **When** abre `/map/<slug>` de um mapa sem acesso, **Then** vê uma mensagem de "sem acesso" e volta à tela inicial.
7. **Given** um slug inexistente ou de um mapa apagado, **When** o endereço é aberto, **Then** o usuário vê uma mensagem de "não encontrado" e volta à tela inicial.
8. **Given** um usuário não logado, **When** abre `/map/<slug>`, **Then** é levado ao login e, depois de entrar, ao endereço pedido.
9. **Given** o jogador segue o mapa definido pelo mestre (tempo real), **When** o mestre troca o mapa ativo, **Then** o endereço do jogador passa a ser o do novo mapa.
10. **Given** a campanha é renomeada, **Then** o slug não muda (links já enviados continuam funcionando).

---

### User Story 3 - Notificação de turno mostra só a narração em markdown (Priority: P2)

Ao clicar na notificação "Turno N finalizado", a janela passa a mostrar apenas a narração daquele turno, formatada em markdown (títulos, negrito, itálico, listas), em vez da lista de movimentos, ações e alterações.

**Why this priority**: A narração é o que o jogador quer ler ao saber que o turno acabou; o log completo continua disponível pelo "Turno N" do rodapé e pelo console de turnos.

**Independent Test**: Processar um turno com narração contendo `**negrito**` e uma lista; clicar na notificação e ver só o texto formatado.

**Acceptance Scenarios**:

1. **Given** um turno finalizado com narração, **When** o usuário abre a notificação, **Then** vê somente a narração, renderizada em markdown.
2. **Given** um turno finalizado sem narração, **When** o usuário abre a notificação, **Then** vê uma mensagem informando que o turno não teve narração.
3. **Given** uma narração com HTML ou scripts embutidos, **Then** nada disso é executado ou exibido como HTML (o texto é saneado como as demais visualizações de markdown).

---

### User Story 4 - Compartilhar o mapa com a última narração (Priority: P3)

Junto com os botões de zoom há um botão "Compartilhar". Ele gera uma imagem do mapa aberto (fundo, grade e peças) e a compartilha junto com a última narração da campanha, com a formatação convertida para a do WhatsApp (ex.: `**negrito**` → `*negrito*`, títulos em negrito, listas com marcadores), pronta para mandar ao grupo da mesa.

**Why this priority**: Facilita divulgar a situação da mesa fora do app, mas não é necessário para jogar.

**Independent Test**: Num celular, com um mapa de campanha aberto e um turno narrado, tocar em "Compartilhar", escolher o WhatsApp e conferir que chegam a imagem e o texto formatado.

**Acceptance Scenarios**:

1. **Given** um mapa de campanha aberto e um aparelho que permite compartilhar arquivos, **When** o usuário toca em "Compartilhar", **Then** a janela de compartilhamento do aparelho abre com a imagem do mapa e o texto da última narração formatado para o WhatsApp.
2. **Given** um aparelho/navegador sem compartilhamento de arquivos (ex.: desktop), **When** o usuário clica em "Compartilhar", **Then** só a imagem é baixada, com um aviso explicando o que foi feito. *(Revisado: o texto não é mais copiado.)*
3. **Given** a campanha ainda não tem nenhuma narração, **When** o usuário compartilha, **Then** só a imagem (com o nome da campanha e do mapa como texto) é compartilhada.
4. **Given** a imagem, **Then** ela mostra o mapa inteiro (independente do zoom e da posição atuais), com as peças, sem elementos de interface (menus, destaque do mouse, rastro do modo Mover).
5. **Given** um mapa aberto fora de uma campanha (só o modelo), **Then** o botão não aparece.
6. **Given** a geração da imagem falha, **Then** o usuário vê um aviso de erro e nada é compartilhado.

---

### Edge Cases

- Nome de campanha só com símbolos ou emojis (slug vazio após a limpeza): usa um slug padrão (`campanha`, `mapa`) com sufixo numérico.
- Slug que coincide com o de algo apagado: mapas apagados (soft delete) continuam reservando o seu slug, para que um link antigo nunca abra outro mapa.
- Nome muito longo: o slug é cortado num tamanho máximo sem deixar hífen no final.
- Usuário sem nenhuma campanha: o combo mostra só as ações (procurar/criar campanha, mapas).
- Mapa ativo da campanha apagado ou arquivado: a entrada mostra "Sem mapa ativo".
- Endereço `/map/<slug>` de um mapa arquivado com acesso: abre normalmente (como hoje pelas configurações da campanha).
- Endereço `/` (antigo) continua funcionando e restaura o último mapa/campanha lembrado, atualizando o endereço para a rota correspondente.
- Modelo de mapa aberto fora de campanha (rascunho ou "Novo mapa"): não tem slug; o endereço volta a `/`.
- Narração muito longa no compartilhamento: o texto é compartilhado inteiro (o WhatsApp aceita textos longos); a imagem não inclui a narração.
- Imagens de fundo/peças que não carregam a tempo: a imagem é gerada sem elas em vez de travar, ou é mostrado erro se nada puder ser gerado.

## Requirements *(mandatory)*

### Functional Requirements

**Slugs**

- **FR-001**: Toda campanha MUST ter um slug único em todo o sistema, gerado a partir do nome na criação: minúsculas, sem acentos, qualquer sequência de caracteres fora de `a-z0-9` vira um hífen, sem hífens nas pontas, tamanho máximo limitado.
- **FR-002**: Todo mapa de campanha MUST ter um slug único em todo o sistema, gerado a partir do nome do mapa com as mesmas regras.
- **FR-003**: Em caso de colisão, o sistema MUST acrescentar o menor sufixo numérico livre (`-2`, `-3`, …); slugs de mapas apagados continuam reservados.
- **FR-004**: O slug MUST ser definido uma vez e não mudar quando o nome muda.
- **FR-005**: Campanhas e mapas existentes MUST receber slugs automaticamente na atualização do sistema.
- **FR-006**: Os dados de campanha e de mapa devolvidos ao app MUST incluir o slug, e o sistema MUST permitir localizar campanha e mapa pelo slug com as mesmas regras de acesso da consulta por identificador (inclusive para assistentes de IA, mantendo a paridade existente entre API e ferramentas MCP).

**Combo unificado**

- **FR-007**: O menu superior MUST substituir os seletores "Campanha atual" e "Mapa atual" por um único combo.
- **FR-008**: O combo MUST listar as campanhas em que o usuário é mestre ou tem personagem aprovado, uma entrada por campanha, com o nome do mapa ativo na primeira linha (ou "Sem mapa ativo") e o nome da campanha recuado na linha de baixo, precedido de seta.
- **FR-009**: A entrada da campanha e do mapa atuais MUST aparecer destacada.
- **FR-010**: Clicar na linha do mapa MUST navegar para `/map/<slug-do-mapa>`; clicar na linha da campanha (ou em "Sem mapa ativo") MUST navegar para `/campaign/<slug-da-campanha>`.
- **FR-011**: O combo MUST oferecer, ao final, ações que abrem as funções atuais das janelas de campanha (procurar, criar, pedir acesso) e de mapas (abrir/criar modelos, "Novo mapa").
- **FR-012**: A troca pelo combo MUST passar pelo aviso de alterações não salvas existente.
- **FR-013**: A engrenagem de configurações da campanha (mestre) MUST continuar acessível ao lado do combo.
- **FR-014**: O combo MUST refletir mudanças de mapa ativo, nome e exclusão de campanhas recebidas em tempo real.

**Rotas**

- **FR-015**: O app MUST ter as rotas protegidas `/campaign/:slug` (seleciona a campanha e segue o mapa ativo dela, se o usuário tiver acesso) e `/map/:slug` (seleciona a campanha do mapa e abre o mapa).
- **FR-016**: O endereço MUST acompanhar o que está aberto: abrir outro mapa de campanha (pelo combo, configurações, seguir o mestre, restauração após login) atualiza para `/map/<slug>`; campanha sem mapa aberto usa `/campaign/<slug>`; modelo fora de campanha usa `/`.
- **FR-017**: Slug inexistente, mapa apagado ou sem acesso MUST mostrar aviso e levar à tela inicial.
- **FR-018**: Um usuário não logado que abre uma dessas rotas MUST voltar a ela depois do login.
- **FR-019**: Voltar/avançar do navegador MUST navegar entre campanhas/mapas visitados, com o mesmo aviso de alterações não salvas.

**Notificação de turno**

- **FR-020**: A janela aberta pela notificação "Turno N finalizado" MUST mostrar somente a(s) narração(ões) daquele turno, em markdown saneado (sem HTML bruto, scripts ou links `javascript:`).
- **FR-021**: Sem narração no turno, a janela MUST mostrar a mensagem "Este turno não teve narração".

**Compartilhar**

- **FR-022**: A área dos botões de zoom MUST ter um botão "Compartilhar" (ícone com dica e rótulo acessível), visível para quem está com um mapa de campanha aberto.
- **FR-023**: O compartilhamento MUST gerar uma imagem (PNG ou JPEG) do mapa inteiro — fundo, grade e peças com as suas imagens e orientação — sem elementos de interface, com resolução suficiente para leitura num celular.
- **FR-024**: O texto compartilhado MUST ser a narração do turno finalizado mais recente que tenha narração, precedida por uma linha com campanha, mapa e número do turno, convertida para a formatação do WhatsApp: negrito `*texto*`, itálico `_texto_`, tachado `~texto~`, código em bloco com três crases, títulos viram linha em negrito, itens de lista com "- " ou numerados, links mostrados como "texto (url)", imagens e HTML removidos.
- **FR-025**: Quando o aparelho suporta compartilhar arquivos, o sistema MUST abrir a janela nativa de compartilhamento com imagem e texto; se imagem e texto não puderem ir juntos, MUST compartilhar só a imagem; sem compartilhamento de arquivos, MUST baixar só a imagem, avisando o usuário. *(Revisado após o teste na mesa.)*
- **FR-026**: As imagens do fundo e das peças MUST ser lidas pela própria API (`GET /api/image/file/{fileName}`), para que a imagem compartilhada saia com fundo, grade e peças sem depender de CORS no bucket; a grade e as bordas das peças MUST manter espessura legível qualquer que seja a redução da imagem.
- **FR-027**: Falhas ao gerar a imagem ou cancelamento pelo usuário MUST ser tratados sem travar a tela (erro avisado; cancelamento silencioso).
- **FR-028**: Todos os textos novos MUST estar no arquivo de traduções pt-BR.

### Key Entities *(include if feature involves data)*

- **Campanha**: ganha o atributo **slug** (texto único, imutável, derivado do nome na criação).
- **Mapa de campanha**: ganha o atributo **slug** (texto único em todo o sistema, imutável, derivado do nome do mapa na criação; continua reservado depois da exclusão lógica).
- **Narração de turno**: já existente (entrada de turno do tipo Narração); passa a ser lida pela notificação e pelo compartilhamento. Nenhum dado novo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Trocar de campanha/mapa exige no máximo 2 cliques (abrir o combo + escolher), contra 4 ou mais hoje (duas janelas).
- **SC-002**: 100% das campanhas e mapas de campanha, novos e antigos, têm slug único após a atualização.
- **SC-003**: Um link `/map/<slug>` colado por um participante aprovado abre o mapa certo em até 3 segundos numa conexão comum.
- **SC-004**: Recarregar a página numa rota de campanha ou mapa mantém o usuário no mesmo lugar em 100% dos casos com acesso.
- **SC-005**: A notificação de fim de turno mostra só a narração formatada, sem nenhum marcador markdown visível como texto cru.
- **SC-006**: Do toque em "Compartilhar" até a janela de compartilhamento aparecer leva até 5 segundos num mapa com 50 peças.
- **SC-007**: O texto recebido no WhatsApp aparece com negrito/itálico/listas corretos, sem asteriscos duplos ou `#` sobrando.

## Assumptions

- "CampaignMap" é o mapa de campanha (a entidade `Map`, instância de um modelo numa campanha); modelos de mapa (`MapModel`) não recebem slug nem rota.
- Os slugs são globais (não por campanha) porque a rota `/map/<slug>` não traz a campanha; colisões como "Estrada 1" em duas campanhas viram `estrada-1` e `estrada-1-2`.
- O slug não muda ao renomear, para não quebrar links já compartilhados; mapas de campanha não são renomeados hoje.
- O combo lista só campanhas do usuário (mestre ou aprovado); campanhas abertas de outros continuam acessíveis pela ação "Outras campanhas…", que abre a janela de campanhas atual. Outros mapas da campanha (não ativos) continuam acessíveis pela janela de mapas e pelas configurações da campanha.
- O mapa ativo mostrado é o `mapa atual` definido pelo mestre (017). Para o mestre, clicar no mapa também o torna o mapa atual da mesa, como já acontece ao abrir um mapa da campanha.
- As rotas substituem a restauração por localStorage como fonte principal; o `roll6:map`/`roll6:campaign` continua sendo usado quando o usuário entra por `/`.
- A notificação mostra a narração gravada pelo processamento de turno (027); turnos finalizados manualmente pelo mestre normalmente não têm narração e mostram a mensagem de vazio. O log completo continua no "Turno N" do rodapé e no console de turnos.
- "Última narração" = narração do turno finalizado mais recente que tenha narração (pode ser de um turno anterior ao último).
- O compartilhamento usa o compartilhamento nativo do aparelho; em desktop o WhatsApp Web não aceita anexar imagem por link, por isso o fallback é baixar + copiar. As imagens do mapa e das peças precisam poder ser lidas pelo navegador para gerar a imagem (armazenamento com permissão de leitura cruzada para o domínio do app).
- Nenhuma nova permissão: quem já vê o mapa pode compartilhar.
