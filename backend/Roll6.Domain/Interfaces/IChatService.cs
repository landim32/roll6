using Roll6.DTO.Chat;

namespace Roll6.Domain.Interfaces;

/// <summary>
/// The campaign chat (041). It is the campaign's whole timeline — what people say plus every turn record and the
/// end-of-turn dividers — read and written by the master and the approved participants.
/// </summary>
public interface IChatService
{
    /// <summary>A page: newest without cursor, older with <paramref name="before"/>, newer with <paramref name="after"/>.</summary>
    Task<ChatPageInfo> ListAsync(long userId, long campaignId, string? before, string? after, int? limit);

    /// <summary>Says something as one of the sender's approved characters, or as the master when no character.</summary>
    Task<ChatItemInfo> SendAsync(long userId, long campaignId, ChatSendInfo info);

    /// <summary>Deletes a message (author or master) or a narration (master) from the chat.</summary>
    Task DeleteMessageAsync(long userId, long turnId);

    /// <summary>Pokes the players who haven't acted in the turn (043): a chat line and a notice to each of them.</summary>
    Task<Roll6.DTO.Push.PokeResultInfo> PokeAsync(long userId, long campaignId);

    /// <summary>Curtir / Amei (044): sets, switches or removes the caller's reaction.</summary>
    Task<ChatItemInfo> ReactAsync(long userId, long turnId, ChatReactInfo info);

    /// <summary>A text of a character → its action of the turn, or the valid action → text (044).</summary>
    Task<ChatItemInfo> ConvertAsync(long userId, long turnId, ChatConvertInfo info);

    /// <summary>Rolls 3d6 in the chat (server-side draw) and publishes it like a message.</summary>
    Task<ChatItemInfo> RollAsync(long userId, long campaignId, ChatRollInfo info);

    /// <summary>Moves the reader's mark forward up to <paramref name="until"/>.</summary>
    Task MarkReadAsync(long userId, long campaignId, string until);

    /// <summary>Stores a recorded audio as it came (WebM, MP4/M4A or Ogg, at most 5 MB).</summary>
    Task<ChatAudioUploadInfo> UploadAudioAsync(Stream content, long length);
}
