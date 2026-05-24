namespace StreamerTinder.Api.Infrastructure;

public sealed class DatabaseOptions
{
    public const string SectionName = "Database";

    public string Path { get; init; } = "App_Data/game.db";
}
