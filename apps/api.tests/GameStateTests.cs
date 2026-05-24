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

    private GameState StartedGame(int players = 10)
    {
        var s = GameState.New().OpenLobby(TestPack(), DateTime.UtcNow);
        for (int i = 0; i < players; i++) s = s.Join($"u{i}", DateTime.UtcNow, false);
        // StartGame requires LobbyMin; if caller asked for fewer "named" players,
        // top up with filler joiners so the game can start. The named u0..u(players-1)
        // are what the tests assert on.
        for (int i = players; i < GameState.LobbyMin; i++)
            s = s.Join($"filler{i}", DateTime.UtcNow, false);
        return s.StartGame(DateTime.UtcNow);
    }

    [Fact]
    public void StreamerVotes_records_vote()
    {
        var s = StartedGame().StreamerVotes(VoteDirection.Right);
        Assert.Equal(VoteDirection.Right, s.StreamerVote);
    }

    [Fact]
    public void ViewerVotes_records_first_vote_only()
    {
        var s = StartedGame()
            .ViewerVotes("u1", VoteDirection.Left, DateTime.UtcNow)
            .ViewerVotes("u1", VoteDirection.Right, DateTime.UtcNow);
        Assert.Single(s.CurrentCardVotes);
        Assert.Equal(VoteDirection.Left, s.CurrentCardVotes["u1"].Direction);
    }

    [Fact]
    public void ViewerVotes_only_counts_for_players_in_lobby()
    {
        var s = StartedGame().ViewerVotes("non-player", VoteDirection.Left, DateTime.UtcNow);
        Assert.Empty(s.CurrentCardVotes);
    }

    [Fact]
    public void CloseCard_resolves_aciertos_for_matching_votes()
    {
        var s = StartedGame();
        s = s.StreamerVotes(VoteDirection.Right);
        s = s.ViewerVotes("u0", VoteDirection.Right, DateTime.UtcNow); // hit
        s = s.ViewerVotes("u1", VoteDirection.Left, DateTime.UtcNow);  // miss
        s = s.CloseCard();
        Assert.Equal(GamePhase.CardReveal, s.Phase);
        Assert.Equal(1, s.AciertosByNick["u0"]);
        Assert.Equal(0, s.AciertosByNick["u1"]);
    }

    [Fact]
    public void CloseCard_when_streamer_did_not_vote_cancels_card()
    {
        var s = StartedGame();
        s = s.ViewerVotes("u0", VoteDirection.Right, DateTime.UtcNow);
        s = s.CloseCard();
        Assert.Equal(GamePhase.CardReveal, s.Phase);
        Assert.Equal(0, s.AciertosByNick["u0"]);
    }

    [Fact]
    public void NextCard_advances_index_back_to_Card()
    {
        var s = StartedGame().StreamerVotes(VoteDirection.Right).CloseCard()
            .NextCard(DateTime.UtcNow);
        Assert.Equal(GamePhase.Card, s.Phase);
        Assert.Equal(1, s.CardIndex);
        Assert.Null(s.StreamerVote);
        Assert.Empty(s.CurrentCardVotes);
    }

    [Fact]
    public void NextCard_after_last_card_goes_to_TallyTransition()
    {
        var s = StartedGame();
        for (int i = 0; i < 10; i++)
            s = s.StreamerVotes(VoteDirection.Right).CloseCard().NextCard(DateTime.UtcNow);
        Assert.Equal(GamePhase.TallyTransition, s.Phase);
    }

    [Fact]
    public void EnterCriba_from_TallyTransition()
    {
        var s = StartedGame();
        for (int i = 0; i < 10; i++)
            s = s.StreamerVotes(VoteDirection.Right).CloseCard().NextCard(DateTime.UtcNow);
        s = s.EnterCriba();
        Assert.Equal(GamePhase.Criba, s.Phase);
    }

    [Fact]
    public void EliminateTier_marks_tier_as_dead()
    {
        var s = StartedGame();
        for (int i = 0; i < 10; i++)
            s = s.StreamerVotes(VoteDirection.Right).CloseCard().NextCard(DateTime.UtcNow);
        s = s.EnterCriba().EliminateTier(0).EliminateTier(3);
        Assert.Contains(0, s.EliminatedTiers);
        Assert.Contains(3, s.EliminatedTiers);
    }

    [Fact]
    public void EliminateTier_is_idempotent()
    {
        var s = StartedGame();
        for (int i = 0; i < 10; i++)
            s = s.StreamerVotes(VoteDirection.Right).CloseCard().NextCard(DateTime.UtcNow);
        s = s.EnterCriba().EliminateTier(0).EliminateTier(0);
        Assert.Single(s.EliminatedTiers);
    }

    [Fact]
    public void FinalizeCriba_returns_survivors_with_bonus_distributed()
    {
        // 4 jugadores: u0 acierta 10, u1 acierta 7, u2 acierta 3, u3 acierta 0
        var s = StartedGame(players: 4);
        for (int i = 0; i < 10; i++)
        {
            s = s.StreamerVotes(VoteDirection.Right);
            if (i < 10) s = s.ViewerVotes("u0", VoteDirection.Right, DateTime.UtcNow);
            if (i < 7)  s = s.ViewerVotes("u1", VoteDirection.Right, DateTime.UtcNow);
            if (i < 3)  s = s.ViewerVotes("u2", VoteDirection.Right, DateTime.UtcNow);
            s = s.CloseCard().NextCard(DateTime.UtcNow);
        }
        // Eliminar tiers 0,1,2,3 → sobreviven u0(10 aciertos) y u1(7)
        s = s.EnterCriba()
            .EliminateTier(0).EliminateTier(1).EliminateTier(2).EliminateTier(3);

        var result = s.FinalizeCriba();
        Assert.Equal(GamePhase.Victory, result.State.Phase);
        Assert.Equal(2, result.Survivors.Count);
        Assert.All(result.Survivors, w => Assert.Equal(50, w.Bonus));
        var u0 = result.Survivors.First(w => w.Nick == "u0");
        Assert.Equal(10 * 10 + 50, u0.TotalPoints);
    }

    [Fact]
    public void FinalizeCriba_with_no_survivors_returns_empty()
    {
        var s = StartedGame(players: 2);
        for (int i = 0; i < 10; i++)
            s = s.StreamerVotes(VoteDirection.Right).CloseCard().NextCard(DateTime.UtcNow);
        s = s.EnterCriba();
        for (int t = 0; t <= 10; t++) s = s.EliminateTier(t);
        var result = s.FinalizeCriba();
        Assert.Empty(result.Survivors);
    }
}
