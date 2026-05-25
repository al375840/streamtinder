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
    private readonly StreamerSessionService _session;

    public GameHub(GameOrchestrator orch, PackRepository packs, IServiceScopeFactory scopes,
                   IOptions<TwitchOptions> twitchOpts, StreamerSessionService session)
    {
        _orch = orch;
        _packs = packs;
        _scopes = scopes;
        _streamerChannel = twitchOpts.Value.Channel;
        _session = session;
    }

    public override async Task OnConnectedAsync()
    {
        // Browsers cannot set custom headers on WebSocket connections, so we use an
        // HTTP-only session cookie set by BasicAuthMiddleware when the /streamer page
        // is loaded. That cookie IS sent on the WebSocket upgrade (same-origin policy).
        var cookie = Context.GetHttpContext()?.Request.Cookies[StreamerSessionService.CookieName];
        if (_session.IsValid(cookie))
            Context.Items["IsStreamer"] = true;

        await base.OnConnectedAsync();
        await Clients.Caller.SendAsync("state", _orch.CurrentState);
    }

    // ── Read-only (no auth required) ─────────────────────────────────────────

    public Task<IReadOnlyCollection<Pack>> ListPacks() =>
        Task.FromResult(_packs.GetAll());

    // ── Streamer-only mutations ───────────────────────────────────────────────

    public async Task OpenLobby(string packId)
    {
        EnsureStreamer();
        var pack = ResolvePackOrThrow(packId);
        using var scope = _scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        try { await _orch.OpenLobbyAsync(pack, _streamerChannel, db); }
        catch (InvalidOperationException ex) { throw new HubException(ex.Message); }
    }

    public async Task ChangePack(string packId)
    {
        EnsureStreamer();
        var pack = ResolvePackOrThrow(packId);
        await _orch.ChangePackAsync(pack);
    }

    public async Task StartGame()
    {
        EnsureStreamer();
        try { await _orch.StartGameAsync(); }
        catch (InvalidOperationException ex) { throw new HubException(ex.Message); }
    }

    public Task StreamerVote(string direction)
    {
        EnsureStreamer();
        if (direction is not ("left" or "right"))
            throw new HubException("Invalid direction — expected \"left\" or \"right\"");
        return _orch.StreamerVoteAsync(direction == "left" ? VoteDirection.Left : VoteDirection.Right);
    }

    public Task CloseCard()
    {
        EnsureStreamer();
        return _orch.CloseCardAsync();
    }

    public Task NextCard()
    {
        EnsureStreamer();
        return _orch.NextCardAsync();
    }

    public Task EliminateTier(int tier)
    {
        EnsureStreamer();
        if (tier is < 0 or > 10)
            throw new HubException("Tier must be between 0 and 10");
        return _orch.EliminateTierAsync(tier);
    }

    public async Task FinalizeCriba()
    {
        EnsureStreamer();
        using var scope = _scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        try { await _orch.FinalizeCribaAsync(db); }
        catch (InvalidOperationException ex) { throw new HubException(ex.Message); }
    }

    public async Task Ban(string nick)
    {
        EnsureStreamer();
        ValidateNick(nick);
        using var scope = _scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await _orch.BanAsync(nick, db);
    }

    public Task VaciarLobby()
    {
        EnsureStreamer();
        return _orch.VaciarLobbyAsync();
    }

    // ── Guards & validators ──────────────────────────────────────────────────

    private void EnsureStreamer()
    {
        if (!Context.Items.ContainsKey("IsStreamer"))
            throw new HubException("Unauthorized");
    }

    /// <summary>
    /// Validates packId format before hitting the dictionary to avoid log noise
    /// from malformed input. Allowed: ASCII letters, digits, hyphens, underscores, 1-64 chars.
    /// </summary>
    private Pack ResolvePackOrThrow(string packId)
    {
        if (string.IsNullOrEmpty(packId) || packId.Length > 64
            || !packId.All(c => char.IsAsciiLetterOrDigit(c) || c == '-' || c == '_'))
            throw new HubException("Invalid pack id");

        return _packs.GetById(packId)
               ?? throw new HubException($"Pack '{packId}' not found");
    }

    /// <summary>Twitch nicks: 1-25 chars, ASCII letters/digits/underscores.</summary>
    private static void ValidateNick(string nick)
    {
        if (string.IsNullOrWhiteSpace(nick) || nick.Length > 25
            || !nick.All(c => char.IsAsciiLetterOrDigit(c) || c == '_'))
            throw new HubException("Invalid nick — Twitch nicks are 1-25 alphanumeric/underscore chars");
    }
}
