using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace MyAppApi.Services
{
    /// <summary>
    /// SQL Server round-trips datetime2 with Kind=Unspecified, so timestamps the app
    /// stores as UtcNow serialize without a timezone marker and browsers read them as
    /// local time. Every DateTime the app persists is UTC, so tag it as such on the wire.
    /// </summary>
    public class UtcDateTimeConverter : JsonConverter<DateTime>
    {
        public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            var value = reader.GetDateTime();
            return value.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(value, DateTimeKind.Utc)
                : value.ToUniversalTime();
        }

        public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
        {
            var utc = value.Kind switch
            {
                DateTimeKind.Utc => value,
                DateTimeKind.Local => value.ToUniversalTime(),
                _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
            };
            writer.WriteStringValue(utc.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"));
        }
    }

    public class UtcNullableDateTimeConverter : JsonConverter<DateTime?>
    {
        private static readonly UtcDateTimeConverter Inner = new();

        public override DateTime? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Null) return null;
            return Inner.Read(ref reader, typeof(DateTime), options);
        }

        public override void Write(Utf8JsonWriter writer, DateTime? value, JsonSerializerOptions options)
        {
            if (value is null) writer.WriteNullValue();
            else Inner.Write(writer, value.Value, options);
        }
    }
}
