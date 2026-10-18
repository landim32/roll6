using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Roll6.Console.Settings;

namespace Roll6.Tests.Console;

/// <summary>The settings come from appsettings.json and the environment; the key only from the environment (086).</summary>
public sealed class ConsoleSettingsTests : IDisposable
{
    private readonly string _folder = Path.Combine(Path.GetTempPath(), "roll6-console-tests", Guid.NewGuid().ToString("N"));

    public ConsoleSettingsTests() => Directory.CreateDirectory(_folder);

    public void Dispose() => Directory.Delete(_folder, true);

    [Fact]
    public void BindsTheRoll6ConsoleSection()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Roll6Console:Url"] = "https://exemplo.site/",
                ["Roll6Console:ClaudeWorkingDirectory"] = @"D:\mesa",
                ["Roll6Console:ClaudeExecutable"] = @"D:\bin\claude.exe",
            })
            .Build();

        var settings = configuration.GetSection(ConsoleSettings.SECTION).Get<ConsoleSettings>()!;

        settings.BaseUrl.Should().Be("https://exemplo.site");
        settings.HubUrl.Should().Be("https://exemplo.site/hubs/animation");
        settings.ClaudeWorkingDirectory.Should().Be(@"D:\mesa");
        settings.ClaudeExecutable.Should().Be(@"D:\bin\claude.exe");
        settings.ClaudeAllowedTools.Should().Be("Bash(python:*)");
    }

    [Fact]
    public void WithoutConfigurationTheDefaultsAreTheSiteAndTheTableProject()
    {
        var settings = new ConfigurationBuilder().Build().GetSection(ConsoleSettings.SECTION).Get<ConsoleSettings>() ?? new ConsoleSettings();

        settings.Url.Should().Be("https://roll6.site");
        settings.ClaudeWorkingDirectory.Should().Be(@"C:\repos\gurps-adventure");
        settings.ClaudeExecutable.Should().Be("claude");
        settings.ApiKey.Should().BeNull();
    }

    [Fact]
    public void TheEnvironmentGivesTheKeyAndMayOverrideTheUrl()
    {
        var variables = new Dictionary<string, string?> { ["ROLL6_API_KEY"] = " r6_abc ", ["ROLL6_URL"] = "http://localhost:5119" };

        var settings = new ConsoleSettings().WithEnvironment(name => variables.GetValueOrDefault(name));

        settings.ApiKey.Should().Be("r6_abc");
        settings.Url.Should().Be("http://localhost:5119");

        new ConsoleSettings().WithEnvironment(_ => null).ApiKey.Should().BeNull();
    }

    [Fact]
    public void CheckNamesTheMissingWorkingDirectory()
    {
        var missing = new ConsoleSettings { ClaudeWorkingDirectory = Path.Combine(_folder, "b") };
        var present = new ConsoleSettings { ClaudeWorkingDirectory = _folder };

        missing.CheckClaudeWorkingDirectory().Should().Contain(Path.Combine(_folder, "b")).And.Contain("Roll6Console:ClaudeWorkingDirectory");
        present.CheckClaudeWorkingDirectory().Should().BeNull();
    }
}
