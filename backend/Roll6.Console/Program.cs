using System.Diagnostics;
using Microsoft.Extensions.Configuration;
using Roll6.Console.Bridge;
using Roll6.Console.Claude;
using Roll6.Console.Settings;

// Roll6.Console (086): a generic bridge between the Roll6 site and this machine's Claude Code. It connects out to the
// Roll6 with the user's API key, registers as the agent of the account and executes what the server sends — a system
// prompt, a prompt, pictures, files to write, paths to watch — reporting the events of the Claude and the files that
// changed. It knows nothing of animations or of any other screen: the server decides everything.

var log = (string line) => System.Console.WriteLine($"{DateTime.Now:HH:mm:ss} {line}");
System.Console.OutputEncoding = System.Text.Encoding.UTF8;
System.Console.WriteLine("Roll6.Console · ponte entre o Roll6 e o Claude Code desta máquina");

var configuration = new ConfigurationBuilder()
    .SetBasePath(AppContext.BaseDirectory)
    .AddJsonFile("appsettings.json", optional: true)
    .AddEnvironmentVariables()
    .Build();
var settings = (configuration.GetSection(ConsoleSettings.SECTION).Get<ConsoleSettings>() ?? new ConsoleSettings())
    .WithEnvironment(Environment.GetEnvironmentVariable);

if (settings.ApiKey == null)
{
    System.Console.Error.WriteLine(ConsoleSettings.MISSING_KEY);
    return 2;
}
if (settings.CheckClaudeWorkingDirectory() is { } missing)
{
    System.Console.Error.WriteLine(missing);
    return 2;
}

using var stopping = new CancellationTokenSource();
System.Console.CancelKeyPress += (_, e) =>
{
    e.Cancel = true;
    log("Encerrando…");
    stopping.Cancel();
};

// The key: refused → leave; unreachable → keep trying.
using (var api = new Roll6Api(settings))
{
    while (true)
    {
        try
        {
            var name = await api.MeAsync(stopping.Token);
            if (name == null)
            {
                System.Console.Error.WriteLine(ConsoleSettings.INVALID_KEY);
                return 2;
            }
            break;
        }
        catch (OperationCanceledException)
        {
            return 0;
        }
        catch (Exception ex)
        {
            log($"Sem conexão com o Roll6 ({ex.Message}); nova tentativa em 15 s.");
            try { await Task.Delay(TimeSpan.FromSeconds(15), stopping.Token); } catch (OperationCanceledException) { return 0; }
        }
    }
}

// The Claude Code: a missing CLI is only a warning here (each request then fails with the same message).
try
{
    using var check = Process.Start(new ProcessStartInfo(settings.ClaudeExecutable, "--version")
    {
        RedirectStandardOutput = true, RedirectStandardError = true, UseShellExecute = false, CreateNoWindow = true,
    });
    if (check != null)
    {
        var version = (await check.StandardOutput.ReadToEndAsync()).Trim();
        await check.WaitForExitAsync();
        log(check.ExitCode == 0 ? $"Claude Code {version}" : ClaudeRunner.NOT_FOUND);
    }
}
catch (Exception)
{
    log(ClaudeRunner.NOT_FOUND);
}

await using var bridge = new BridgeClient(settings, log);
var runner = new RequestRunner(settings, new ClaudeRunner(settings), bridge, log);
bridge.Attach(runner);
await bridge.StartAsync(stopping.Token);
if (stopping.IsCancellationRequested)
    return 0;

try
{
    await Task.Delay(Timeout.InfiniteTimeSpan, stopping.Token);
}
catch (OperationCanceledException)
{
    // Ctrl+C: a running request is stopped (its outcome goes out as Stopped) and the connection closed.
    if (runner.Running is long running)
    {
        runner.Stop(running);
        await Task.Delay(500);
    }
}
return 0;
