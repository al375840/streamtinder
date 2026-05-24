using StreamerTinder.Api.Domain;

namespace StreamerTinder.Api.Tests;

public class GameStateTests
{
    private static Pack TestPack(int cardCount = 10) =>
        new("test-pack", "Test", "¿Test?", null, null,
            Enumerable.Range(1, cardCount)
                .Select(i => new Card($"card-{i}", $"/img/{i}.png", null))
                .ToList());

    [Fact]
    public void New_state_is_idle()
    {
        var s = GameState.New();
        Assert.Equal(GamePhase.Idle, s.Phase);
    }

    [Fact]
    public void OpenLobby_transitions_idle_to_lobby_with_empty_players()
    {
        var s = GameState.New().OpenLobby(TestPack(), DateTime.UtcNow);
        Assert.Equal(GamePhase.Lobby, s.Phase);
        Assert.Empty(s.LobbyPlayers);
    }

    [Fact]
    public void OpenLobby_from_non_idle_throws()
    {
        var s = GameState.New().OpenLobby(TestPack(), DateTime.UtcNow);
        Assert.Throws<InvalidOperationException>(() => s.OpenLobby(TestPack(), DateTime.UtcNow));
    }

    [Fact]
    public void Join_adds_player_to_lobby()
    {
        var s = GameState.New().OpenLobby(TestPack(), DateTime.UtcNow)
            .Join("adri", DateTime.UtcNow, isBanned: false);
        Assert.Single(s.LobbyPlayers);
        Assert.Equal("adri", s.LobbyPlayers[0].Nick);
    }

    [Fact]
    public void Join_ignores_duplicates()
    {
        var t = DateTime.UtcNow;
        var s = GameState.New().OpenLobby(TestPack(), t)
            .Join("adri", t, false)
            .Join("adri", t, false);
        Assert.Single(s.LobbyPlayers);
    }

    [Fact]
    public void Join_ignores_banned_nick()
    {
        var s = GameState.New().OpenLobby(TestPack(), DateTime.UtcNow)
            .Join("troll", DateTime.UtcNow, isBanned: true);
        Assert.Empty(s.LobbyPlayers);
    }

    [Fact]
    public void Join_respects_hard_cap_60()
    {
        var s = GameState.New().OpenLobby(TestPack(), DateTime.UtcNow);
        for (int i = 0; i < 70; i++)
            s = s.Join($"user{i}", DateTime.UtcNow, false);
        Assert.Equal(GameState.LobbyMax, s.LobbyPlayers.Count);
    }

    [Fact]
    public void Leave_removes_player_from_lobby()
    {
        var s = GameState.New().OpenLobby(TestPack(), DateTime.UtcNow)
            .Join("adri", DateTime.UtcNow, false)
            .Join("lara", DateTime.UtcNow, false)
            .Leave("adri");
        Assert.Single(s.LobbyPlayers);
        Assert.Equal("lara", s.LobbyPlayers[0].Nick);
    }

    [Fact]
    public void VaciarLobby_empties_players_keeps_phase()
    {
        var s = GameState.New().OpenLobby(TestPack(), DateTime.UtcNow)
            .Join("adri", DateTime.UtcNow, false)
            .VaciarLobby(DateTime.UtcNow);
        Assert.Equal(GamePhase.Lobby, s.Phase);
        Assert.Empty(s.LobbyPlayers);
    }

    [Fact]
    public void Join_only_works_in_lobby_phase()
    {
        var s = GameState.New();
        var s2 = s.Join("adri", DateTime.UtcNow, false);
        Assert.Empty(s2.LobbyPlayers);
        Assert.Equal(GamePhase.Idle, s2.Phase);
    }

    [Fact]
    public void StartGame_requires_min_10_players()
    {
        var s = GameState.New().OpenLobby(TestPack(), DateTime.UtcNow);
        for (int i = 0; i < 9; i++) s = s.Join($"u{i}", DateTime.UtcNow, false);
        Assert.Throws<InvalidOperationException>(() => s.StartGame(DateTime.UtcNow));
    }

    [Fact]
    public void StartGame_transitions_to_card_phase_with_first_card_active()
    {
        var s = GameState.New().OpenLobby(TestPack(), DateTime.UtcNow);
        for (int i = 0; i < 10; i++) s = s.Join($"u{i}", DateTime.UtcNow, false);
        var now = DateTime.UtcNow;
        s = s.StartGame(now);
        Assert.Equal(GamePhase.Card, s.Phase);
        Assert.Equal(0, s.CardIndex);
        Assert.Equal(now.AddSeconds(GameState.CardSeconds), s.CardTimerEndsAt);
        Assert.Empty(s.CurrentCardVotes);
        Assert.Null(s.StreamerVote);
    }
}
