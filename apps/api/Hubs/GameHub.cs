using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;
using StreamerTinder.Api.Domain;
using StreamerTinder.Api.Infrastructure;
using StreamerTinder.Api.Services;

namespace StreamerTinder.Api.Hubs;

public sealed class GameHub : Hub
{
    private readonly GameOrchestrator _orch;
    private readonly PackRepository _packs;
    private readonly IServiceScopeFactory _scopes;
    private readonly string _streamerChannel;

    public GameHub(GameOrchestrator orch, PackRepository packs, IServiceScopeFactory scopes,
                   IOptions<TwitchOptions> twitchOpts)
    {
        _orch = orch;
        _packs = packs;
        _scopes = scopes;
        _streamerChannel = twitchOpts.Value.Channel;
    }

    public override async Task OnConnectedAsync()
    {
        await base.OnConnectedAsync();
        await Clients.Caller.SendAsync("state", _orch.CurrentState);
    }

    public Task<IReadOnlyCollection<Pack>> ListPacks() =>
        Task.FromResult(_packs.GetAll());

    public async Task OpenLobby(string packId)
    {
        var pack = _packs.GetById(packId);
        if (pack is null) return;
        using var scope = _scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        // Streamer nick comes from the configured Twitch:Channel — no need to send it from the UI.
        await _orch.OpenLobbyAsync(pack, _streamerChannel, db);
    }

    public async Task ChangePack(string packId)
    {
        var pack = _packs.GetById(packId);
        if (pack is null) return;
        await _orch.ChangePackAsync(pack);
    }

    public Task StartGame() => _orch.StartGameAsync();

    public Task StreamerVote(string direction) =>
        _orch.StreamerVoteAsync(direction == "left" ? VoteDirection.Left : VoteDirection.Right);

    public Task CloseCard() => _orch.CloseCardAsync();

    public Task NextCard() => _orch.NextCardAsync();

    public Task EliminateTier(int tier) => _orch.EliminateTierAsync(tier);

    public async Task FinalizeCriba()
    {
        using var scope = _scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await _orch.FinalizeCribaAsync(db);
    }

    public async Task Ban(string nick)
    {
        using var scope = _scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await _orch.BanAsync(nick, db);
    }

    public Task VaciarLobby() => _orch.VaciarLobbyAsync();
}
