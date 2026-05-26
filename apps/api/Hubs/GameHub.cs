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
    private readonly bool _devEnabled;

    public GameHub(GameOrchestrator orch, PackRepository packs, IServiceScopeFactory scopes,
                   IOptions<TwitchOptions> twitchOpts, StreamerSessionService session,
                   IWebHostEnvironment env)
    {
        _orch = orch;
        _packs = packs;
        _scopes = scopes;
        _streamerChannel = twitchOpts.Value.Channel;
        _session = session;
        _devEnabled = env.IsDevelopment();
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

    // ── Dev tools (only available when ASPNETCORE_ENVIRONMENT=Development) ──
    // The client gates the UI on `?dev=1`, but the server is the source of truth:
    // even if a malicious client crafts the call, it gets rejected in production.

    public async Task DevAddFakePlayers(int count)
    {
        EnsureStreamer();
        EnsureDevelopment();
        if (count is < 1 or > 60) throw new HubException("Count must be 1-60");

        using var scope = _scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var rng = Random.Shared;
        for (var i = 0; i < count; i++)
        {
            var nick = $"bot_{rng.Next(0x10000):x4}_{i}";
            await _orch.HandleViewerCommandAsync(nick, new ChatCommand.Join(), db);
        }
    }

    public async Task DevAutoVote(int leftBiasPercent)
    {
        EnsureStreamer();
        EnsureDevelopment();
        if (leftBiasPercent is < 0 or > 100) throw new HubException("Bias must be 0-100");

        using var scope = _scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var state = _orch.CurrentState;
        var rng = Random.Shared;

        // Only vote for players who haven't voted on the current card yet.
        var pending = state.AciertosByNick.Keys
            .Where(n => !state.CurrentCardVotes.ContainsKey(n))
            .ToList();

        foreach (var nick in pending)
        {
            var dir = rng.Next(100) < leftBiasPercent ? VoteDirection.Left : VoteDirection.Right;
            await _orch.HandleViewerCommandAsync(nick, new ChatCommand.Vote(dir), db);
        }
    }

    // ── Guards & validators ──────────────────────────────────────────────────

    private void EnsureDevelopment()
    {
        if (!_devEnabled)
            throw new HubException("Dev tools disabled (only available in Development)");
    }

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
