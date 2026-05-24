using StreamerTinder.Api.Domain;
using StreamerTinder.Api.Services;

namespace StreamerTinder.Api.Tests;

public class ChatCommandParserTests
{
    private readonly ChatCommandParser _p = new();

    [Theory]
    [InlineData("!join")]
    [InlineData("!JOIN")]
    [InlineData("  !join  ")]
    [InlineData("!join I want to play")]
    public void Parses_join_in_various_forms(string msg)
    {
        Assert.IsType<ChatCommand.Join>(_p.Parse(msg));
    }

    [Theory]
    [InlineData("!leave")]
    [InlineData("!LEAVE")]
    public void Parses_leave(string msg)
    {
        Assert.IsType<ChatCommand.Leave>(_p.Parse(msg));
    }

    [Theory]
    [InlineData("!izq", VoteDirection.Left)]
    [InlineData("!l", VoteDirection.Left)]
    [InlineData("!1", VoteDirection.Left)]
    [InlineData("!si", VoteDirection.Left)]
    [InlineData("!der", VoteDirection.Right)]
    [InlineData("!r", VoteDirection.Right)]
    [InlineData("!2", VoteDirection.Right)]
    [InlineData("!no", VoteDirection.Right)]
    public void Parses_votes_with_aliases(string msg, VoteDirection expected)
    {
        var cmd = _p.Parse(msg);
        var vote = Assert.IsType<ChatCommand.Vote>(cmd);
        Assert.Equal(expected, vote.Direction);
    }

    [Theory]
    [InlineData("")]
    [InlineData("just chat")]
    [InlineData("!unknown")]
    [InlineData("join no bang")]
    public void Returns_Unknown_for_non_commands(string msg)
    {
        Assert.IsType<ChatCommand.Unknown>(_p.Parse(msg));
    }
}
