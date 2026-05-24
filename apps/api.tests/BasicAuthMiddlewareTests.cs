using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StreamerTinder.Api.Infrastructure;

namespace StreamerTinder.Api.Tests;

public class BasicAuthMiddlewareTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public BasicAuthMiddlewareTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting("StreamerPanel:User", "streamer");
            builder.UseSetting("StreamerPanel:Pass", "testpass");

            builder.ConfigureServices(services =>
            {
                // Reemplazar el DbContext real con InMemory para tests
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (descriptor != null) services.Remove(descriptor);
                services.AddDbContext<AppDbContext>(opt => opt.UseInMemoryDatabase("TestDb"));
            });
        });
    }

    [Fact]
    public async Task GET_streamer_without_credentials_returns_401()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/streamer");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.True(response.Headers.WwwAuthenticate.Any(h => h.Scheme == "Basic"));
    }

    [Fact]
    public async Task GET_streamer_with_valid_credentials_returns_200()
    {
        var client = _factory.CreateClient();
        var creds = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes("streamer:testpass"));
        client.DefaultRequestHeaders.Authorization = new("Basic", creds);

        var response = await client.GetAsync("/streamer");

        Assert.True(response.IsSuccessStatusCode, $"Expected success but got {response.StatusCode}");
    }
}
