using Microsoft.Extensions.Options;
using MyAppApi.Settings;

namespace MyAppApi.Services
{
    public class FileUploadSecurityService : IFileUploadSecurityService
    {
        private static readonly Dictionary<string, string[]> AllowedExtensionsByContentType = new(StringComparer.OrdinalIgnoreCase)
        {
            ["image/jpeg"] = new[] { ".jpg", ".jpeg" },
            ["image/png"] = new[] { ".png" },
            ["image/gif"] = new[] { ".gif" },
            ["image/bmp"] = new[] { ".bmp" }
        };

        private readonly FileUploadSecuritySettings _settings;

        public FileUploadSecurityService(IOptions<FileUploadSecuritySettings> settings)
        {
            _settings = settings.Value;
        }

        public async Task<ServiceResult<byte[]>> ReadValidatedImageAsync(IFormFile file)
        {
            if (file.Length <= 0)
            {
                return ServiceResult<byte[]>.BadRequest("Uploaded image is empty.");
            }

            if (file.Length > _settings.MaxImageBytes)
            {
                return ServiceResult<byte[]>.BadRequest($"Image exceeds the maximum size of {_settings.MaxImageBytes} bytes.");
            }

            if (!_settings.AllowedImageContentTypes.Contains(file.ContentType, StringComparer.OrdinalIgnoreCase))
            {
                return ServiceResult<byte[]>.BadRequest("Image content type is not allowed.");
            }

            var extension = Path.GetExtension(file.FileName);
            if (!AllowedExtensionsByContentType.TryGetValue(file.ContentType, out var allowedExtensions) ||
                string.IsNullOrWhiteSpace(extension) ||
                !allowedExtensions.Contains(extension, StringComparer.OrdinalIgnoreCase))
            {
                return ServiceResult<byte[]>.BadRequest("Image file extension does not match its content type.");
            }

            using var memoryStream = new MemoryStream();
            await file.CopyToAsync(memoryStream);
            var bytes = memoryStream.ToArray();

            if (!HasValidImageSignature(file.ContentType, bytes))
            {
                return ServiceResult<byte[]>.BadRequest("Image signature is invalid.");
            }

            return ServiceResult<byte[]>.Ok(bytes);
        }

        private static bool HasValidImageSignature(string contentType, byte[] bytes)
        {
            return contentType.ToLowerInvariant() switch
            {
                "image/jpeg" => bytes.Length >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF,
                "image/png" => bytes.Length >= 8 &&
                               bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47 &&
                               bytes[4] == 0x0D && bytes[5] == 0x0A && bytes[6] == 0x1A && bytes[7] == 0x0A,
                "image/gif" => bytes.Length >= 6 &&
                               bytes[0] == 0x47 && bytes[1] == 0x49 && bytes[2] == 0x46 &&
                               bytes[3] == 0x38 && (bytes[4] == 0x37 || bytes[4] == 0x39) && bytes[5] == 0x61,
                "image/bmp" => bytes.Length >= 2 && bytes[0] == 0x42 && bytes[1] == 0x4D,
                _ => false
            };
        }
    }
}
