using System.Collections.Concurrent;

namespace Roll6.Console.Files;

/// <summary>
/// Watches the paths the server asked for (086; from roll6anime 062, research R5): files, or folders ending in "/",
/// all inside the working directory. Whoever writes a file (the Claude's Write/Edit, an editor) raises a few change
/// events in a row — and often deletes and creates it again — so each file waits until it has been quiet for
/// <see cref="SettleDelay"/>: then <see cref="FileSettled"/> gives its relative path and whole text (a file that no
/// longer exists is simply not reported). Writes made through <see cref="Ignore"/> are not reported back.
/// </summary>
public sealed class FileWatcher : IDisposable
{
    private readonly string _root;
    private readonly List<(string Folder, string? File)> _targets = new();
    private readonly List<FileSystemWatcher> _watchers = new();
    private readonly ConcurrentDictionary<string, Timer> _timers = new(StringComparer.OrdinalIgnoreCase);
    private readonly ConcurrentDictionary<string, string> _ignored = new(StringComparer.OrdinalIgnoreCase);
    /// <summary>094: the text each watched file had when last seen (at start, reported, or written by the console).</summary>
    private readonly ConcurrentDictionary<string, string> _known = new(StringComparer.OrdinalIgnoreCase);
    private readonly object _settleLock = new();
    private bool _disposed;

    /// <summary>How long a file must stay unchanged before it is read.</summary>
    public TimeSpan SettleDelay { get; set; } = TimeSpan.FromMilliseconds(200);

    /// <summary>A watched file was created or changed and has stopped changing: its relative path and its text.</summary>
    public event Action<string, string>? FileSettled;

    /// <param name="workingDirectory">The root every path is relative to.</param>
    /// <param name="watch">Relative paths: a folder ("animacoes/") or a file ("animacoes/7-aceno.json"); paths outside are ignored.</param>
    public FileWatcher(string workingDirectory, IEnumerable<string> watch)
    {
        _root = Path.GetFullPath(workingDirectory);
        foreach (var relative in watch.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            var isFolder = relative.EndsWith('/') || relative.EndsWith('\\');
            var full = FileWriter.Resolve(_root, relative.TrimEnd('/', '\\'));
            if (full == null)
                continue;
            var folder = isFolder ? full : Path.GetDirectoryName(full)!;
            Directory.CreateDirectory(folder);
            _targets.Add((folder, isFolder ? null : Path.GetFileName(full)));
        }
        foreach (var folder in _targets.Select(t => t.Folder).Distinct(StringComparer.OrdinalIgnoreCase))
        {
            var watcher = new FileSystemWatcher(folder)
            {
                NotifyFilter = NotifyFilters.FileName | NotifyFilters.LastWrite | NotifyFilters.Size,
                IncludeSubdirectories = false,
                InternalBufferSize = 64 * 1024,
            };
            watcher.Created += (_, e) => Touch(e.FullPath);
            watcher.Changed += (_, e) => Touch(e.FullPath);
            // A delete may be the first half of a rewrite: it settles like a change.
            watcher.Deleted += (_, e) => Touch(e.FullPath);
            watcher.Renamed += (_, e) => Touch(e.FullPath);
            _watchers.Add(watcher);
        }
    }

    /// <summary>Starts raising events.</summary>
    public void Start()
    {
        foreach (var file in WatchedFiles())
        {
            try
            {
                _known[file] = File.ReadAllText(file);
            }
            catch (IOException)
            {
                // Being written: the watcher will report it when it settles.
            }
        }
        foreach (var watcher in _watchers)
            watcher.EnableRaisingEvents = true;
    }

    /// <summary>The next settle of this file with exactly this text is the console's own write: not reported.</summary>
    public void Ignore(string fullPath, string content)
    {
        _ignored[fullPath] = content;
        _known[fullPath] = content;
    }

    /// <summary>
    /// Reports now, synchronously, what would otherwise settle later (094): every file still waiting for its settle, and
    /// every watched file whose text differs from the last one seen — the OS may not even have raised its event yet. Used
    /// before a tool call, so the server already has the edit the Claude just made.
    /// </summary>
    public void Flush()
    {
        if (_disposed)
            return;
        foreach (var pending in _timers.Keys.ToList())
            Settle(pending);
        foreach (var file in WatchedFiles())
        {
            string content;
            try
            {
                content = File.ReadAllText(file);
            }
            catch (IOException)
            {
                continue;
            }
            bool changed;
            lock (_settleLock)
            {
                changed = !_known.TryGetValue(file, out var known) || known != content;
                if (changed)
                    _known[file] = content;
            }
            if (changed)
                FileSettled?.Invoke(FileWriter.Relative(_root, file), content);
        }
    }

    private IEnumerable<string> WatchedFiles()
    {
        foreach (var (folder, file) in _targets)
        {
            if (!Directory.Exists(folder))
                continue;
            var candidates = file == null ? Directory.EnumerateFiles(folder) : new[] { Path.Combine(folder, file) };
            foreach (var candidate in candidates)
                if (File.Exists(candidate) && IsWatched(candidate))
                    yield return candidate;
        }
    }

    private bool IsWatched(string fullPath)
    {
        var folder = Path.GetDirectoryName(fullPath) ?? string.Empty;
        var name = Path.GetFileName(fullPath);
        return _targets.Any(t => string.Equals(t.Folder, folder, StringComparison.OrdinalIgnoreCase)
                                 && (t.File == null || string.Equals(t.File, name, StringComparison.OrdinalIgnoreCase)))
               && !name.EndsWith(".tmp", StringComparison.OrdinalIgnoreCase);
    }

    private void Touch(string fullPath)
    {
        if (_disposed || !IsWatched(fullPath))
            return;
        var timer = _timers.GetOrAdd(fullPath, key => new Timer(_ => Settle(key)));
        timer.Change(SettleDelay, Timeout.InfiniteTimeSpan);
    }

    private void Settle(string fullPath)
    {
        if (_timers.TryRemove(fullPath, out var timer))
            timer.Dispose();
        if (_disposed || !File.Exists(fullPath))
            return;
        string content;
        try
        {
            content = File.ReadAllText(fullPath);
        }
        catch (IOException)
        {
            // Still being written: wait another settle.
            Touch(fullPath);
            return;
        }
        lock (_settleLock)
        {
            if (_ignored.TryGetValue(fullPath, out var own) && own == content)
            {
                _ignored.TryRemove(fullPath, out _);
                return;
            }
            // Already reported (e.g. by a Flush before a tool call) or never changed: nothing new.
            if (_known.TryGetValue(fullPath, out var seen) && seen == content)
                return;
            _known[fullPath] = content;
        }
        FileSettled?.Invoke(FileWriter.Relative(_root, fullPath), content);
    }

    public void Dispose()
    {
        _disposed = true;
        foreach (var watcher in _watchers)
        {
            watcher.EnableRaisingEvents = false;
            watcher.Dispose();
        }
        foreach (var timer in _timers.Values)
            timer.Dispose();
        _timers.Clear();
    }
}
