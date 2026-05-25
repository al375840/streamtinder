using System.Security.Cryptography;
using Microsoft.AspNetCore.Http;

namespace StreamerTinder.Api.Infrastructure;

/// <summary>
/// Holds a random per-process session token.
/// <see cref="BasicAuthMiddleware"/> sets it as an HTTP-only cookie after successful
/// Basic Auth. <see cref="Hubs.GameHub"/> reads the same cookie to identify
/// streamer connections — bridges HTTP Basic Auth with the WebSocket handshake,
/// where browsers cannot send custom headers.
/// </summary>
public sealed class StreamerSessionService
{
    public const string CookieName = "st_ses";

    private readonly string _token =
        Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();

    /// <summary>Returns true iff <paramref name="value"/> matches the current session token.</summary>
    public bool IsValid(string? value) =>
        !string.IsNullOrEmpty(value)
        && CryptographicOperations.FixedTimeEquals(
            System.Text.Encoding.UTF8.GetBytes(value),
            System.Text.Encoding.UTF8.GetBytes(_token));

    /// <summary>Appends the session cookie to <paramref name="response"/>.</summary>
    public void AppendCookie(HttpResponse response) =>
        response.Cookies.Append(CookieName, _token, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Strict,
            Path = "/",
            MaxAge = TimeSpan.FromHours(8)
            // Secure intentionally omitted: the app is always accessed over HTTPS
            // in production (enforced at the infrastructure level). Setting it here
            // would break local HTTP development without any security gain.
        });
}
