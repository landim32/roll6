using System.IO;
using System.Text.Json;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;
using Roll6Anime.Core.Animations;
using Roll6Anime.Core.Settings;

namespace Roll6Anime;

/// <summary>
/// The window's side of the 3D view (062, contracts/viewer-bridge.md). The view is served from
/// <c>wwwroot/viewer</c> on the virtual host <c>viewer.roll6anime</c>; the open model is answered on
/// <c>model.roll6anime</c> straight from the disk (with CORS, the view's fetch is cross-origin); animations go as
/// messages, already validated. Messages sent before the view says "ready" wait in a queue.
/// </summary>
public sealed class ViewerBridge
{
    private const string VIEWER_HOST = "viewer.roll6anime";
    private const string MODEL_HOST = "model.roll6anime";
    private static readonly JsonSerializerOptions JSON = new(JsonSerializerDefaults.Web);

    private readonly WebView2 _view;
    private readonly Queue<string> _pending = new();
    private bool _ready;
    /// <summary>The model the view may read: the only file <c>model.roll6anime</c> answers.</summary>
    private string? _modelPath;

    public ViewerBridge(WebView2 view) => _view = view;

    /// <summary>The model opened; false when its skeleton does not use the Mixamo names (FR-004).</summary>
    public event Action<bool>? ModelLoaded;
    public event Action<string>? ModelError;
    public event Action<string>? AnimationError;

    public async Task InitializeAsync()
    {
        var userData = Path.Combine(UserState.DefaultFolder, "WebView2");
        var environment = await CoreWebView2Environment.CreateAsync(null, userData);
        await _view.EnsureCoreWebView2Async(environment);
        var core = _view.CoreWebView2;
        core.Settings.AreDevToolsEnabled = true;
        core.Settings.IsStatusBarEnabled = false;
        core.SetVirtualHostNameToFolderMapping(VIEWER_HOST, Path.Combine(AppContext.BaseDirectory, "wwwroot", "viewer"),
            CoreWebView2HostResourceAccessKind.Allow);
        core.AddWebResourceRequestedFilter($"https://{MODEL_HOST}/*", CoreWebView2WebResourceContext.All);
        core.WebResourceRequested += OnResourceRequested;
        core.WebMessageReceived += OnMessage;
        core.Navigate($"https://{VIEWER_HOST}/index.html");
    }

    /// <summary>Shows a <c>.glb</c>: the view fetches it from <c>model.roll6anime</c>.</summary>
    public void OpenModel(string path)
    {
        _modelPath = path;
        var name = Path.GetFileName(path);
        // A new query each time, so the view's cache never hands back another file with the same name.
        var url = $"https://{MODEL_HOST}/{Uri.EscapeDataString(name)}?v={DateTime.Now.Ticks}";
        Post(new { type = "model", url, name });
    }

    /// <summary>Plays the entry's last valid version. <paramref name="keepTime"/>: the same file changed (FR-008).</summary>
    public void ShowAnimation(AnimationEntry entry, bool keepTime)
    {
        if (entry.Content is not { } file)
            return;
        Post(new { type = "animation", fileName = entry.FileName, file, keepTime });
    }

    /// <summary>No animation: the model at rest.</summary>
    public void Clear() => Post(new { type = "clear" });

    private void Post(object message)
    {
        var json = JsonSerializer.Serialize(message, JSON);
        if (_ready && _view.CoreWebView2 != null)
            _view.CoreWebView2.PostWebMessageAsJson(json);
        else
            _pending.Enqueue(json);
    }

    private void OnMessage(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        using var document = JsonDocument.Parse(e.WebMessageAsJson);
        var root = document.RootElement;
        var type = root.TryGetProperty("type", out var typeElement) ? typeElement.GetString() : null;
        switch (type)
        {
            case "ready":
                _ready = true;
                while (_pending.Count > 0)
                    _view.CoreWebView2.PostWebMessageAsJson(_pending.Dequeue());
                break;
            case "modelLoaded":
                ModelLoaded?.Invoke(root.TryGetProperty("mixamo", out var mixamo) && mixamo.ValueKind == JsonValueKind.True);
                break;
            case "modelError":
                ModelError?.Invoke(root.TryGetProperty("message", out var modelMessage) ? modelMessage.GetString() ?? string.Empty : string.Empty);
                break;
            case "animationError":
                AnimationError?.Invoke(root.TryGetProperty("message", out var animationMessage) ? animationMessage.GetString() ?? string.Empty : string.Empty);
                break;
        }
    }

    private void OnResourceRequested(object? sender, CoreWebView2WebResourceRequestedEventArgs e)
    {
        var core = _view.CoreWebView2;
        var path = _modelPath;
        if (path == null || !File.Exists(path))
        {
            e.Response = core.Environment.CreateWebResourceResponse(null, 404, "Not Found", "Access-Control-Allow-Origin: *");
            return;
        }
        var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
        e.Response = core.Environment.CreateWebResourceResponse(stream, 200, "OK",
            "Content-Type: model/gltf-binary\r\nAccess-Control-Allow-Origin: *\r\nCache-Control: no-store");
    }
}
