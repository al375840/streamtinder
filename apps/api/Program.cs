using StreamerTinder.Api.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<TwitchOptions>(
    builder.Configuration.GetSection(TwitchOptions.SectionName));
builder.Services.Configure<StreamerPanelOptions>(
    builder.Configuration.GetSection(StreamerPanelOptions.SectionName));
builder.Services.Configure<DatabaseOptions>(
    builder.Configuration.GetSection(DatabaseOptions.SectionName));

var app = builder.Build();

app.UseMiddleware<BasicAuthMiddleware>();
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapGet("/streamer", () => Results.Ok("panel ok"));

app.MapFallbackToFile("index.html");

app.Run();

public partial class Program { }
