namespace StreamerTinder.Api.Domain;

/// <summary>
/// Reserved nick prefix for synthetic test players injected via the dev mode
/// (?dev=1 in the streamer panel). Bots get joined into lobbies and may vote,
/// but are filtered out at persistence time so they never appear on the global
/// leaderboard or pollute per-player stats.
///
/// Twitch nicks cannot legally start with an underscore and must be at least
/// 4 chars, so "bot_" is a safe sentinel: no real Twitch username will ever
/// collide with this prefix.
/// </summary>
public static class BotNicks
{
    public const string Prefix = "bot_";

    public static bool IsBot(string nick) =>
        !string.IsNullOrEmpty(nick) && nick.StartsWith(Prefix, StringComparison.Ordinal);
}
