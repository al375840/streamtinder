namespace StreamerTinder.Api.Domain;

public sealed class PersistedScore
{
    public string TwitchUsername { get; set; } = "";
    public int TotalPoints { get; set; }
    public int GamesPlayed { get; set; }
    public int GamesWon { get; set; }
    public DateTime LastPlayedAt { get; set; }
}
