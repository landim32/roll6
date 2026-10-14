using System.Text.Json;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;

namespace Roll6.Domain.Animations;

/// <summary>What the server reads from a valid animation file (059).</summary>
public record AnimationFile(double Duration, bool Loop, string? Name, AnimationType? Type);

/// <summary>
/// The animation file format (059, <c>roll6-animation</c> version 1): the library clips (frontend
/// <c>lib/roll6Clips</c>) as a JSON file uploaded to the library. Pure. Mirror of the frontend's
/// <c>lib/animationFormat.ts</c> and of the <c>criar-animacao</c> skill's <c>validar.py</c> — same rules, same order,
/// same error keys and messages; the shared cases are in <c>specs/059-token-animation-library/fixtures/</c>.
/// </summary>
public static class AnimationFormat
{
    public const string FORMAT = "roll6-animation";
    public const int VERSION = 1;
    public const int MAX_BYTES = 1_048_576;
    public const double MAX_DURATION = 30;
    public const int MAX_TRACKS = 64;
    public const int MAX_KEYS = 600;
    public const double MAX_DEGREES = 360;
    public const double MAX_LIFT = 2;
    private const double TIME_TOLERANCE = 1e-6;

    private static readonly string[] SIDES = { "Left", "Right" };
    private static readonly string[] BODY_SIDE = { "Shoulder", "Arm", "ForeArm", "Hand", "UpLeg", "Leg", "Foot", "ToeBase" };
    private static readonly string[] FINGERS = { "Thumb", "Index", "Middle", "Ring", "Pinky" };

    /// <summary>The 52 Mixamo bone names (without the <c>mixamorig:</c> prefix) a file may move.</summary>
    public static readonly IReadOnlySet<string> BONES = new HashSet<string>(
        new[] { "Hips", "Spine", "Spine1", "Spine2", "Neck", "Head" }
            .Concat(SIDES.SelectMany(side => BODY_SIDE.Select(bone => side + bone)))
            .Concat(SIDES.SelectMany(side => FINGERS.SelectMany(finger => new[] { 1, 2, 3 }.Select(n => $"{side}Hand{finger}{n}")))),
        StringComparer.Ordinal);

    /// <summary>The suggested types a file may carry, in English, in the order of <see cref="AnimationType"/>.</summary>
    public static readonly string[] TYPE_NAMES = { "idle", "walk", "run", "crouch", "defeated", "attack", "defend" };

    /// <summary>
    /// Validates the file and returns what the server keeps of it. Throws <see cref="DomainValidationException"/> with
    /// the first problem (keys <c>content</c>, <c>content.format</c>, <c>content.tracks[i].bone</c>…). Unknown fields are
    /// ignored.
    /// </summary>
    public static AnimationFile Parse(JsonElement content)
    {
        if (content.ValueKind != JsonValueKind.Object)
            throw Error("content", "O conteúdo da animação deve ser um objeto JSON.");
        if (Serialize(content).Length > MAX_BYTES)
            throw Error("content", "O arquivo de animação passa de 1 MB.");
        if (!content.TryGetProperty("format", out var format) || format.ValueKind != JsonValueKind.String || format.GetString() != FORMAT)
            throw Error("content.format", "O campo \"format\" deve ser \"roll6-animation\".");
        if (!content.TryGetProperty("version", out var version) || !IsNumber(version, out var versionValue) || versionValue != VERSION)
            throw Error("content.version", "Versão do formato não suportada (use 1).");
        if (!content.TryGetProperty("duration", out var durationElement) || !IsNumber(durationElement, out var duration)
            || duration <= 0 || duration > MAX_DURATION)
            throw Error("content.duration", "A duração deve ser um número maior que 0 e até 30 segundos.");
        if (!content.TryGetProperty("loop", out var loop) || (loop.ValueKind != JsonValueKind.True && loop.ValueKind != JsonValueKind.False))
            throw Error("content.loop", "O campo \"loop\" deve ser true ou false.");
        if (!content.TryGetProperty("tracks", out var tracks) || tracks.ValueKind != JsonValueKind.Array
            || tracks.GetArrayLength() < 1 || tracks.GetArrayLength() > MAX_TRACKS)
            throw Error("content.tracks", "A animação precisa de 1 a 64 trilhas (\"tracks\").");

        var seen = new HashSet<string>(StringComparer.Ordinal);
        var index = 0;
        foreach (var track in tracks.EnumerateArray())
        {
            var n = index + 1;
            var key = $"content.tracks[{index}]";
            if (track.ValueKind != JsonValueKind.Object)
                throw Error(key, $"A trilha {n} deve ser um objeto.");
            if (!track.TryGetProperty("bone", out var boneElement) || boneElement.ValueKind != JsonValueKind.String
                || string.IsNullOrEmpty(boneElement.GetString()))
                throw Error($"{key}.bone", $"A trilha {n} precisa do nome do osso (\"bone\").");
            var bone = boneElement.GetString()!;
            if (!BONES.Contains(bone))
                throw Error($"{key}.bone", $"Osso \"{bone}\" não existe no esqueleto Mixamo (trilha {n}).");
            if (!seen.Add(bone))
                throw Error($"{key}.bone", $"O osso \"{bone}\" aparece em mais de uma trilha (trilha {n}).");
            var times = track.TryGetProperty("times", out var timesElement) ? ReadTimes(timesElement, duration) : null;
            if (times == null)
                throw Error($"{key}.times",
                    $"Os instantes da trilha {n} devem ser de 1 a 600 números, começando em 0, em ordem crescente e até a duração.");
            if (!track.TryGetProperty("degrees", out var degrees) || !ValidDegrees(degrees, times.Count))
                throw Error($"{key}.degrees", $"A trilha {n} precisa de um giro [x, y, z] por instante, cada valor entre -360 e 360.");
            index++;
        }

        if (content.TryGetProperty("hipsLift", out var lift))
        {
            if (lift.ValueKind != JsonValueKind.Object)
                throw Error("content.hipsLift", "O campo \"hipsLift\" deve ser um objeto.");
            var times = lift.TryGetProperty("times", out var liftTimes) ? ReadTimes(liftTimes, duration) : null;
            if (times == null)
                throw Error("content.hipsLift.times",
                    "Os instantes de \"hipsLift\" devem ser de 1 a 600 números, começando em 0, em ordem crescente e até a duração.");
            if (!lift.TryGetProperty("values", out var values) || !ValidValues(values, times.Count))
                throw Error("content.hipsLift.values", "\"hipsLift\" precisa de um valor por instante, cada um entre -2 e 2.");
            if (lift.TryGetProperty("of", out var of)
                && (of.ValueKind != JsonValueKind.String || (of.GetString() != "height" && of.GetString() != "hips")))
                throw Error("content.hipsLift.of", "\"hipsLift.of\" deve ser \"height\" ou \"hips\".");
        }

        string? name = content.TryGetProperty("name", out var nameElement) && nameElement.ValueKind == JsonValueKind.String
            ? nameElement.GetString()
            : null;
        AnimationType? type = null;
        if (content.TryGetProperty("type", out var typeElement) && typeElement.ValueKind == JsonValueKind.String)
        {
            var position = Array.IndexOf(TYPE_NAMES, typeElement.GetString());
            if (position >= 0)
                type = (AnimationType)(position + 1);
        }
        return new AnimationFile(duration, loop.ValueKind == JsonValueKind.True, name, type);
    }

    /// <summary>The document as compact UTF-8: what is stored in the bucket (and measured against the limit).</summary>
    public static byte[] Serialize(JsonElement content) => JsonSerializer.SerializeToUtf8Bytes(content);

    private static DomainValidationException Error(string key, string message) => new(key, message);

    private static bool IsNumber(JsonElement element, out double value)
    {
        value = 0;
        return element.ValueKind == JsonValueKind.Number && element.TryGetDouble(out value) && double.IsFinite(value);
    }

    /// <summary>1–600 finite numbers, the first 0, strictly ascending, the last at most the duration; else null.</summary>
    private static List<double>? ReadTimes(JsonElement element, double duration)
    {
        if (element.ValueKind != JsonValueKind.Array)
            return null;
        var count = element.GetArrayLength();
        if (count < 1 || count > MAX_KEYS)
            return null;
        var times = new List<double>(count);
        foreach (var item in element.EnumerateArray())
        {
            if (!IsNumber(item, out var value))
                return null;
            if (times.Count == 0 ? value != 0 : value <= times[^1])
                return null;
            times.Add(value);
        }
        return times[^1] <= duration + TIME_TOLERANCE ? times : null;
    }

    private static bool ValidDegrees(JsonElement element, int count)
    {
        if (element.ValueKind != JsonValueKind.Array || element.GetArrayLength() != count)
            return false;
        foreach (var triple in element.EnumerateArray())
        {
            if (triple.ValueKind != JsonValueKind.Array || triple.GetArrayLength() != 3)
                return false;
            foreach (var item in triple.EnumerateArray())
                if (!IsNumber(item, out var value) || Math.Abs(value) > MAX_DEGREES)
                    return false;
        }
        return true;
    }

    private static bool ValidValues(JsonElement element, int count)
    {
        if (element.ValueKind != JsonValueKind.Array || element.GetArrayLength() != count)
            return false;
        foreach (var item in element.EnumerateArray())
            if (!IsNumber(item, out var value) || Math.Abs(value) > MAX_LIFT)
                return false;
        return true;
    }
}
