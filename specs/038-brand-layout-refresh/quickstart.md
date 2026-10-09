# Quickstart: validar o novo visual (038)

## Gerar os arquivos da marca (uma vez)

Usando Pillow num script temporário (fora do repositório), a partir de `docs/logomarca/*-escuro.png`:

- **Recorte do símbolo**: na horizontal, o hexágono ocupa do início da área opaca até a primeira coluna transparente antes do "r" (por volta de x ≈ 690 de 2043). Recortar esse retângulo e completar para um quadrado com margem transparente.
- **Redimensionamento**: com `LANCZOS`, nos tamanhos do `data-model.md`, salvo como PNG com paleta de 256 cores (`quantize(256)` + Floyd–Steinberg, `optimize=True`). Ficou menor que WebP (research D4), por isso o site não usa WebP.
- **`apple-touch-icon.png`**: o símbolo centralizado sobre `#0b1220`, com 12% de margem.
- **Conferência**: somar os tamanhos de `frontend/public/brand/` deve dar ≤ 100 KB.

## Automático

```bash
cd frontend
npm run lint && npm test && npm run build
grep -rn "d4a24c" src   # deve não encontrar nada
```

Vitest (`environment: node`): um teste para `BrandLogo` só se houver lógica pura extraída (por exemplo, `brandAsset(variant)` → caminhos e proporção). O resto é visual.

## Manual (`npm run dev`, desktop 1366×768 e 1920×1080; celular 390×844 nas ferramentas do navegador)

1. **Login**: fundo escuro com hexágonos discretos, logo vertical nítida, cartão com faixa verde. Entrar e Criar conta funcionam como antes. No celular, o teclado aberto não esconde o botão.
2. **Aba do navegador**: aparece o símbolo, com o título "Roll6".
3. **Menu**: no desktop, logo horizontal; no celular, só o símbolo na primeira linha. A altura do menu não mudou.
4. **Cores**: botões Salvar/Entrar verdes com texto escuro. Abas ativas, foco, checkboxes, links e itens ativos de dropdown em verde. Toast de sucesso verde. Nenhum dourado.
5. **Mapa**: no modo Mover, o caminho válido fica verde (o da marca) e o excedido vermelho. Os discos azul, vermelho e cinza das peças não mudam, a grade continua visível em mapas claros e escuros, e o quadro de redimensionar fica verde.
6. **Janelas**: Mapas, Campanhas, Personagem na Campanha, Tokens, Configurações e Chaves de API com o mesmo canto, sombra, título e rodapé.
7. **Compartilhar mapa**: o JPEG gerado tem o mesmo fundo da tela.
8. **Falha da logo**: bloquear `/brand/*` no DevTools e recarregar. Aparece o texto "Roll6" no login e no menu.
9. **Contraste**: conferir com o Lighthouse (Accessibility) ou com o inspetor de contraste nas telas do item 4.
10. **Peso**: na aba Network, o login carrega no máximo 100 KB de imagens da marca.
