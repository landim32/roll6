# Quickstart: 110-pwa-update-notice

```bash
cd frontend
npm test && npm run lint && npm run build
cat dist/version.json                  # { "version": "..." }
npx vite preview --port 4173           # build de produção local (o aviso só liga em PROD)
```

Roteiro (com `vite preview`):

1. Abrir http://localhost:4173, fazer login. Nenhum aviso.
2. Em outro terminal, `npm run build` de novo (novo `version.json`); o `preview` passa a servir a versão nova.
3. Voltar para a aba (trocar de aba e voltar): o aviso "Nova versão do Roll6 disponível" aparece em até 5 s. Sem trocar de
   aba, aparece em até 5 min.
4. "Depois": some; trocar de aba e voltar → reaparece.
5. Mover uma peça do rascunho do mapa sem salvar (ou digitar no chat) → "Atualizar" → pergunta "Descartar alterações e
   atualizar?"; Cancelar mantém tudo; Confirmar recarrega na mesma URL, logado, **sem** o diálogo nativo do navegador.
6. Sem pendências → "Atualizar" recarrega direto.
7. Repetir o passo 2 e abrir a vista 3D na aba antiga: em vez de erro, aparece o aviso.
8. `npm run dev`: nenhum aviso em nenhum momento.
9. Celular (largura < 768 px), layouts mapa e dividido: o aviso não cobre menu, botões do mapa, painéis nem o campo do chat.
