using System.Globalization;
using System.Text.Json;
using Roll6.Domain.Enums;

namespace Roll6Anime.Core.Animations;

/// <summary>The first problem of an animation file: the same key and message the Roll6 gives (FR-007).</summary>
public record AnimationError(string Key, string Message)
{
    public override string ToString() => $"{Key}: {Message}";
}

/// <summary>
/// One <c>.json</c> of the animations folder (062, data-model.md). <see cref="Content"/> is the last <b>valid</b>
/// version: an invalid read sets <see cref="Error"/> and keeps it, so the view goes on playing it (FR-008).
/// </summary>
public class AnimationEntry
{
    private static readonly CultureInfo PT_BR = CultureInfo.GetCultureInfo("pt-BR");
    /// <summary>The Roll6 names of the animation types 1-7.</summary>
    public static readonly IReadOnlyList<string> TypeLabels = new[] { "Parado", "Andando", "Correndo", "Agachado", "Derrotado", "Atacando", "Defendendo" };

    public required string FileName { get; init; }
    public required string FullPath { get; init; }
    public string? Name { get; set; }
    /// <summary>The file's exact text as last read (066: the version history keeps it byte for byte).</summary>
    public string? Text { get; set; }
    public AnimationType? Type { get; set; }
    public double? Duration { get; set; }
    public bool? Loop { get; set; }
    public JsonElement? Content { get; set; }
    public AnimationError? Error { get; set; }
    public DateTime ChangedAt { get; set; }

    public bool IsValid => Error == null;

    /// <summary>The name the file suggests, else the file name without ".json".</summary>
    public string DisplayName => string.IsNullOrWhiteSpace(Name) ? Path.GetFileNameWithoutExtension(FileName) : Name!;

    /// <summary>"1,2 s · repete" / "1,4 s · uma vez", with the type when the file suggests one; empty when never valid.</summary>
    public string Summary
    {
        get
        {
            if (Duration == null || Loop == null)
                return string.Empty;
            var text = $"{Duration.Value.ToString("0.0#", PT_BR)} s · {(Loop.Value ? "repete" : "uma vez")}";
            return Type is { } type ? $"{TypeLabels[(int)type - 1]} · {text}" : text;
        }
    }
}
