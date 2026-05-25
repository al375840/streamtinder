using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Http;

namespace StreamerTinder.Api.Infrastructure;

/// <summary>
/// Validates Basic Auth credentials in constant time. Shared between the HTTP
/// middleware that protects /streamer and the SignalR hub that needs to know
/// whether the connecting client is the authenticated streamer.
/// </summary>
public static class BasicAuthValidator
{
    /// <summary>
    /// Returns true if the request carries valid Basic credentials matching the configured streamer.
    /// Safe against malformed headers and base64 — never throws.
    /// </summary>
    public static bool TryValidate(HttpContext ctx, StreamerPanelOptions opts)
    {
        if (string.IsNullOrEmpty(opts.User) || string.IsNullOrEmpty(opts.Pass))
            return false;

        var header = ctx.Request.Headers.Authorization.ToString();
        if (!AuthenticationHeaderValue.TryParse(header, out var auth)) return false;
        if (!auth.Scheme.Equals("Basic", StringComparison.OrdinalIgnoreCase)) return false;
        if (auth.Parameter is null) return false;

        try
        {
            var raw = Encoding.UTF8.GetString(Convert.FromBase64String(auth.Parameter));
            var sep = raw.IndexOf(':');
            if (sep <= 0) return false;
            return FixedTimeEquals(raw[..sep], opts.User)
                && FixedTimeEquals(raw[(sep + 1)..], opts.Pass);
        }
        catch (FormatException) { return false; }
    }

    private static bool FixedTimeEquals(string a, string b)
    {
        var bytesA = Encoding.UTF8.GetBytes(a);
        var bytesB = Encoding.UTF8.GetBytes(b);
        return CryptographicOperations.FixedTimeEquals(bytesA, bytesB);
    }
}
