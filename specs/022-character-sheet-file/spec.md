# Feature Specification: Ficha do personagem em imagem ou PDF

**Feature Branch**: `022-character-sheet-file`
**Created**: 2026-09-28
**Status**: Draft
**Input**: User description: "Crie um campo no personagem para armazenar um ficha em imagem ou PDF, não precisa usar croped nela, deve salvar no formato em que for feito o upload"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Anexar a ficha ao personagem (Priority: P1)

Muitos jogadores já têm a ficha do personagem pronta: uma foto da ficha de papel, um print ou um PDF preenchido.
Ao criar ou editar o personagem, o dono envia esse arquivo (imagem ou PDF) como "Ficha em arquivo". O arquivo é
guardado **exatamente como foi enviado** — sem recorte, sem redimensionar, sem converter —, e o dono pode
substituí-lo por outro ou removê-lo. A ficha em texto (markdown) que já existe continua disponível; as duas podem
conviver.

**Why this priority**: É o objetivo da funcionalidade; sozinha já entrega valor.

**Independent Test**: Editar um personagem, enviar um PDF de ficha, salvar, reabrir o personagem e baixar o
arquivo: ele é idêntico ao enviado (mesmo formato, mesmo conteúdo).

**Acceptance Scenarios**:

1. **Given** o formulário do personagem aberto pelo dono, **When** ele escolhe um PDF ou uma imagem PNG, JPG ou WebP como ficha, **Then** o arquivo é enviado sem passar pelo recorte e o formulário mostra o nome do arquivo e o tipo (imagem ou PDF).
2. **Given** o arquivo escolhido, **When** o dono salva o personagem, **Then** a ficha fica ligada ao personagem e, ao reabrir, aparece com opção de ver/baixar.
3. **Given** uma ficha já anexada, **When** o dono envia outro arquivo e salva, **Then** a nova ficha substitui a anterior.
4. **Given** uma ficha já anexada, **When** o dono clica em "Remover" e salva, **Then** o personagem fica sem ficha em arquivo.
5. **Given** um arquivo de outro tipo (ex.: .docx, .zip) ou maior que o limite, **When** o dono tenta enviá-lo, **Then** recebe uma mensagem clara e nada é salvo.
6. **Given** a ficha baixada depois de salva, **When** comparada ao arquivo original, **Then** o formato e o conteúdo são os mesmos (nenhuma conversão ou compressão).

---

### User Story 2 - Consultar a ficha durante o jogo (Priority: P2)

Durante a sessão, quem pode ver o personagem abre a ficha em arquivo pelo card do personagem: o dono, o mestre da
campanha e os demais participantes aprovados (as mesmas pessoas que hoje já leem a ficha em texto). Imagens são
exibidas na própria janela; PDFs abrem para leitura em uma nova aba (ou são baixados, conforme o navegador).

**Why this priority**: Dá uso à ficha na mesa, mas depende da US1.

**Independent Test**: Com a ficha anexada e o personagem aprovado numa campanha, o mestre e outro jogador abrem o
card do personagem e conseguem ver a ficha; um usuário fora da campanha não consegue.

**Acceptance Scenarios**:

1. **Given** um personagem com ficha em imagem, **When** o mestre abre o card do personagem, **Then** vê a imagem da ficha em tamanho legível, com opção de abrir em tamanho real.
2. **Given** um personagem com ficha em PDF, **When** um participante aprovado abre o card, **Then** tem um botão "Abrir ficha (PDF)" que abre o documento para leitura.
3. **Given** um personagem sem ficha em arquivo, **When** alguém abre o card, **Then** nenhuma área de ficha em arquivo é mostrada.
4. **Given** um usuário que não participa da campanha, **When** tenta acessar a ficha, **Then** não consegue.

---

### Edge Cases

- Imagens grandes (ex.: foto de celular 4000 × 3000) são guardadas no tamanho original; a exibição apenas as reduz na tela.
- Imagem com orientação de câmera (foto "de lado"): é guardada como veio; o navegador exibe conforme o próprio arquivo.
- Envio interrompido ou com falha: o personagem continua com a ficha anterior (ou sem ficha).
- Arquivo com extensão de PDF mas conteúdo que não é PDF (ou vice-versa): é recusado.
- A ficha em arquivo é do personagem, não da campanha: diferente da ficha em texto, ela **não** é copiada para cada campanha; todas as campanhas veem o mesmo arquivo, sempre o mais recente.
- Ao transferir o personagem (021), a ficha em arquivo vai junto; ao excluí-lo, a ficha deixa de ser acessível.
- Links para a ficha expiram depois de um tempo; quem está com a tela aberta obtém um link novo ao reabrir o card.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O personagem DEVE ter um campo opcional "Ficha em arquivo" que guarda um único arquivo por personagem.
- **FR-002**: O sistema DEVE aceitar imagens PNG, JPG e WebP e documentos PDF, e recusar qualquer outro tipo com mensagem clara.
- **FR-003**: O arquivo DEVE ser guardado no formato e com o conteúdo exatos do envio — sem recorte, redimensionamento, rotação, conversão ou compressão.
- **FR-004**: O sistema DEVE recusar arquivos maiores que 10 MB, informando o limite.
- **FR-005**: O sistema DEVE verificar que o conteúdo do arquivo corresponde ao tipo declarado (imagem de verdade ou PDF de verdade).
- **FR-006**: Somente o dono do personagem PODE anexar, substituir ou remover a ficha em arquivo.
- **FR-007**: A ficha em arquivo PODE ser vista pelo dono, pelo mestre de uma campanha em que o personagem está aprovado e pelos participantes aprovados dessa campanha — os mesmos que já leem os dados do personagem — e por mais ninguém.
- **FR-008**: Imagens DEVEM ser exibidas diretamente na janela do personagem; PDFs DEVEM poder ser abertos para leitura ou baixados.
- **FR-009**: O formulário DEVE mostrar, antes de salvar, qual arquivo foi escolhido (nome e tipo) e permitir trocá-lo ou removê-lo.
- **FR-010**: A ficha em arquivo NÃO DEVE substituir a ficha em texto existente; as duas são independentes.
- **FR-011**: A operação DEVE estar disponível também para assistentes e ferramentas externas (MCP e chaves de API), com as mesmas regras.

### Key Entities

- **Personagem**: ganha a referência opcional à "Ficha em arquivo" (arquivo guardado + tipo: imagem ou PDF).
- **Arquivo da ficha**: o arquivo original enviado, guardado no armazenamento de arquivos junto das outras imagens.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O dono anexa uma ficha em arquivo em menos de 1 minuto, a partir do formulário do personagem.
- **SC-002**: 100% dos arquivos baixados são idênticos, byte a byte, aos enviados.
- **SC-003**: Arquivos de tipo não permitido ou acima do limite são recusados em 100% das tentativas, sem alterar o personagem.
- **SC-004**: Quem pode ver o personagem abre a ficha em arquivo em no máximo 2 cliques a partir do card; quem não pode é recusado em 100% das tentativas.

## Assumptions

- Um único arquivo por personagem; várias páginas devem vir num PDF só.
- O limite de 10 MB é o mesmo já usado para imagens; fichas maiores devem ser comprimidas pelo usuário antes do envio.
- NPCs não ganham ficha em arquivo nesta funcionalidade.
- O arquivo antigo não precisa ser apagado do armazenamento imediatamente ao ser substituído (a limpeza de arquivos órfãos fica fora do escopo, como já acontece com imagens).
- A visualização de PDF usa o leitor do próprio navegador; não haverá leitor de PDF embutido.
