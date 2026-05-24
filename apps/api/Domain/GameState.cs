namespace StreamerTinder.Api.Domain;

public sealed record GameState(
    GamePhase Phase,
    Pack? Pack,
    IReadOnlyList<LobbyPlayer> LobbyPlayers,
    DateTime? LobbyCountdownEndsAt,
    int CardIndex,
    DateTime? CardTimerEndsAt,
    VoteDirection? StreamerVote,
    IReadOnlyDictionary<string, PlayerVote> CurrentCardVotes,
    IReadOnlyDictionary<string, int> AciertosByNick,
    IReadOnlyList<int> EliminatedTiers)
{
    public const int LobbyMin = 10;
    public const int LobbyMax = 60;
    public const int CardSeconds = 10;
    public const int LobbySeconds = 60;
    public const int BonusPool = 100;
    public const int PointsPerHit = 10;

    public static GameState New() => new(
        Phase: GamePhase.Idle,
        Pack: null,
        LobbyPlayers: Array.Empty<LobbyPlayer>(),
        LobbyCountdownEndsAt: null,
        CardIndex: 0,
        CardTimerEndsAt: null,
        StreamerVote: null,
        CurrentCardVotes: new Dictionary<string, PlayerVote>(),
        AciertosByNick: new Dictionary<string, int>(),
        EliminatedTiers: Array.Empty<int>());

    public GameState OpenLobby(Pack pack, DateTime now)
    {
        if (Phase != GamePhase.Idle)
            throw new InvalidOperationException($"Cannot open lobby from {Phase}");
        return this with
        {
            Phase = GamePhase.Lobby,
            Pack = pack,
            LobbyPlayers = Array.Empty<LobbyPlayer>(),
            LobbyCountdownEndsAt = now.AddSeconds(LobbySeconds)
        };
    }
}
