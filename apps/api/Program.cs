using Microsoft.EntityFrameworkCore;
using StreamerTinder.Api.Endpoints;
using StreamerTinder.Api.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<TwitchOptions>(
    builder.Configuration.GetSection(TwitchOptions.SectionName));
builder.Services.Configure<StreamerPanelOptions>(
    builder.Configuration.GetSection(StreamerPanelOptions.SectionName));
builder.Services.Configure<DatabaseOptions>(
    builder.Configuration.GetSection(DatabaseOptions.SectionName));

var dbPath = builder.Configuration["Database:Path"] ?? "App_Data/game.db";
var dbFull = Path.Combine(builder.Environment.ContentRootPath, dbPath);
Directory.CreateDirectory(Path.GetDirectoryName(dbFull)!);

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlite($"Data Source={dbFull}"));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (db.Database.IsRelational())
        db.Database.Migrate();
    else
        db.Database.EnsureCreated();
}

app.UseMiddleware<BasicAuthMiddleware>();
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapGet("/streamer", () => Results.Ok("panel ok"));

app.MapLeaderboard();

app.MapFallbackToFile("index.html");

app.Run();

public partial class Program { }
