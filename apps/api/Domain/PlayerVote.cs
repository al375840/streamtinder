namespace StreamerTinder.Api.Domain;

public sealed record PlayerVote(string Nick, VoteDirection Direction, DateTime VotedAt);
