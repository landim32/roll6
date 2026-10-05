# Contract: UI (035)

Tema escuro, textos por i18next (`pt-BR.json`), avisos por `sonner`; abas com o `Tabs` existente (Bootstrap `nav-tabs`).

## Cadastro de token (criar em "Incluir token" e editar em "Editar token")

O formulário (`TokenFormFields`) tem duas abas, sempre montadas (a inativa fica `hidden`), para não perder nada ao alternar:

| Aba | Conteúdo |
|---|---|
| **Token** | nome, descrição, imagem em pé, imagem deitada, tamanhos (como hoje, sem a imagem de frente) |
| **2,5D** | quatro campos em grade 2 × 2: **Frente**, **Direita**, **Esquerda**, **Costas** |

Cada campo (`SpriteImageField`, antes `FrontImageField`):

- `ImageCropper` com `aspect = 3/4`, rotação, `cropAreaStyle` = silhueta humana (60% da altura, centralizada, pés na borda de baixo), a
  mesma nos quatro; saída 360 × 480 (`FRONT_IMAGE_SIZE`), margem transparente.
- Um `form-text` **sempre visível** sob o rótulo diz como desenhar: Frente "de frente"; Direita "de perfil, olhando para a direita da
  imagem"; Esquerda "de perfil, olhando para a esquerda da imagem"; Costas "de costas".
- Edição: mostra a imagem salva até escolher outra ou remover (como a "2,5D frente" hoje); remover só afeta aquele campo.
- Texto de ajuda geral no topo da aba: "Os quatro lados usam a mesma silhueta. Lado sem imagem usa a oposta espelhada (laterais), a
  frente ou a imagem em pé."

A frente da 034 passa a aparecer só na aba "2,5D" (campo **Frente**); a aba principal deixa de ter esse campo.

## i18n (`pt-BR.json`)

```json
"tokens": {
  "tabToken": "Token",
  "tabSprites": "2,5D",
  "spritesHelp": "Os quatro lados usam a mesma silhueta. Lado sem imagem usa a oposta espelhada (laterais), a frente ou a imagem em pé.",
  "view": { "front": "Frente", "right": "Direita", "left": "Esquerda", "back": "Costas" },
  "viewHint": {
    "front": "Personagem de pé, visto de frente.",
    "right": "Personagem de pé, de perfil, olhando para a direita da imagem (vemos o lado direito dele).",
    "left": "Personagem de pé, de perfil, olhando para a esquerda da imagem (vemos o lado esquerdo dele).",
    "back": "Personagem de pé, visto de costas."
  },
  "spriteCropHint": "A silhueta é só um guia e não vai para a imagem salva ({{width}}×{{height}}). Os pés ficam na borda de baixo: diminua o zoom para deixar o personagem menor na vista 3D, aumente para deixá-lo maior."
}
```

Saem `tokens.frontImage`, `tokens.frontImageHint` e `tokens.frontCropHint` (substituídos por `view.front`, `viewHint.front` e `spriteCropHint`).

## Vista 3D

Sem controle novo: a figura de cada peça troca de imagem sozinha conforme o lado visto; as peças em pé, o tamanho e a oclusão
continuam como na 034.
