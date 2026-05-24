namespace StreamerTinder.Api.Domain;

public sealed class PersistedGameParticipant
{
    public Guid GameId { get; set; }
    public string TwitchUsername { get; set; } = "";
    public DateTime JoinedAt { get; set; }
    public int FinalScore { get; set; }
    public bool SurvivedCriba { get; set; }
    public int BonusEarned { get; set; }
}
