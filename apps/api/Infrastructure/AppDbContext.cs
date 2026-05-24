using Microsoft.EntityFrameworkCore;
using StreamerTinder.Api.Domain;

namespace StreamerTinder.Api.Infrastructure;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<PersistedScore> Scores => Set<PersistedScore>();
    public DbSet<PersistedBan> Bans => Set<PersistedBan>();
    public DbSet<PersistedGame> Games => Set<PersistedGame>();
    public DbSet<PersistedGameParticipant> GameParticipants => Set<PersistedGameParticipant>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<PersistedScore>().HasKey(s => s.TwitchUsername);
        b.Entity<PersistedBan>().HasKey(s => s.TwitchUsername);
        b.Entity<PersistedGame>().HasKey(g => g.Id);
        b.Entity<PersistedGameParticipant>()
            .HasKey(p => new { p.GameId, p.TwitchUsername });
        b.Entity<PersistedGame>()
            .HasMany(g => g.Participants)
            .WithOne()
            .HasForeignKey(p => p.GameId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
