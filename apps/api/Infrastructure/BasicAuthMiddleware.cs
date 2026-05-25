using Microsoft.Extensions.Options;

namespace StreamerTinder.Api.Infrastructure;

public sealed class BasicAuthMiddleware
{
    private readonly RequestDelegate _next;
    private readonly StreamerPanelOptions _opts;
    private readonly StreamerSessionService _session;

    public BasicAuthMiddleware(RequestDelegate next, IOptions<StreamerPanelOptions> opts,
                               StreamerSessionService session)
    {
        _next = next;
        _opts = opts.Value;
        _session = session;
    }

    public async Task InvokeAsync(HttpContext ctx)
    {
        if (!ctx.Request.Path.StartsWithSegments("/streamer"))
        {
            await _next(ctx);
            return;
        }

        if (BasicAuthValidator.TryValidate(ctx, _opts))
        {
            // Refresh the session cookie on every successful page load so the
            // streamer's WebSocket connections can authenticate without knowing
            // the raw credentials (browsers cannot set custom headers on WebSocket).
            _session.AppendCookie(ctx.Response);
            await _next(ctx);
            return;
        }

        ctx.Response.StatusCode = 401;
        ctx.Response.Headers.WWWAuthenticate = "Basic realm=\"Streamer Tinder\"";
        await ctx.Response.WriteAsync("Unauthorized");
    }
}
