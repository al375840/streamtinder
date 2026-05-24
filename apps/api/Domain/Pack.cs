namespace StreamerTinder.Api.Domain;

public sealed record Pack(
    string Id,
    string Name,
    string Question,
    string? PalettePrimary,
    string? PaletteAccent,
    IReadOnlyList<Card> Cards);
