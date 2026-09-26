# UI Contract: Aba "Meus Tokens" e Edição de Tokens

## `TokenModal`

Props inalteradas (`open`, `onOpenChange`, `title?`, `onSelect`).

| Aba (ordem) | Conteúdo |
|---|---|
| **Meus Tokens** (padrão ao abrir) | busca + `TokenGrid` com `mine=true`, 4 colunas, lápis em cada card; vazio → `tokens.mineEmpty` |
| **Buscar tokens** | busca + `TokenGrid` da biblioteca, 4 colunas, sem lápis |
| **Incluir token** | `TokenFormFields` (cadastro, como hoje) |

Lápis → estado interno `editing`: o `TokenModal` fecha e abre `TokenEditModal`; ao salvar ou cancelar,
o `TokenModal` reabre na aba "Meus Tokens" com a lista recarregada; `onSelect` pendente preservado.

## `TokenGrid`

- `row row-cols-4 g-2`; card = botão (imagem quadrada ou inicial + nome truncado) → `onPick(token)`.
- `onEdit` presente → botão irmão `.stm-token-edit` (lápis, 28 px, círculo translúcido com desfoque) no
  canto superior direito da imagem; `aria-label`/`title` = `tokens.edit` ("Editar {{name}}").
- Paginação "Anterior / Página x de y / Próxima", 12 por página.

## `TokenEditModal`

Props: `open`, `token: TokenInfo`, `onClose(saved: boolean)`.

- Título `tokens.editTitle` ("Editar token"); `TokenFormFields` preenchido com `toTokenForm(token)`.
- Imagem em pé: atual exibida com "Trocar imagem"; imagem deitado: "Trocar" e "Remover".
- Salvar → validação do cadastro → upload das imagens novas (240 × 240, rotação) → `PUT /api/token/{id}`
  → toast `toast.tokenUpdated` → `onClose(true)`. Erro → toast, modal aberto. Cancelar → `onClose(false)`.

## Textos (pt-BR)

`tokens.mineTab` "Meus Tokens", `tokens.mineEmpty` "Você ainda não cadastrou tokens. Use a aba Incluir
token ou procure na biblioteca.", `tokens.edit` "Editar {{name}}", `tokens.editTitle` "Editar token",
`toast.tokenUpdated` "Token {{name}} atualizado."
