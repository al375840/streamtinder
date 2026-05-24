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

    public GameState StreamerVotes(VoteDirection dir)
    {
        if (Phase != GamePhase.Card) return this;
        return this with { StreamerVote = dir };
    }

    public GameState ViewerVotes(string nick, VoteDirection dir, DateTime now)
    {
        if (Phase != GamePhase.Card) return this;
        if (!AciertosByNick.ContainsKey(nick)) return this;
        if (CurrentCardVotes.ContainsKey(nick)) return this;
        var dict = new Dictionary<string, PlayerVote>(CurrentCardVotes)
        {
            [nick] = new PlayerVote(nick, dir, now)
        };
        return this with { CurrentCardVotes = dict };
    }

    public GameState CloseCard()
    {
        if (Phase != GamePhase.Card) return this;
        var aciertos = new Dictionary<string, int>(AciertosByNick);
        if (StreamerVote is { } sv)
        {
            foreach (var (nick, vote) in CurrentCardVotes)
                if (vote.Direction == sv)
                    aciertos[nick]++;
        }
        return this with
        {
            Phase = GamePhase.CardReveal,
            AciertosByNick = aciertos
        };
    }

    public GameState NextCard(DateTime now)
    {
        if (Phase != GamePhase.CardReveal) return this;
        var nextIdx = CardIndex + 1;
        if (Pack is null) return this;
        if (nextIdx >= Pack.Cards.Count)
            return this with { Phase = GamePhase.TallyTransition, CardTimerEndsAt = null };
        return this with
        {
            Phase = GamePhase.Card,
            CardIndex = nextIdx,
            CardTimerEndsAt = now.AddSeconds(CardSeconds),
            StreamerVote = null,
            CurrentCardVotes = new Dictionary<string, PlayerVote>()
        };
    }

    public GameState EnterCriba()
    {
        if (Phase != GamePhase.TallyTransition) return this;
        return this with { Phase = GamePhase.Criba, EliminatedTiers = Array.Empty<int>() };
    }

    public GameState EliminateTier(int tier)
    {
        if (Phase != GamePhase.Criba) return this;
        if (tier is < 0 or > 10) return this;
        if (EliminatedTiers.Contains(tier)) return this;
        var list = EliminatedTiers.ToList();
        list.Add(tier);
        return this with { EliminatedTiers = list };
    }

    public CribaResult FinalizeCriba()
    {
        if (Phase != GamePhase.Criba)
            throw new InvalidOperationException($"Cannot finalize criba from {Phase}");

        var survivors = AciertosByNick
            .Where(kv => !EliminatedTiers.Contains(kv.Value))
            .Select(kv => kv.Key)
            .ToList();

        var bonusPerHead = survivors.Count == 0 ? 0 : BonusPool / survivors.Count;

        var winners = survivors.Select(nick =>
        {
            var aciertos = AciertosByNick[nick];
            var total = aciertos * PointsPerHit + bonusPerHead;
            return new GameWinner(nick, aciertos, bonusPerHead, total);
        }).OrderByDescending(w => w.TotalPoints).ToList();

        var newState = this with { Phase = GamePhase.Victory };
        return new CribaResult(newState, winners);
    }
}
