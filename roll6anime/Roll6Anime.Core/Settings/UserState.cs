using System.Text.Json;
using System.Text.Json.Serialization;

namespace Roll6Anime.Core.Settings;

/// <summary>
/// What the tool remembers between runs (062): only the last model opened, in
/// <c>%LOCALAPPDATA%\roll6anime\state.json</c>. The only file the tool writes — never an animation (FR-009).
/// </summary>
public class UserState
{
    private const string FILE_NAME = "state.json";

    [JsonPropertyName("lastModel")]
    public string? LastModel { get; set; }

    /// <summary>The default folder: <c>%LOCALAPPDATA%\roll6anime</c>.</summary>
    public static string DefaultFolder =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "roll6anime");

    /// <summary>Reads the state; a missing or broken file is an empty state, never an error.</summary>
    public static UserState Load(string? folder = null)
    {
        try
        {
            var path = Path.Combine(folder ?? DefaultFolder, FILE_NAME);
            if (!File.Exists(path))
                return new UserState();
            return JsonSerializer.Deserialize<UserState>(File.ReadAllText(path)) ?? new UserState();
        }
        catch (Exception ex) when (ex is IOException or JsonException or UnauthorizedAccessException)
        {
            return new UserState();
        }
    }

    /// <summary>Writes the state; a failure is ignored (it is only a convenience).</summary>
    public void Save(string? folder = null)
    {
        try
        {
            var target = folder ?? DefaultFolder;
            Directory.CreateDirectory(target);
            File.WriteAllText(Path.Combine(target, FILE_NAME), JsonSerializer.Serialize(this));
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            // Nothing to do: the next run simply starts without a model.
        }
    }
}
