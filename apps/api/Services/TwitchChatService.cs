using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StreamerTinder.Api.Infrastructure;
using TwitchLib.Client;
using TwitchLib.Client.Enums;
using TwitchLib.Client.Events;
using TwitchLib.Client.Models;
using TwitchLib.Communication.Clients;
using TwitchLib.Communication.Models;

namespace StreamerTinder.Api.Services;

public sealed class TwitchChatService : BackgroundService
{
    private readonly TwitchOptions _opts;
    private readonly ChatCommandParser _parser;
    private readonly GameOrchestrator _orch;
    private readonly IServiceScopeFactory _scopes;
    private readonly ILogger<TwitchChatService> _log;
    private readonly ILoggerFactory _loggerFactory;
    private TwitchClient? _client;

    public TwitchChatService(
        IOptions<TwitchOptions> opts,
        ChatCommandParser parser,
        GameOrchestrator orch,
        IServiceScopeFactory scopes,
        ILogger<TwitchChatService> log,
        ILoggerFactory loggerFactory)
    {
        _opts = opts.Value;
        _parser = parser;
        _orch = orch;
        _scopes = scopes;
        _log = log;
        _loggerFactory = loggerFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_opts.Channel) || _opts.Channel == "your_channel_here")
        {
            _log.LogWarning("Twitch channel not configured. IRC service idle.");
            return;
        }

        var botNick = string.IsNullOrWhiteSpace(_opts.BotNick)
            ? $"justinfan{Random.Shared.Next(10000, 99999)}"
            : _opts.BotNick;

        var creds = new ConnectionCredentials(botNick, "");

        var wsOpts = new ClientOptions();
        var wsLogger = _loggerFactory.CreateLogger<WebSocketClient>();
        var ws = new WebSocketClient(wsOpts, wsLogger);

        _client = new TwitchClient(ws, ClientProtocol.WebSocket, loggerFactory: _loggerFactory);
        _client.Initialize(creds, _opts.Channel);

        _client.OnConnected += OnConnected;
        _client.OnDisconnected += OnDisconnected;
        _client.OnMessageReceived += OnMessage;

        await _client.ConnectAsync();
    }

    private Task OnConnected(object? sender, OnConnectedEventArgs e)
    {
        _log.LogInformation("Twitch IRC connected as {Bot} to {Channel}", e.BotUsername, _opts.Channel);
        return Task.CompletedTask;
    }

    private Task OnDisconnected(object? sender, OnDisconnectedArgs e)
    {
        _log.LogWarning("Twitch IRC disconnected (bot: {Bot})", e.BotUsername);
        return Task.CompletedTask;
    }

    private Task OnMessage(object? sender, OnMessageReceivedArgs e)
    {
        var nick = e.ChatMessage.Username;
        var msg = e.ChatMessage.Message;
        var cmd = _parser.Parse(msg);
        if (cmd is ChatCommand.Unknown) return Task.CompletedTask;

        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = _scopes.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                await _orch.HandleViewerCommandAsync(nick, cmd, db);
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Error handling chat command from {Nick}: {Msg}", nick, msg);
            }
        });

        return Task.CompletedTask;
    }

    public override async Task StopAsync(CancellationToken ct)
    {
        if (_client is not null)
        {
            try { await _client.DisconnectAsync(); } catch { /* swallow */ }
        }
        await base.StopAsync(ct);
    }
}
