using System.Collections.ObjectModel;
using System.ComponentModel;

namespace Roll6Anime.Core.Claude;

/// <summary>Who wrote a line of the conversation.</summary>
public enum ConversationRole
{
    User,
    Claude,
    /// <summary>What the tool says: a file the Claude edits, a failure, a stop.</summary>
    Notice,
}

/// <summary>One line of the conversation; Claude lines grow while the answer arrives (and tell the screen).</summary>
public class ConversationMessage : INotifyPropertyChanged
{
    private string _text;

    public ConversationMessage(ConversationRole role, string text)
    {
        Role = role;
        _text = text;
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    public ConversationRole Role { get; }

    public string Text
    {
        get => _text;
        set
        {
            if (_text == value)
                return;
            _text = value;
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(Text)));
        }
    }
}

/// <summary>The local Claude's session of one animation: its id and what the screen shows of it.</summary>
public class Conversation
{
    public Guid SessionId { get; } = Guid.NewGuid();

    /// <summary>The CLI already knows the session: the next request resumes it (<c>--resume</c>) instead of creating it.</summary>
    public bool Started { get; set; }

    public ObservableCollection<ConversationMessage> Messages { get; } = new();
}

/// <summary>
/// One conversation per animation (062, Q3 = A, research R7): requests go on in the conversation of the open file, a
/// switch of file switches conversation (resuming it), "Nova conversa" starts it again. A request with no file open
/// uses the "nova animação" conversation, which <see cref="Adopt"/> hands to the file the Claude creates. Lives as long
/// as the window.
/// </summary>
public class ConversationBook
{
    /// <summary>Key of the conversation that creates a new animation.</summary>
    public const string NEW = "\0new";

    private readonly Dictionary<string, Conversation> _conversations = new(StringComparer.OrdinalIgnoreCase);

    private static string KeyOf(string? fileName) => string.IsNullOrEmpty(fileName) ? NEW : fileName;

    /// <summary>The conversation of a file (null = a new animation), created on first use.</summary>
    public Conversation For(string? fileName)
    {
        var key = KeyOf(fileName);
        if (!_conversations.TryGetValue(key, out var conversation))
        {
            conversation = new Conversation();
            _conversations[key] = conversation;
        }
        return conversation;
    }

    /// <summary>"Nova conversa": the file's conversation starts again (a new session, nothing shown).</summary>
    public Conversation Reset(string? fileName)
    {
        var conversation = new Conversation();
        _conversations[KeyOf(fileName)] = conversation;
        return conversation;
    }

    /// <summary>The "nova animação" conversation becomes the one of the file created during its request (FR-015).</summary>
    public Conversation Adopt(string fileName)
    {
        var conversation = For(null);
        _conversations.Remove(NEW);
        _conversations[fileName] = conversation;
        return conversation;
    }

    /// <summary>A file renamed in the folder keeps its conversation.</summary>
    public void Rename(string oldFileName, string newFileName)
    {
        if (_conversations.Remove(oldFileName, out var conversation))
            _conversations[newFileName] = conversation;
    }
}
