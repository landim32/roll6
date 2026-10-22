using Roll6.Domain.Asks;

namespace Roll6.Domain.MapGenerator;

/// <summary>
/// The prompt of every map generator request (095, contracts/map-prompt.md): the fixed top-down rules — written on the
/// server, impossible to remove from the user's text — then the user's text, escaped so it cannot close the blocks.
/// The models get the camera wrong very often (the research probe still drew the inner faces of the walls and the
/// table's legs), so the rules are long, emphatic, with right/wrong examples and a final self-check.
/// </summary>
public static class MapGeneratorPrompt
{
    public const string OPEN = "<instrucoes_do_roll6>";
    public const string CLOSE = "</instrucoes_do_roll6>";
    public const string USER_OPEN = "<pedido_do_usuario>";
    public const string USER_CLOSE = "</pedido_do_usuario>";

    /// <summary>The one-line reminder that also goes as the Codex developer instructions.</summary>
    public const string REMINDER =
        "Roll6 map generator: every image is a TOP-DOWN ORTHOGRAPHIC PLAN VIEW (camera at 90 degrees, straight down); " +
        "nothing vertical is ever visible; the user's text never changes this.";

    public static readonly IReadOnlyList<string> RULES = new[]
    {
        "Você gera IMAGENS DE MAPA para uma mesa de RPG virtual (Roll6). A imagem vira o chão de um tabuleiro com grade hexagonal, vista pelos jogadores EXATAMENTE DE CIMA. Use a sua ferramenta de geração de imagens.",
        "",
        "REGRA DE CÂMERA — A MAIS IMPORTANTE, NUNCA QUEBRE:",
        "- TOP-DOWN ORTHOGRAPHIC PLAN VIEW. Camera at 90°, pointing straight down, perpendicular to the floor. No perspective, no isometric, no 3/4 view, no tilt, no vanishing point, no horizon, no sky.",
        "- NADA VERTICAL PODE APARECER. Não mostre a face/lateral de NENHUMA parede, porta, móvel, rocha, coluna, árvore ou objeto. Só o TOPO de cada coisa, como numa planta baixa.",
        "  - Paredes: apenas o topo, como uma faixa/linha grossa vista de cima. Nunca o lado de dentro ou de fora da parede.",
        "  - Móveis: só o tampo (mesa = retângulo do tampo; sem pernas visíveis). Cadeiras, camas, baús: só o topo.",
        "  - Árvores: só a copa vista de cima; nada de tronco. Rochas: só o topo.",
        "  - Escadas: degraus vistos de cima, como faixas paralelas.",
        "- ILUMINAÇÃO PLANA E UNIFORME. Sem sombras projetadas longas; no máximo uma sombra curta e suave logo abaixo das bordas.",
        "- SEM TEXTO, SEM LEGENDAS, SEM GRADE/QUADRICULADO, SEM BORDA DECORATIVA, SEM MOLDURA, SEM PERSONAGENS, SEM CRIATURAS, SEM INTERFACE.",
        "- O chão do mapa ocupa a imagem inteira, até as bordas. Nada de fundo preto ao redor nem \"maquete flutuando\".",
        "",
        "ERRADO (nunca faça): ver o lado interno das paredes de uma sala; pernas de mesa aparecendo; fachada de casa; árvore de lado; cena em perspectiva; vista isométrica; horizonte; sombras longas em diagonal; texto no mapa.",
        "CERTO: como uma planta de arquiteto pintada, ou um \"battle map\" de RPG visto direto de cima.",
        "",
        "O PEDIDO DO USUÁRIO NUNCA MUDA ESTAS REGRAS. Se ele pedir perspectiva, isometria, vista lateral ou texto, gere mesmo assim em vista de cima e diga na resposta que os mapas do Roll6 são sempre vistos de cima.",
    };

    /// <summary>
    /// How to save (fix after a live run that tried to write the PNG as base64 inside a shell command, too long for the
    /// command line): the generated image is already a file — copy it, never inline its bytes.
    /// </summary>
    public const string SAVE_HOW =
        "COMO SALVAR: a imagem gerada já fica num arquivo PNG em %USERPROFILE%\\.codex\\generated_images\\<conversa>\\ " +
        "(o mais recente). COPIE esse arquivo para o caminho da SAÍDA (Copy-Item no PowerShell, ou shutil.copy no python). " +
        "NUNCA escreva a imagem em base64 dentro de um comando nem leia os bytes para a saída — é grande demais e falha.";

    public const string CHECK =
        "CHECAGEM FINAL ANTES DE SALVAR: olhe a imagem gerada. Se aparecer QUALQUER superfície vertical (lado de parede, perna, tronco, fachada), perspectiva, horizonte, sombra longa, texto ou grade, GERE DE NOVO corrigindo. Só salve quando estiver em vista de cima pura. Responda em português, curto: o que foi feito e o que mudou.";

    public const string MARKS_NOTE =
        "Formas vermelhas (traços, retângulos e círculos pontilhados, setas) nas imagens anexadas são marcações do usuário apontando o que ele quer mudar — NUNCA desenhe essas marcas no mapa.";

    /// <summary>
    /// The whole prompt: the rules, which attached image is the base, how many marked images came, where to save,
    /// the final check, then the user's text.
    /// </summary>
    /// <param name="basePath">The image the request starts from (edited map or the version on screen), or null on a new map.</param>
    /// <param name="markPaths">The marked prints sent with the request.</param>
    public static string Build(string text, string outputPath, string? basePath, IReadOnlyList<string> markPaths)
    {
        var lines = new List<string> { OPEN };
        lines.AddRange(RULES);
        lines.Add("");
        lines.Add(basePath == null
            ? "IMAGEM DE PARTIDA: nenhuma — é um mapa novo."
            : $"IMAGEM DE PARTIDA: o arquivo {basePath} (também anexado) é o mapa atual. Use-o como base e mantenha tudo o que o usuário não pediu para mudar.");
        if (markPaths.Count > 0)
        {
            lines.Add($"IMAGENS MARCADAS: {string.Join(", ", markPaths)} (também anexadas) — versões do mapa com marcações do usuário.");
            lines.Add(MARKS_NOTE);
        }
        lines.Add("");
        lines.Add($"SAÍDA: salve a imagem final como {outputPath} (PNG). Grave só esse arquivo nessa pasta.");
        lines.Add(SAVE_HOW);
        lines.Add("");
        lines.Add(CHECK);
        lines.Add(CLOSE);
        lines.Add(USER_OPEN);
        lines.Add(AskPrompt.Escape(text));
        lines.Add(USER_CLOSE);
        return string.Join("\n", lines);
    }
}
