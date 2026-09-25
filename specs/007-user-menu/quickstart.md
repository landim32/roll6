# Quickstart: Submenu do Usuário

Pré-requisitos: API em Development (`dotnet run --project SimpleTabletopMap.API`, porta 5119) e
`npm run dev` em `frontend/` (proxy `/api` → `VITE_API_PROXY`).

```bash
cd frontend
npm install              # instala @radix-ui/react-dropdown-menu
npm test -- userForms    # validações puras
npm run lint && npm run build
```

## Roteiro de verificação

1. Criar conta e entrar. O menu mostra o nome como botão e **não** há mais um botão "Sair" separado.
2. Clicar no nome → submenu com "Editar", "Trocar senha", "Sair". Esc e clique fora fecham.
   Setas + Enter navegam pelo teclado.
3. **Editar**: e-mail aparece desabilitado. Apagar o nome e salvar → toast "nome obrigatório", modal
   aberto. Digitar "Novo Nome " e salvar → modal fecha, toast de sucesso, menu mostra "Novo Nome".
   Recarregar (F5) → continua "Novo Nome".
4. **Trocar senha**:
   - confirmação diferente → toast "as senhas não conferem", nada enviado (aba Network sem PUT);
   - nova senha "1234567" → toast de tamanho mínimo;
   - senha atual errada → toast "A senha atual está incorreta.", modal aberto com os campos;
   - dados válidos → toast de sucesso, modal fecha, usuário continua no mapa.
5. **Sair** com o mapa salvo → tela de login + toast. Entrar com a senha antiga falha; com a nova
   funciona. Voltar no navegador não reabre o mapa.
6. **Sair** com o mapa alterado (ex.: mudar o tamanho da grid) → aviso Salvar/Descartar/Cancelar;
   Cancelar mantém logado.
