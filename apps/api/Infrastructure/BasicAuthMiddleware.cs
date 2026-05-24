using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;

namespace StreamerTinder.Api.Infrastructure;

public sealed class BasicAuthMiddleware
{
    private readonly RequestDelegate _next;
    private readonly StreamerPanelOptions _opts;

    public BasicAuthMiddleware(RequestDelegate next, IOptions<StreamerPanelOptions> opts)
    {
        _next = next;
        _opts = opts.Value;
    }

    public async Task InvokeAsync(HttpContext ctx)
    {
        if (!ctx.Request.Path.StartsWithSegments("/streamer"))
        {
            await _next(ctx);
            return;
        }

        var header = ctx.Request.Headers.Authorization.ToString();
        if (AuthenticationHeaderValue.TryParse(header, out var auth)
            && auth.Scheme.Equals("Basic", StringComparison.OrdinalIgnoreCase)
            && auth.Parameter is not null)
        {
            var raw = Encoding.UTF8.GetString(Convert.FromBase64String(auth.Parameter));
            var sep = raw.IndexOf(':');
            if (sep > 0)
            {
                var user = raw[..sep];
                var pass = raw[(sep + 1)..];
                if (FixedTimeEquals(user, _opts.User) && FixedTimeEquals(pass, _opts.Pass))
                {
                    await _next(ctx);
                    return;
                }
            }
        }

        ctx.Response.StatusCode = 401;
        ctx.Response.Headers.WWWAuthenticate = "Basic realm=\"Streamer Tinder\"";
        await ctx.Response.WriteAsync("Unauthorized");
    }

    private static bool FixedTimeEquals(string a, string b)
    {
        var bytesA = Encoding.UTF8.GetBytes(a);
        var bytesB = Encoding.UTF8.GetBytes(b);
        return CryptographicOperations.FixedTimeEquals(bytesA, bytesB);
    }
}
