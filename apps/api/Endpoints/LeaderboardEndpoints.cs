using Microsoft.EntityFrameworkCore;
using StreamerTinder.Api.Infrastructure;

namespace StreamerTinder.Api.Endpoints;

public static class LeaderboardEndpoints
{
    public static void MapLeaderboard(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/leaderboard", async (AppDbContext db, int limit = 100, int offset = 0) =>
        {
            // Clamp parameters defensively — negative offset causes SQL errors;
            // unbounded limit would dump the entire table.
            offset = Math.Max(0, offset);
            limit = Math.Clamp(limit, 1, 200);

            var query = db.Scores.OrderByDescending(s => s.TotalPoints);
            var total = await query.CountAsync();
            var rows = await query
                .Skip(offset)
                .Take(limit)
                .Select(s => new
                {
                    rank = 0, // calculated in-memory below
                    nick = s.TwitchUsername,
                    points = s.TotalPoints,
                    games = s.GamesPlayed,
                    wins = s.GamesWon,
                    last_played_at = s.LastPlayedAt
                })
                .ToListAsync();

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
            // Reject malformed nicks early — avoids a pointless DB round-trip and
            // prevents log noise from bots probing the endpoint.
            if (string.IsNullOrWhiteSpace(nick) || nick.Length > 25
                || !nick.All(c => char.IsAsciiLetterOrDigit(c) || c == '_'))
                return Results.BadRequest("Invalid nick");

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
