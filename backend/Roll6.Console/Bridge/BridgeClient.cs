using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR.Client;
using Roll6.Console.Settings;
using Roll6.DTO.Realtime.Console;

namespace Roll6.Console.Bridge;

/// <summary>
/// The connection of the console to the Roll6 hub (086, contracts/agent-protocol.md): outbound SignalR with the API key
/// in <c>X-Api-Key</c>, automatic reconnection with a new registration, and the three client methods the server calls —
/// <c>run</c>, <c>stop</c>, <c>writeFiles</c>. Reports back through <see cref="IRequestReporter"/>.
/// </summary>
public sealed class BridgeClient : IRequestReporter, IAsyncDisposable
{
    private readonly ConsoleSettings _settings;
    private readonly Action<string> _log;
    private readonly HubConnection _connection;
    /// <summary>094: tool calls waiting for the server's <c>toolResult</c>, by call id.</summary>
    private readonly ConcurrentDictionary<string, TaskCompletionSource<ToolResultInfo>> _toolCalls = new();
    private RequestRunner? _runner;

    /// <summary>How long a tool call waits for the server before answering the Claude with an error.</summary>
    public static readonly TimeSpan TOOL_TIMEOUT = TimeSpan.FromSeconds(60);

    public const string TOOL_TIMED_OUT = "O Roll6 não respondeu a tempo.";
    public const string TOOL_FAILED = "Não foi possível falar com o Roll6: {0}";

    public BridgeClient(ConsoleSettings settings, Action<string> log)
    {
        _settings = settings;
        _log = log;
        _connection = new HubConnectionBuilder()
            .WithUrl(settings.HubUrl, options => options.Headers["X-Api-Key"] = settings.ApiKey ?? string.Empty)
            .WithAutomaticReconnect(new[] { TimeSpan.Zero, TimeSpan.FromSeconds(2), TimeSpan.FromSeconds(5), TimeSpan.FromSeconds(10), TimeSpan.FromSeconds(30) })
            .Build();
        _connection.Reconnecting += _ =>
        {
            _log("Conexão perdida; reconectando…");
            return Task.CompletedTask;
        };
        _connection.Reconnected += async _ =>
        {
            _log("Reconectado.");
            await RegisterAsync();
        };
        _connection.Closed += _ =>
        {
            _log("Conexão encerrada.");
            return Task.CompletedTask;
        };
    }

    /// <summary>The runner that executes what the server sends; set once before <see cref="StartAsync"/>.</summary>
    public void Attach(RequestRunner runner)
    {
        _runner = runner;
        _connection.On<RunInfo>("run", run => { _ = RunAsync(run); });
        _connection.On<long>("stop", requestId => runner.Stop(requestId));
        _connection.On<List<FileWriteInfo>>("writeFiles", files => runner.WriteFiles(files));
        _connection.On<ToolResultInfo>("toolResult", result =>
        {
            if (result != null && _toolCalls.TryRemove(result.CallId, out var pending))
                pending.TrySetResult(result);
        });
    }

    private async Task RunAsync(RunInfo run)
    {
        try
        {
            await _runner!.RunAsync(run);
        }
        catch (Exception ex)
        {
            _log($"Pedido #{run.RequestId} falhou: {ex.Message}");
            try
            {
                await FinishedAsync(run.RequestId, new RequestOutcomeInfo { Kind = RequestOutcomeInfo.FAILED, Message = ex.Message });
            }
            catch (Exception)
            {
                // The connection is gone; the server fails the request when the agent drops.
            }
        }
    }

    /// <summary>Connects and registers; retries every 15 s while the server is unreachable.</summary>
    public async Task StartAsync(CancellationToken cancellation)
    {
        while (!cancellation.IsCancellationRequested)
        {
            try
            {
                await _connection.StartAsync(cancellation);
                var registered = await RegisterAsync();
                _log($"Conectado ao {Host()} como {registered} (máquina {Environment.MachineName}) · pasta {_settings.ClaudeWorkingDirectory}");
                return;
            }
            catch (OperationCanceledException) when (cancellation.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                _log($"Sem conexão com o Roll6 ({ex.Message}); nova tentativa em 15 s.");
                await Task.Delay(TimeSpan.FromSeconds(15), cancellation).ContinueWith(_ => { });
            }
        }
    }

    private async Task<string> RegisterAsync()
    {
        var info = new AgentRegisterInfo { Machine = Environment.MachineName, Folder = _settings.ClaudeWorkingDirectory };
        var registered = await _connection.InvokeAsync<AgentRegisteredInfo>("RegisterAgent", info);
        return string.IsNullOrWhiteSpace(registered?.UserName) ? "usuário" : registered.UserName;
    }

    private string Host() => Uri.TryCreate(_settings.BaseUrl, UriKind.Absolute, out var uri) ? uri.Host : _settings.BaseUrl;

    public Task ProgressAsync(long requestId, ClaudeEventInfo claudeEvent) => _connection.SendAsync("Progress", requestId, claudeEvent);

    public Task FileChangedAsync(long requestId, FileChangedInfo info) => _connection.SendAsync("FileChanged", requestId, info);

    public Task FinishedAsync(long requestId, RequestOutcomeInfo outcome) => _connection.SendAsync("Finished", requestId, outcome);

    /// <summary>A call of a run's tool (094): sent as <c>ToolCall</c>, answered by the server's <c>toolResult</c>.</summary>
    public async Task<ToolResultInfo> CallToolAsync(long requestId, ToolCallInfo call, CancellationToken cancellation)
    {
        var key = $"{requestId}:{call.CallId}";
        call.CallId = key;
        var pending = new TaskCompletionSource<ToolResultInfo>(TaskCreationOptions.RunContinuationsAsynchronously);
        _toolCalls[key] = pending;
        try
        {
            await _connection.SendAsync("ToolCall", requestId, call, cancellation);
            var finished = await Task.WhenAny(pending.Task, Task.Delay(TOOL_TIMEOUT, cancellation));
            return finished == pending.Task ? await pending.Task : ToolResultInfo.Error(key, TOOL_TIMED_OUT);
        }
        catch (OperationCanceledException)
        {
            return ToolResultInfo.Error(key, "O pedido foi encerrado.");
        }
        catch (Exception ex)
        {
            return ToolResultInfo.Error(key, string.Format(TOOL_FAILED, ex.Message));
        }
        finally
        {
            _toolCalls.TryRemove(key, out _);
        }
    }

    public async ValueTask DisposeAsync()
    {
        try
        {
            await _connection.StopAsync();
        }
        catch (Exception)
        {
            // Leaving anyway.
        }
        await _connection.DisposeAsync();
    }
}
