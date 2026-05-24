namespace StreamerTinder.Api.Infrastructure;

public sealed class StreamerPanelOptions
{
    public const string SectionName = "StreamerPanel";

    public string User { get; init; } = "";
    public string Pass { get; init; } = "";
}
