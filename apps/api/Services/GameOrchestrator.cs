using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StreamerTinder.Api.Domain;
using StreamerTinder.Api.Infrastructure;

namespace StreamerTinder.Api.Services;

public sealed class GameOrchestrator
{
    private readonly IGameStatePublisher _pub;
    private readonly ILogger<GameOrchestrator> _log;
    private readonly SemaphoreSlim _lock = new(1, 1);

    private GameState _state = GameState.New();
    private Guid? _currentGameId;
    private string _streamerUsername = "";
    private HashSet<string> _bansCache = new();

    public GameOrchestrator(IGameStatePublisher pub, ILogger<GameOrchestrator> log)
    {
        _pub = pub;
        _log = log;
    }

    public GameState CurrentState => _state;

    public async Task OpenLobbyAsync(Pack pack, string streamer, AppDbContext db, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            _streamerUsername = streamer;
            _bansCache = (await db.Bans.Select(b => b.TwitchUsername).ToListAsync(ct)).ToHashSet();
            var previous = _state;

            // Subsample to CardsPerGame at random so replays of the same pack feel
            // fresh each time. Packs smaller than CardsPerGame are used in full
            // (still shuffled — order shouldn't be deterministic either).
            var shuffled = pack.Cards
                .OrderBy(_ => Random.Shared.Next())
                .Take(Math.Min(GameState.CardsPerGame, pack.Cards.Count))
                .ToList();
            var playPack = pack with { Cards = shuffled };

            _state = _state.OpenLobby(playPack, DateTime.UtcNow);
            _currentGameId = Guid.NewGuid();
            try
            {
                await _pub.PublishStateAsync(_state, ct);
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "PublishStateAsync failed after OpenLobby — rolling back state");
                _state = previous;
                throw;
            }
        }
        finally { _lock.Release(); }
    }

    public async Task ChangePackAsync(Pack newPack, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            if (_state.Phase != GamePhase.Lobby) return;
            _state = _state with { Pack = newPack };
            await _pub.PublishStateAsync(_state, ct);
        }
        finally { _lock.Release(); }
    }

    public async Task HandleViewerCommandAsync(string nick, ChatCommand cmd, AppDbContext db, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            var before = _state;
            _state = cmd switch
            {
                ChatCommand.Join  => _state.Join(nick, DateTime.UtcNow, _bansCache.Contains(nick)),
                ChatCommand.Leave => _state.Leave(nick),
                ChatCommand.Vote v => _state.ViewerVotes(nick, v.Direction, DateTime.UtcNow),
                _                 => _state
            };
            if (!ReferenceEquals(before, _state))
                await _pub.PublishStateAsync(_state, ct);
        }
        finally { _lock.Release(); }
    }

    public async Task StreamerVoteAsync(VoteDirection dir, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            _state = _state.StreamerVotes(dir);
            await _pub.PublishStateAsync(_state, ct);
        }
        finally { _lock.Release(); }
    }

    public async Task CloseCardAsync(CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            _state = _state.CloseCard();
            await _pub.PublishStateAsync(_state, ct);
        }
        finally { _lock.Release(); }
    }

    public async Task NextCardAsync(CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            _state = _state.NextCard(DateTime.UtcNow);
            await _pub.PublishStateAsync(_state, ct);
            if (_state.Phase == GamePhase.TallyTransition)
            {
                // Use CancellationToken.None intentionally: this transition must
                // complete even if the caller's request context is cancelled or
                // the connection closes. Using `ct` here would silently leave the
                // game stuck in TallyTransition if the token fires in < 5 seconds.
                _ = Task.Run(async () =>
                {
                    await Task.Delay(TimeSpan.FromSeconds(5), CancellationToken.None);
                    await _lock.WaitAsync(CancellationToken.None);
                    try
                    {
                        _state = _state.EnterCriba();
                        await _pub.PublishStateAsync(_state, CancellationToken.None);
                    }
                    finally { _lock.Release(); }
                });
            }
        }
        finally { _lock.Release(); }
    }

    public async Task StartGameAsync(CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            _state = _state.StartGame(DateTime.UtcNow);
            await _pub.PublishStateAsync(_state, ct);
        }
        finally { _lock.Release(); }
    }

    public async Task EliminateTierAsync(int tier, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            _state = _state.EliminateTier(tier);
            await _pub.PublishStateAsync(_state, ct);
        }
        finally { _lock.Release(); }
    }

    public async Task FinalizeCribaAsync(AppDbContext db, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            var result = _state.FinalizeCriba();
            _state = result.State;
            await PersistGameAsync(result.Survivors, db, ct);
            await _pub.PublishStateAsync(_state, ct);
            await _pub.PublishWinnersAsync(result.Survivors, ct);
        }
        finally { _lock.Release(); }
    }

    public async Task BanAsync(string nick, AppDbContext db, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            if (!await db.Bans.AnyAsync(b => b.TwitchUsername == nick, ct))
            {
                db.Bans.Add(new PersistedBan { TwitchUsername = nick, BannedAt = DateTime.UtcNow });
                await db.SaveChangesAsync(ct);
                _bansCache.Add(nick);
            }
            _state = _state.Leave(nick);
            await _pub.PublishStateAsync(_state, ct);
        }
        finally { _lock.Release(); }
    }

    public async Task VaciarLobbyAsync(CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            _state = _state.VaciarLobby(DateTime.UtcNow);
            await _pub.PublishStateAsync(_state, ct);
        }
        finally { _lock.Release(); }
    }

    private async Task PersistGameAsync(IReadOnlyList<GameWinner> winners, AppDbContext db, CancellationToken ct)
    {
        if (_currentGameId is null || _state.Pack is null) return;

        var game = new PersistedGame
        {
            Id = _currentGameId.Value,
            PackId = _state.Pack.Id,
            StartedAt = DateTime.UtcNow,
            EndedAt = DateTime.UtcNow,
            StreamerUsername = _streamerUsername,
            Status = "finished"
        };

        foreach (var (nick, aciertos) in _state.AciertosByNick)
        {
            // Synthetic dev bots never touch the persistent stores: not the
            // per-game participant list, not the global Scores table. This
            // keeps real leaderboards clean even when dev mode is used in prod.
            if (BotNicks.IsBot(nick)) continue;

            var survived = winners.Any(w => w.Nick == nick);
            var bonus = winners.FirstOrDefault(w => w.Nick == nick)?.Bonus ?? 0;
            game.Participants.Add(new PersistedGameParticipant
            {
                GameId = game.Id,
                TwitchUsername = nick,
                JoinedAt = DateTime.UtcNow,
                FinalScore = aciertos,
                SurvivedCriba = survived,
                BonusEarned = bonus
            });

            var existing = await db.Scores.FindAsync(new object?[] { nick }, ct);
            if (existing is null)
            {
                db.Scores.Add(new PersistedScore
                {
                    TwitchUsername = nick,
                    TotalPoints = aciertos * GameState.PointsPerHit + bonus,
                    GamesPlayed = 1,
                    GamesWon = survived ? 1 : 0,
                    LastPlayedAt = DateTime.UtcNow
                });
            }
            else
            {
                existing.TotalPoints += aciertos * GameState.PointsPerHit + bonus;
                existing.GamesPlayed++;
                if (survived) existing.GamesWon++;
                existing.LastPlayedAt = DateTime.UtcNow;
            }
        }

        db.Games.Add(game);
        await db.SaveChangesAsync(ct);
        _log.LogInformation("Persisted game {GameId} with {Count} participants", game.Id, game.Participants.Count);
    }
}
