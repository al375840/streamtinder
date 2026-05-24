using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using StreamerTinder.Api.Domain;
using StreamerTinder.Api.Infrastructure;
using StreamerTinder.Api.Services;

namespace StreamerTinder.Api.Tests;

public class GameOrchestratorTests
{
    private static (GameOrchestrator orch, AppDbContext db, FakePublisher pub) Build()
    {
        var opts = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        var db = new AppDbContext(opts);
        db.Database.EnsureCreated();
        var pub = new FakePublisher();
        var orch = new GameOrchestrator(pub, NullLogger<GameOrchestrator>.Instance);
        return (orch, db, pub);
    }

    private static Pack TestPack() =>
        new("test", "Test", "¿?", null, null,
            Enumerable.Range(0, 10).Select(i => new Card($"c{i}", $"/{i}.png", null)).ToList());

    [Fact]
    public async Task OpenLobby_publishes_state_in_lobby_phase()
    {
        var (orch, db, pub) = Build();
        await orch.OpenLobbyAsync(TestPack(), "adri", db);
        Assert.Equal(GamePhase.Lobby, pub.LastState!.Phase);
    }

    [Fact]
    public async Task Join_with_banned_nick_is_silently_ignored()
    {
        var (orch, db, pub) = Build();
        db.Bans.Add(new PersistedBan { TwitchUsername = "troll", BannedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();
        await orch.OpenLobbyAsync(TestPack(), "adri", db);
        await orch.HandleViewerCommandAsync("troll", new ChatCommand.Join(), db);
        Assert.Empty(pub.LastState!.LobbyPlayers);
    }

    private sealed class FakePublisher : IGameStatePublisher
    {
        public GameState? LastState { get; private set; }
        public IReadOnlyList<GameWinner>? LastWinners { get; private set; }
        public Task PublishStateAsync(GameState state, CancellationToken ct = default)
        {
            LastState = state;
            return Task.CompletedTask;
        }
        public Task PublishWinnersAsync(IReadOnlyList<GameWinner> w, CancellationToken ct = default)
        {
            LastWinners = w;
            return Task.CompletedTask;
        }
    }
}
