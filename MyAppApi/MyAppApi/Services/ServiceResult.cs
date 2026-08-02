namespace MyAppApi.Services
{
    public enum ServiceResultStatus
    {
        Ok,
        Created,
        NoContent,
        BadRequest,
        Unauthorized,
        Forbidden,
        NotFound
    }

    public sealed class ServiceResult<T>
    {
        private ServiceResult(ServiceResultStatus status, T? value, string? message)
        {
            Status = status;
            Value = value;
            Message = message;
        }

        public ServiceResultStatus Status { get; }

        public T? Value { get; }

        public string? Message { get; }

        public static ServiceResult<T> Ok(T value) => new(ServiceResultStatus.Ok, value, null);

        public static ServiceResult<T> Created(T value) => new(ServiceResultStatus.Created, value, null);

        public static ServiceResult<T> NoContent() => new(ServiceResultStatus.NoContent, default, null);

        public static ServiceResult<T> BadRequest(string message) => new(ServiceResultStatus.BadRequest, default, message);

        public static ServiceResult<T> Unauthorized(string message) => new(ServiceResultStatus.Unauthorized, default, message);

        public static ServiceResult<T> Forbidden() => new(ServiceResultStatus.Forbidden, default, null);

        public static ServiceResult<T> NotFound(string message) => new(ServiceResultStatus.NotFound, default, message);
    }
}
