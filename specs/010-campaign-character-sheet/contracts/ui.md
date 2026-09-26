# UI Contract: Status e Ficha do Personagem por Campanha

## Card do painel (`PartyCard`)

| Usuário | Ícone | Ação |
|---|---|---|
| Dono do personagem ou mestre | lápis ("Editar {nome}") | abre o modal em modo `owner` ou `master` |
| Participante aprovado (outro) | olho ("Ver {nome}") | abre o modal em modo `viewer` |

O card continua mostrando só foto, nome, "caído" e as barras.

## `CharacterFormModal`

Modo de acesso: `participationMode(isMaster, isOwner)` → `owner` se dono (mesmo sendo mestre),
senão `master` se mestre, senão `viewer`.

| | Inclusão | `owner` | `master` | `viewer` |
|---|---|---|---|---|
| Título | Incluir Personagem | Editar Personagem | Editar Personagem | Ver Personagem |
| Aba Dados — nome, imagem, vida/energia totais, movimento | editável | editável | só leitura | só leitura |
| Campo Status do personagem | **não existe** | — | — | — |
| Área "Nesta campanha" — vida atual, energia atual, **status** | — | editável | editável | só leitura |
| Aba **Ficha** (original) | editor | editor | não aparece | não aparece |
| Aba **Ficha da campanha** | — | editor | editor | visualização sanitizada |
| Rodapé | Cancelar / Salvar | Cancelar / Salvar | Cancelar / Salvar | Fechar |
| Dados carregados de | — | `GET /api/character/{id}` + `GET /api/campaigncharacter/{id}` | `GET /api/campaigncharacter/{id}` | `GET /api/campaigncharacter/{id}` |
| Salvar chama | `POST /api/character` (+ entrada) | `PUT /api/character/{id}` e `PUT /api/campaigncharacter/{id}` | `PUT /api/campaigncharacter/{id}` | — |

Regras:

- Validação completa antes da primeira chamada (nome/números/ficha original, atuais ≤ totais,
  status ≤ 260, ficha da campanha ≤ 20 000); erro → toast e troca para a aba do problema.
- No modo `owner`, reduzir um total abaixo de um atual não tocado leva o atual junto (regra da 009).
- Após salvar: toast "Personagem atualizado", `refreshParty()`.
- Erros da API → toast com a mensagem do `ProblemDetails`.

## Textos (pt-BR, `i18n/locales/pt-BR.json`)

- `characterForm.viewTitle`: "Ver personagem"
- `characterForm.characterStatus`: "Status"
- `characterForm.campaignSheetTab`: "Ficha da campanha"
- `characterForm.campaignSheetHint`: "Cópia da ficha feita quando o personagem entrou na campanha; alterações aqui não mudam a ficha original."
- `characterForm.readOnlyHint`: "Só o dono do personagem pode alterar estes dados."
- `characterForm.errors.characterStatusTooLong`, `characterForm.errors.campaignSheetTooLong`
- `party.view`: "Ver {{name}}"
- Remover `characterForm.status` e `characterForm.errors.statusTooLong`.
