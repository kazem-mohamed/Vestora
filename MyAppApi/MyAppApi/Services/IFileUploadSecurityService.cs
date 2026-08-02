namespace MyAppApi.Services
{
    public interface IFileUploadSecurityService
    {
        Task<ServiceResult<byte[]>> ReadValidatedImageAsync(IFormFile file);
    }
}
