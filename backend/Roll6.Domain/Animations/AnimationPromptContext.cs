namespace Roll6.Domain.Animations;

/// <summary>
/// What goes with each request of the animation editor to the local Claude (086; the former roll6anime
/// <c>PromptContext</c>): the open animation and the model on screen, as a system prompt appended to the Claude Code's,
/// so the user can say "feche a mão esquerda" without naming the file. Built on the server: the console that runs the
/// Claude knows nothing of animations.
/// </summary>
public static class AnimationPromptContext
{
    /// <summary>
    /// The context text, in Portuguese. <paramref name="animationPath"/> is the working file as the Claude sees it
    /// ("animacoes/7-aceno.json"); <paramref name="modelName"/> the token shown on the stage, or null.
    /// </summary>
    /// <summary>094: how to look at the result with <c>print_stage</c> — always part of an editor request.</summary>
    public static readonly IReadOnlyList<string> PRINT_LINES = new[]
    {
        "Prints do palco: você tem a ferramenta print_stage (no Claude Code, mcp__roll6-editor__print_stage), que tira prints do editor do usuário com o modelo 3D dele fazendo a ÚLTIMA versão do arquivo que você gravou neste pedido — não a versão salva na biblioteca.",
        "Depois de CADA alteração do arquivo, chame print_stage e olhe os prints antes de responder: confira se a pose ficou como pedido, se nenhum membro atravessa o corpo ou as armas, e corrija e confira de novo quando algo estiver errado.",
        "Em cada print escolha \"time\" (segundos desde o início, ou \"key\" para a pose principal), \"view\" (front, back, right, left, top ou three-quarter; right/left são os lados do próprio personagem) e \"skeleton\" (true mostra os ossos sobre o modelo semitransparente; âmbar = movidos pela animação). Para um movimento, olhe o começo, o meio e o fim, de mais de um lado.",
        "Até 6 prints por chamada e 30 por pedido. Se a ferramenta devolver um erro (editor fechado, arquivo inválido, limite), siga sem o print e diga isso ao usuário na resposta.",
    };

    public static string Build(string animationPath, string? modelName, IReadOnlyList<string>? modelWeapons = null)
    {
        var lines = new List<string>
        {
            "Você está atendendo um pedido feito no editor de animações do Roll6.",
            "Use a skill criar-animacao (formato roll6-animation v1).",
            $"Animação aberta: {animationPath} — altere este mesmo arquivo e valide com o validar.py da skill.",
        };
        if (!string.IsNullOrWhiteSpace(modelName))
            lines.Add($"Modelo mostrado na tela: {modelName} (um token do Roll6; só para referência, não o altere).");
        // 092: the weapons it carries on the stage.
        if (modelWeapons is { Count: > 0 })
            lines.Add($"Armas do modelo: {string.Join(", ", modelWeapons)} — elas acompanham as mãos e o corpo, mas não fazem parte do arquivo da animação.");
        lines.Add("Grave e altere arquivos com as ferramentas Write/Edit. No Bash, rode só comandos python simples, como o validar.py (sem heredoc, \"&&\", \";\" ou \"|\"): o resto não tem permissão.");
        lines.Add("Não envie a animação ao Roll6: o editor já recebe cada versão gravada no arquivo.");
        lines.Add("Imagens anexadas ao pedido são prints da vista 3D do editor, cada uma com a legenda do instante da animação e de onde a câmera olha: use-as para ver a pose que o usuário está comentando.");
        lines.Add("Formas vermelhas nos prints (traços, retângulos e circunferências pontilhados, setas) são marcações do usuário apontando o que ele quer mostrar; não fazem parte do modelo nem da cena.");
        lines.AddRange(PRINT_LINES);
        return string.Join("\n", lines);
    }
}
