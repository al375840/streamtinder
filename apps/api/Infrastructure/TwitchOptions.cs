namespace StreamerTinder.Api.Infrastructure;

public sealed class TwitchOptions
{
    public const string SectionName = "Twitch";

    public string Channel { get; init; } = "";
    public string BotNick { get; init; } = "";
}
