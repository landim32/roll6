using System.Collections.Concurrent;

namespace Roll6Anime.Core.Animations;

/// <summary>
/// Watches the <c>*.json</c> files of the animations folder (062, research R5). Whoever writes a file (the Claude's
/// Write/Edit, an editor) raises a few change events in a row — and often deletes and creates it again — so each file
/// waits until it has been quiet for <see cref="SettleDelay"/>: then it is <see cref="FileSettled"/> if it exists
/// (read it whole) or <see cref="FileRemoved"/> if it does not. Events come on a thread-pool thread; the window
/// marshals them.
/// </summary>
public sealed class FolderWatcher : IDisposable
{
    private readonly string _folder;
    private readonly FileSystemWatcher _watcher;
    private readonly ConcurrentDictionary<string, Timer> _timers = new(StringComparer.OrdinalIgnoreCase);
    private bool _disposed;

    /// <summary>How long a file must stay unchanged before it is read.</summary>
    public TimeSpan SettleDelay { get; set; } = TimeSpan.FromMilliseconds(200);

    /// <summary>A file was created or changed and has stopped changing: read it now. Argument: the file name.</summary>
    public event Action<string>? FileSettled;
    /// <summary>A file left the folder. Argument: the file name.</summary>
    public event Action<string>? FileRemoved;
    /// <summary>A file was renamed (old name, new name). A rename to or from another extension is a create/remove.</summary>
    public event Action<string, string>? FileRenamed;
    /// <summary>The watcher lost events (buffer overflow): list the folder again.</summary>
    public event Action? FolderReset;

    public FolderWatcher(string folder)
    {
        _folder = folder;
        _watcher = new FileSystemWatcher(folder)
        {
            NotifyFilter = NotifyFilters.FileName | NotifyFilters.LastWrite | NotifyFilters.Size,
            IncludeSubdirectories = false,
            InternalBufferSize = 64 * 1024,
        };
        _watcher.Created += (_, e) => Touch(e.Name);
        _watcher.Changed += (_, e) => Touch(e.Name);
        // A delete may be the first half of a rewrite: it settles like a change.
        _watcher.Deleted += (_, e) => Touch(e.Name);
        _watcher.Renamed += (_, e) => Renamed(e.OldName, e.Name);
        _watcher.Error += (_, _) => FolderReset?.Invoke();
    }

    /// <summary>Starts raising events.</summary>
    public void Start() => _watcher.EnableRaisingEvents = true;

    private static bool IsJson(string? name) =>
        name != null && string.Equals(Path.GetExtension(name), ".json", StringComparison.OrdinalIgnoreCase);

    private void Touch(string? name)
    {
        if (_disposed || !IsJson(name))
            return;
        var file = name!;
        var timer = _timers.GetOrAdd(file, key => new Timer(_ => Settle(key)));
        timer.Change(SettleDelay, Timeout.InfiniteTimeSpan);
    }

    private void Settle(string name)
    {
        if (_timers.TryRemove(name, out var timer))
            timer.Dispose();
        if (_disposed)
            return;
        if (File.Exists(Path.Combine(_folder, name)))
            FileSettled?.Invoke(name);
        else
            FileRemoved?.Invoke(name);
    }

    private void Renamed(string? oldName, string? newName)
    {
        if (_disposed)
            return;
        var wasJson = IsJson(oldName);
        var isJson = IsJson(newName);
        if (wasJson && isJson)
        {
            if (_timers.TryRemove(oldName!, out var timer))
                timer.Dispose();
            FileRenamed?.Invoke(oldName!, newName!);
            // The renamed file may also have been written just before (editors save "x.tmp" → "x.json").
            Touch(newName);
        }
        else if (wasJson)
            Touch(oldName);
        else if (isJson)
            Touch(newName);
    }

    public void Dispose()
    {
        _disposed = true;
        _watcher.EnableRaisingEvents = false;
        _watcher.Dispose();
        foreach (var timer in _timers.Values)
            timer.Dispose();
        _timers.Clear();
    }
}
