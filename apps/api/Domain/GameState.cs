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

    public GameState Join(string nick, DateTime now, bool isBanned)
    {
        if (Phase != GamePhase.Lobby) return this;
        if (isBanned) return this;
        if (LobbyPlayers.Any(p => p.Nick == nick)) return this;
        if (LobbyPlayers.Count >= LobbyMax) return this;
        var updated = LobbyPlayers.ToList();
        updated.Add(new LobbyPlayer(nick, now));
        return this with { LobbyPlayers = updated };
    }

    public GameState Leave(string nick)
    {
        if (Phase != GamePhase.Lobby) return this;
        var updated = LobbyPlayers.Where(p => p.Nick != nick).ToList();
        if (updated.Count == LobbyPlayers.Count) return this;
        return this with { LobbyPlayers = updated };
    }

    public GameState VaciarLobby(DateTime now)
    {
        if (Phase != GamePhase.Lobby) return this;
        return this with
        {
            LobbyPlayers = Array.Empty<LobbyPlayer>(),
            LobbyCountdownEndsAt = now.AddSeconds(LobbySeconds)
        };
    }

    public GameState StartGame(DateTime now)
    {
        if (Phase != GamePhase.Lobby)
            throw new InvalidOperationException($"Cannot start from {Phase}");
        if (LobbyPlayers.Count < LobbyMin)
            throw new InvalidOperationException($"Need at least {LobbyMin} players");
        return this with
        {
            Phase = GamePhase.Card,
            CardIndex = 0,
            CardTimerEndsAt = now.AddSeconds(CardSeconds),
            StreamerVote = null,
            CurrentCardVotes = new Dictionary<string, PlayerVote>(),
            AciertosByNick = LobbyPlayers.ToDictionary(p => p.Nick, _ => 0)
        };
    }
}
