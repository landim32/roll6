namespace Roll6Anime.Core.Animations;

/// <summary>
/// The versions one animation file went through while the tool is open (066, Q2): every content read from the folder that
/// differs from the current one — a turn of a bone, a Claude's edit, an editor — becomes a new version, and Ctrl+Z / Ctrl+Y
/// hand back the exact text of the previous / next one to write. Writing it makes the folder show it again, and since it
/// equals the current version it is not recorded twice.
/// </summary>
public sealed class AnimationHistory
{
    /// <summary>Most versions kept per file; the oldest leaves when there are more.</summary>
    public const int LIMIT = 100;

    private readonly List<string> _versions = new();
    private int _index = -1;

    public int UndoCount => Math.Max(0, _index);
    public int RedoCount => Math.Max(0, _versions.Count - 1 - _index);
    public bool CanUndo => UndoCount > 0;
    public bool CanRedo => RedoCount > 0;

    /// <summary>The current version's text, or null before the first one.</summary>
    public string? Current => _index >= 0 ? _versions[_index] : null;

    /// <summary>A content read from the folder: a new version unless it is the current one; a new one drops what could be redone.</summary>
    public bool Observe(string content)
    {
        if (_index >= 0 && _versions[_index] == content)
            return false;
        // After an undo, a version that is the next one (a redo written by someone else) just moves forward.
        if (_index + 1 < _versions.Count && _versions[_index + 1] == content)
        {
            _index++;
            return true;
        }
        if (_index + 1 < _versions.Count)
            _versions.RemoveRange(_index + 1, _versions.Count - _index - 1);
        _versions.Add(content);
        if (_versions.Count > LIMIT)
            _versions.RemoveAt(0);
        _index = _versions.Count - 1;
        return true;
    }

    /// <summary>The text of the previous version (now the current one), or null when there is none.</summary>
    public string? Undo()
    {
        if (!CanUndo)
            return null;
        _index--;
        return _versions[_index];
    }

    /// <summary>The text of the next version (now the current one), or null when there is none.</summary>
    public string? Redo()
    {
        if (!CanRedo)
            return null;
        _index++;
        return _versions[_index];
    }
}

/// <summary>One history per animation file of the folder, by name (case-insensitive, like the list).</summary>
public sealed class AnimationHistoryBook
{
    private readonly Dictionary<string, AnimationHistory> _histories = new(StringComparer.OrdinalIgnoreCase);

    public AnimationHistory For(string fileName)
    {
        if (!_histories.TryGetValue(fileName, out var history))
        {
            history = new AnimationHistory();
            _histories[fileName] = history;
        }
        return history;
    }

    public void Rename(string oldName, string newName)
    {
        if (!_histories.Remove(oldName, out var history))
            return;
        _histories[newName] = history;
    }

    public void Remove(string fileName) => _histories.Remove(fileName);
}
