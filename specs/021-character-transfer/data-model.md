# Data Model: Transferir personagem (021)

Nenhuma tabela ou coluna nova.

## Character (`characters`) — muda só o valor

| Campo | Mudança |
|---|---|
| `user_id` | passa do dono atual para o destinatário |
| `updated_at` | agora (UTC) |

Os demais campos (nome, ficha, `life`, `energy`, `move`, `image`, `token_id`, `created_at`) ficam iguais.

## Inalterados (referenciam o personagem, não o dono)

- `campaign_characters` (`character_id`): status da participação, `current_life`, `current_energy`, `character_status`, `sheet`.
- `map_tokens` (`campaign_character_id`): posição `x`/`y`, `look`, token.
- `turns` (`character_id`): movimentos, ações e resultados.

## DTO novo

`CharacterTransferInfo { string Email }` — obrigatório, formato de e-mail.

## Regras (`CharacterService.TransferAsync`)

1. Personagem inexistente → 404; quem chama não é o dono → 403.
2. E-mail vazio/inválido → 400 (`email`); normalizado com `Trim().ToLowerInvariant()`.
3. Destinatário não encontrado → 404 "Usuário não encontrado."; destinatário = dono → 400.
4. Update condicional (`user_id` = dono); 0 linhas → 409.
5. Depois: `party.changed` + `mapTokens.changed` em cada campanha; o antigo dono sai dos grupos onde perdeu acesso.
