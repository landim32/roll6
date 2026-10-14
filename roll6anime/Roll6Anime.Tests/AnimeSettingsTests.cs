using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Roll6Anime.Core.Settings;

namespace Roll6Anime.Tests;

/// <summary>The folders come from appsettings.json and a wrong one is explained (062, FR-016, US4).</summary>
public sealed class AnimeSettingsTests : IDisposable
{
    private readonly string _folder = Path.Combine(Path.GetTempPath(), "roll6anime-tests", Guid.NewGuid().ToString("N"));

    public AnimeSettingsTests() => Directory.CreateDirectory(_folder);

    public void Dispose() => Directory.Delete(_folder, true);

    [Fact]
    public void BindsTheRoll6AnimeSection()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Roll6Anime:AnimationsFolder"] = @"D:\anim",
                ["Roll6Anime:ClaudeWorkingDirectory"] = @"D:\mesa",
                ["Roll6Anime:ClaudeExecutable"] = @"D:\bin\claude.exe",
            })
            .Build();

        var settings = configuration.GetSection(AnimeSettings.SECTION).Get<AnimeSettings>()!;

        settings.AnimationsFolder.Should().Be(@"D:\anim");
        settings.ClaudeWorkingDirectory.Should().Be(@"D:\mesa");
        settings.ClaudeExecutable.Should().Be(@"D:\bin\claude.exe");
        settings.ClaudeAllowedTools.Should().Be("Bash(python:*)");
    }

    [Fact]
    public void WithoutConfigurationTheDefaultsAreTheTableProject()
    {
        var settings = new ConfigurationBuilder().Build().GetSection(AnimeSettings.SECTION).Get<AnimeSettings>() ?? new AnimeSettings();

        settings.AnimationsFolder.Should().Be(@"C:\repos\gurps-adventure\animacoes");
        settings.ClaudeWorkingDirectory.Should().Be(@"C:\repos\gurps-adventure");
        settings.ClaudeExecutable.Should().Be("claude");
    }

    [Fact]
    public void CheckNamesTheMissingFolders()
    {
        var missing = new AnimeSettings { AnimationsFolder = Path.Combine(_folder, "a"), ClaudeWorkingDirectory = Path.Combine(_folder, "b") };
        var present = new AnimeSettings { AnimationsFolder = _folder, ClaudeWorkingDirectory = _folder };

        missing.Check().Should().HaveCount(2);
        missing.CheckAnimationsFolder().Should().Contain(Path.Combine(_folder, "a")).And.Contain("Roll6Anime:AnimationsFolder");
        missing.CheckClaudeWorkingDirectory().Should().Contain(Path.Combine(_folder, "b"));
        present.Check().Should().BeEmpty();
    }

    [Fact]
    public void UserStateSurvivesABrokenFile()
    {
        new UserState { LastModel = @"C:\m\orc.glb" }.Save(_folder);
        UserState.Load(_folder).LastModel.Should().Be(@"C:\m\orc.glb");

        File.WriteAllText(Path.Combine(_folder, "state.json"), "{ broken");

        UserState.Load(_folder).LastModel.Should().BeNull();
    }
}
