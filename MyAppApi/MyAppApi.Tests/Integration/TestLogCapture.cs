using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;

namespace MyAppApi.Tests.Integration
{
    /// <summary>
    /// Captures Error-level log lines (and their exceptions) from the in-process test
    /// server, for the rare case a test needs to see what the production exception
    /// handler deliberately hid from the HTTP response. Not used by assertions — only
    /// by test authors debugging an unexpected 500.
    /// </summary>
    public static class TestLogCapture
    {
        public static readonly ConcurrentQueue<string> Errors = new();

        public class Provider : ILoggerProvider
        {
            public ILogger CreateLogger(string categoryName) => new CapturingLogger();
            public void Dispose() { }
        }

        private class CapturingLogger : ILogger
        {
            public IDisposable BeginScope<TState>(TState state) where TState : notnull => NullScope.Instance;
            public bool IsEnabled(LogLevel logLevel) => logLevel >= LogLevel.Error;

            public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception,
                Func<TState, Exception?, string> formatter)
            {
                if (!IsEnabled(logLevel)) return;
                Errors.Enqueue($"{formatter(state, exception)}\n{exception}");
            }
        }

        private class NullScope : IDisposable
        {
            public static readonly NullScope Instance = new();
            public void Dispose() { }
        }
    }
}
