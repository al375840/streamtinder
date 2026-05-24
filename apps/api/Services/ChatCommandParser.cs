using StreamerTinder.Api.Domain;

namespace StreamerTinder.Api.Services;

public sealed class ChatCommandParser
{
    public ChatCommand Parse(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return new ChatCommand.Unknown();
        var trimmed = raw.Trim();
        if (!trimmed.StartsWith('!')) return new ChatCommand.Unknown();

        var firstSpace = trimmed.IndexOf(' ');
        var head = (firstSpace < 0 ? trimmed : trimmed[..firstSpace]).ToLowerInvariant();

        return head switch
        {
            "!join"  => new ChatCommand.Join(),
            "!leave" => new ChatCommand.Leave(),
            "!izq" or "!l" or "!1" or "!si"  => new ChatCommand.Vote(VoteDirection.Left),
            "!der" or "!r" or "!2" or "!no"  => new ChatCommand.Vote(VoteDirection.Right),
            _        => new ChatCommand.Unknown()
        };
    }
}

public abstract record ChatCommand
{
    public sealed record Join    : ChatCommand;
    public sealed record Leave   : ChatCommand;
    public sealed record Vote(VoteDirection Direction) : ChatCommand;
    public sealed record Unknown : ChatCommand;
}
