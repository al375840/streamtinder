using Microsoft.EntityFrameworkCore;
using StreamerTinder.Api.Infrastructure;

namespace StreamerTinder.Api.Endpoints;

public static class LeaderboardEndpoints
{
    public static void MapLeaderboard(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/leaderboard", async (AppDbContext db, int limit = 100, int offset = 0) =>
        {
            var query = db.Scores.OrderByDescending(s => s.TotalPoints);
            var total = await query.CountAsync();
            var rows = await query
                .Skip(offset)
                .Take(Math.Min(limit, 200))
                .Select(s => new
                {
                    rank = 0, // calculado en memoria abajo
                    nick = s.TwitchUsername,
                    points = s.TotalPoints,
                    games = s.GamesPlayed,
                    wins = s.GamesWon,
                    last_played_at = s.LastPlayedAt
                })
                .ToListAsync();

            // Asignar rank en memoria
            var rankedRows = rows.Select((r, i) => new
            {
                rank = offset + i + 1,
                r.nick,
                r.points,
                r.games,
                r.wins,
                r.last_played_at
            }).ToList();

            return Results.Ok(new { rows = rankedRows, total });
        });

        app.MapGet("/api/leaderboard/me", async (AppDbContext db, string nick) =>
        {
            var score = await db.Scores
                .FirstOrDefaultAsync(s => s.TwitchUsername == nick);
            if (score is null) return Results.NotFound();

            var rank = await db.Scores.CountAsync(s => s.TotalPoints > score.TotalPoints) + 1;
            return Results.Ok(new
            {
                rank,
                points = score.TotalPoints,
                games = score.GamesPlayed,
                wins = score.GamesWon
            });
        });
    }
}
