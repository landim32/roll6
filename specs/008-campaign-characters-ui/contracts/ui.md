# UI Contracts: Personagens na Campanha

## Menu superior

```
[Marca] [Campanha atual ▾] [Mapa atual ▾] [Personagem atual ▾] [Salvar mapa]   ···   [Nome ▾] [🔔 2]
```

### `CharacterSelect` (`components/menu/CharacterSelect.tsx`)

`{ onManage: () => void; onSelectCharacter: () => void; onInclude: () => void }`

- Gatilho no formato do `FakeSelect` (legenda `character.current` "Personagem atual"; valor = "Mestre
  (GM)", nome do personagem ou `character.none` "Nenhum personagem"); `disabled` sem campanha.
- Conteúdo: `RadioGroup` com `'gm'` (só mestre) e os personagens próprios aprovados; `Separator`;
  itens "Gerenciar Personagens" (só mestre), "Selecionar Personagem", "Incluir Personagem".

### `NotificationBell` (`components/menu/NotificationBell.tsx`)

- Botão com ícone de sino (`aria-label` "Notificações") e badge com `invites.length` quando > 0.
- Itens: "{campanha} — mestre {dono}: convite para {personagem}" + botões "Aceitar" / "Recusar";
  vazio → "Nenhuma notificação". Ao abrir, recarrega os convites.

## Modais

### `ManageCharactersModal` (só mestre)

Abas (`components/ui/Tabs`):

1. **Personagens na Campanha** — linhas: avatar, nome, dono, badge de status; ações:
   RequestedAccess → "Aprovar", "Declinar"; todos → "Excluir" (abre `ConfirmModal`: "Remover {nome}
   da campanha? O personagem continua existindo para {dono}.").
2. **Convidar Personagens** — campo de busca (debounce ~300 ms) + lista paginada: avatar, nome, dono;
   à direita "Convidar" (fora ou Recusado) ou o badge do status atual.

### `SelectCharacterModal`

Lista de `myCharacters`: avatar, nome, badge de status na campanha atual ("Fora da campanha" sem
vínculo). Ação por status (`participationAction`):

| Status | Ação |
|---|---|
| nenhum | "Solicitar acesso" |
| Invited | "Aceitar", "Recusar" |
| RequestedAccess | texto "Aguardando o mestre" |
| Denied | texto "Aguarde um convite do mestre" |
| Approved | "Usar" (vira o personagem atual e fecha) |

Vazio → mensagem + botão "Incluir Personagem".

### `CharacterFormModal` ("Incluir Personagem")

Duas abas: **Dados** — nome*, imagem com recorte quadrado (guia redonda, zoom, arrastar;
`react-easy-crop`; salvo como WebP ≤ 512 px via `lib/cropImage.ts`), vida, energia, movimento (números
≥ 0) e estado; **Ficha** — editor Markdown com barra e pré-visualização ao vivo (`@uiw/react-md-editor`,
carregado sob demanda, pré-visualização sanitizada com `rehype-sanitize`). As abas ficam montadas; um
erro de validação leva à aba do campo. Salvar → upload (se houver imagem) → criar → pedir acesso na
campanha atual (aprovado direto se mestre ou campanha aberta). Toasts: `character.created.approved`,
`character.created.requested`, `character.created.requestFailed`.

## Status (badges)

| Valor | Texto | Classe |
|---|---|---|
| 1 Invited | Convidado | `text-bg-info` |
| 2 RequestedAccess | Acesso solicitado | `text-bg-warning` |
| 3 Approved | Aprovado | `text-bg-success` |
| 4 Denied | Recusado | `text-bg-danger` |
| — | Fora da campanha | `text-bg-secondary` |
