namespace StreamerTinder.Api.Domain;

public sealed record GameWinner(string Nick, int Aciertos, int Bonus, int TotalPoints);
public sealed record CribaResult(GameState State, IReadOnlyList<GameWinner> Survivors);
