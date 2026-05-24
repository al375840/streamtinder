using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StreamerTinder.Api.Infrastructure;

namespace StreamerTinder.Api.Tests;

public class LeaderboardEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public LeaderboardEndpointTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (descriptor != null) services.Remove(descriptor);
                services.AddDbContext<AppDbContext>(opt =>
                    opt.UseInMemoryDatabase("LeaderboardTestDb" + Guid.NewGuid()));
            });
        });
    }

    [Fact]
    public async Task GET_api_leaderboard_returns_empty_array_when_no_scores()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/leaderboard?limit=100&offset=0");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        Assert.True(root.TryGetProperty("rows", out var rows));
        Assert.Equal(JsonValueKind.Array, rows.ValueKind);
        Assert.Equal(0, rows.GetArrayLength());

        Assert.True(root.TryGetProperty("total", out var total));
        Assert.Equal(0, total.GetInt32());
    }
}
