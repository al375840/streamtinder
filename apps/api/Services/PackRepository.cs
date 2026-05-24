using System.Text.Json;
using StreamerTinder.Api.Domain;

namespace StreamerTinder.Api.Services;

public sealed class PackRepository
{
    private readonly string _baseDir;
    private readonly Dictionary<string, Pack> _packs = new();

    public PackRepository(string baseDir) => _baseDir = baseDir;

    public async Task LoadAllAsync()
    {
        var dir = Path.Combine(_baseDir, "Packs");
        if (!Directory.Exists(dir)) return;
        foreach (var file in Directory.GetFiles(dir, "*.json"))
        {
            await using var fs = File.OpenRead(file);
            var dto = await JsonSerializer.DeserializeAsync<PackDto>(fs, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
            if (dto is null) continue;
            _packs[dto.Id] = new Pack(
                dto.Id, dto.Name, dto.Question,
                dto.PalettePrimary, dto.PaletteAccent,
                dto.Cards.Select(c => new Card(c.Id, c.ImagePath, c.Subtitle)).ToList());
        }
    }

    public IReadOnlyCollection<Pack> GetAll() => _packs.Values;
    public Pack? GetById(string id) => _packs.GetValueOrDefault(id);

    private sealed record PackDto(
        string Id, string Name, string Question,
        string? PalettePrimary, string? PaletteAccent,
        List<CardDto> Cards);
    private sealed record CardDto(string Id, string ImagePath, string? Subtitle);
}
