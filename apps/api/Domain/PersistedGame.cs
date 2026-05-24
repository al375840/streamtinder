namespace StreamerTinder.Api.Domain;

public sealed class PersistedGame
{
    public Guid Id { get; set; }
    public string PackId { get; set; } = "";
    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public string StreamerUsername { get; set; } = "";
    public string Status { get; set; } = "";

    public List<PersistedGameParticipant> Participants { get; set; } = new();
}
