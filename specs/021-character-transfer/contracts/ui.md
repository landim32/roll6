# UI Contract: Transferir personagem (021)

## SelectCharacterModal ("Selecionar personagem")

Cada linha de personagem ganha um botão de ícone "Transferir" (`title`/`aria-label` "Transferir personagem"),
desabilitado enquanto a linha está ocupada. Abre `TransferCharacterModal`.

## TransferCharacterModal

- Título: "Transferir personagem".
- Texto: "Transferir **{nome}** para outro usuário. Ele continua em todas as campanhas, com os mesmos dados e peças nos mapas."
- Campo "E-mail do novo dono" (`type="email"`, autofocus); validação local em `lib/transferForm.validateTransferEmail` (obrigatório, formato).
- Aviso (`alert-warning`): "Você deixará de ser o dono: não poderá mais editar, mover ou agir com este personagem. Só o novo dono pode devolvê-lo."
- Botões: "Cancelar" e "Transferir" (`btn-danger`, spinner enquanto envia).
- Sucesso: toast "{nome} foi transferido para {email}.", fecha e recarrega a lista. Erro: toast com a mensagem da API; o modal continua aberto.
