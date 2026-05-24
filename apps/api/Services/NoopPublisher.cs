using StreamerTinder.Api.Domain;

namespace StreamerTinder.Api.Services;

public sealed class NoopPublisher : IGameStatePublisher
{
    public Task PublishStateAsync(GameState s, CancellationToken ct = default) => Task.CompletedTask;
    public Task PublishWinnersAsync(IReadOnlyList<GameWinner> w, CancellationToken ct = default) => Task.CompletedTask;
}
