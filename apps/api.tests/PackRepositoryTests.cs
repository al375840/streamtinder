using StreamerTinder.Api.Services;

namespace StreamerTinder.Api.Tests;

public class PackRepositoryTests
{
    [Fact]
    public async Task LoadAll_returns_at_least_one_pack_with_10_cards()
    {
        var repo = new PackRepository(AppContext.BaseDirectory);
        await repo.LoadAllAsync();
        var packs = repo.GetAll();
        Assert.NotEmpty(packs);
        Assert.All(packs, p => Assert.Equal(10, p.Cards.Count));
    }

    [Fact]
    public async Task GetById_returns_specific_pack()
    {
        var repo = new PackRepository(AppContext.BaseDirectory);
        await repo.LoadAllAsync();
        var pack = repo.GetById("rpgs-clasicos");
        Assert.NotNull(pack);
        Assert.Equal("RPGs Clásicos", pack!.Name);
    }
}
