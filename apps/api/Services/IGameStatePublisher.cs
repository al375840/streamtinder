using StreamerTinder.Api.Domain;

namespace StreamerTinder.Api.Services;

public interface IGameStatePublisher
{
    Task PublishStateAsync(GameState state, CancellationToken ct = default);
    Task PublishWinnersAsync(IReadOnlyList<GameWinner> winners, CancellationToken ct = default);
}
