namespace StreamerTinder.Api.Domain;

public sealed class PersistedBan
{
    public string TwitchUsername { get; set; } = "";
    public DateTime BannedAt { get; set; }
    public string? Reason { get; set; }
}
