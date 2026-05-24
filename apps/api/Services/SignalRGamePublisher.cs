using Microsoft.AspNetCore.SignalR;
using StreamerTinder.Api.Domain;
using StreamerTinder.Api.Hubs;

namespace StreamerTinder.Api.Services;

public sealed class SignalRGamePublisher : IGameStatePublisher
{
    private readonly IHubContext<GameHub> _hub;

    public SignalRGamePublisher(IHubContext<GameHub> hub) => _hub = hub;

    public Task PublishStateAsync(GameState s, CancellationToken ct = default) =>
        _hub.Clients.All.SendAsync("state", s, ct);

    public Task PublishWinnersAsync(IReadOnlyList<GameWinner> winners, CancellationToken ct = default) =>
        _hub.Clients.All.SendAsync("winners", winners, ct);
}
