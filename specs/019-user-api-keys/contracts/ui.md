# UI Contract: chaves de API (019)

## Menu do usuário

Novo item **"Chaves de API"** entre "Alterar senha" e o separador do "Sair" (`UserMenu` → `onApiKeys`);
estado do modal no `TopMenu`, como os outros itens.

## `ApiKeysModal` (grande)

1. **Nova chave** (formulário no topo): Nome (obrigatório, 100), Validade (`select`: 7 dias, 30 dias,
   90 dias, 1 ano, Data específica, Sem expiração — padrão 30 dias); "Data específica" mostra um
   `input type="date"` (mínimo amanhã); "Sem expiração" mostra um alerta de aviso. Botão "Gerar chave".
2. **Chave gerada** (substitui o formulário até fechar): alerta de sucesso com a chave em `code`
   (seleção total), botão "Copiar" (Clipboard API → toast `toast.apiKeyCopied`), texto "Guarde agora: ela
   não será exibida de novo" e botão "Já copiei".
3. **Lista**: tabela/lista com Nome, Chave (`r6_ab12cd34…`), Criada, Expira ("Nunca"), Último uso
   ("Nunca usada"), Situação (badge verde Ativa / cinza Expirada / vermelha Revogada) e ações: "Revogar"
   (ativa, `ConfirmModal` perigo) e "Excluir" (revogada/expirada, `ConfirmModal`). Vazio → `apiKeys.empty`.
4. Rodapé com um exemplo de uso: `X-Api-Key: <sua chave>`.

## Textos (pt-BR)

`userMenu.apiKeys`, `apiKeys.title`, `apiKeys.name`, `apiKeys.expiration`, `apiKeys.exp7`, `exp30`,
`exp90`, `exp365`, `expDate`, `expNever`, `neverWarning`, `generate`, `createdTitle`, `createdHint`,
`copy`, `copied` ("Já copiei"), `list`, `empty`, `key`, `created`, `expires`, `never`, `lastUsed`,
`neverUsed`, `status`, `active`, `expired`, `revoked`, `revoke`, `revokeTitle`, `revokeMessage`,
`delete`, `deleteTitle`, `deleteMessage`, `usage`, `nameRequired`, `dateRequired`, `datePast`;
toasts `toast.apiKeyCreated`, `toast.apiKeyCopied`, `toast.apiKeyRevoked`, `toast.apiKeyDeleted`.
