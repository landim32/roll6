using System.Diagnostics;

namespace Roll6.API.Extensions;

/// <summary>
/// One log line per request (method, path, status, time, client IP): 2xx/3xx as Information, 4xx as Warning and 5xx
/// as Error. Only the path is logged — never the query string (the SignalR token travels there) nor bodies.
/// </summary>
public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var started = Stopwatch.GetTimestamp();
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "HTTP {Method} {Path} failed after {Elapsed:0} ms (client {ClientIp})",
                context.Request.Method, context.Request.Path.Value, Stopwatch.GetElapsedTime(started).TotalMilliseconds,
                context.Connection.RemoteIpAddress);
            throw;
        }

        var status = context.Response.StatusCode;
        var level = status >= 500 ? LogLevel.Error : status >= 400 ? LogLevel.Warning : LogLevel.Information;
        _logger.Log(level, "HTTP {Method} {Path} responded {StatusCode} in {Elapsed:0} ms (client {ClientIp})",
            context.Request.Method, context.Request.Path.Value, status, Stopwatch.GetElapsedTime(started).TotalMilliseconds,
            context.Connection.RemoteIpAddress);
    }
}
