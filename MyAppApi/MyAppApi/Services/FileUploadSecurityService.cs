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
            ["image/bmp"] = new[] { ".bmp" },
            ["application/pdf"] = new[] { ".pdf" },
            ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"] = new[] { ".docx" },
            ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"] = new[] { ".xlsx" },
            ["application/vnd.openxmlformats-officedocument.presentationml.presentation"] = new[] { ".pptx" }
        };

        private readonly FileUploadSecuritySettings _settings;

        public FileUploadSecurityService(IOptions<FileUploadSecuritySettings> settings)
        {
            _settings = settings.Value;
        }

        public Task<ServiceResult<byte[]>> ReadValidatedImageAsync(IFormFile file)
        {
            return ReadValidatedAsync(file, _settings.AllowedImageContentTypes, _settings.MaxImageBytes, "Image");
        }

        public Task<ServiceResult<byte[]>> ReadValidatedAttachmentAsync(IFormFile file)
        {
            var allowed = _settings.AllowedImageContentTypes
                .Concat(_settings.AllowedDocumentContentTypes)
                .ToArray();

            // An image sent as a chat attachment is still bounded by the image
            // limit; only the document formats get the larger ceiling. Otherwise
            // widening this endpoint would quietly raise the cap on photos too.
            var isDocument = _settings.AllowedDocumentContentTypes
                .Contains(file.ContentType, StringComparer.OrdinalIgnoreCase);

            return ReadValidatedAsync(
                file,
                allowed,
                isDocument ? _settings.MaxDocumentBytes : _settings.MaxImageBytes,
                "File");
        }

        private static async Task<ServiceResult<byte[]>> ReadValidatedAsync(
            IFormFile file,
            string[] allowedContentTypes,
            long maxBytes,
            string noun)
        {
            if (file.Length <= 0)
            {
                return ServiceResult<byte[]>.BadRequest($"Uploaded {noun.ToLowerInvariant()} is empty.");
            }

            if (file.Length > maxBytes)
            {
                return ServiceResult<byte[]>.BadRequest($"{noun} exceeds the maximum size of {maxBytes} bytes.");
            }

            if (!allowedContentTypes.Contains(file.ContentType, StringComparer.OrdinalIgnoreCase))
            {
                return ServiceResult<byte[]>.BadRequest($"{noun} content type is not allowed.");
            }

            var extension = Path.GetExtension(file.FileName);
            if (!AllowedExtensionsByContentType.TryGetValue(file.ContentType, out var allowedExtensions) ||
                string.IsNullOrWhiteSpace(extension) ||
                !allowedExtensions.Contains(extension, StringComparer.OrdinalIgnoreCase))
            {
                return ServiceResult<byte[]>.BadRequest($"{noun} extension does not match its content type.");
            }

            using var memoryStream = new MemoryStream();
            await file.CopyToAsync(memoryStream);
            var bytes = memoryStream.ToArray();

            if (!HasValidSignature(file.ContentType, bytes))
            {
                return ServiceResult<byte[]>.BadRequest($"{noun} signature is invalid.");
            }

            return ServiceResult<byte[]>.Ok(bytes);
        }

        private static bool HasValidSignature(string contentType, byte[] bytes)
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

                // "%PDF-"
                "application/pdf" => bytes.Length >= 5 &&
                                     bytes[0] == 0x25 && bytes[1] == 0x50 && bytes[2] == 0x44 &&
                                     bytes[3] == 0x46 && bytes[4] == 0x2D,

                // The OpenXML formats are ZIP containers, so all three share the
                // "PK\x03\x04" local-file header. That proves the file is a real
                // archive rather than something renamed to .docx — it does not
                // prove which OpenXML format it is, and it does not need to: the
                // bytes are stored and handed back, never opened by the server.
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document" or
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" or
                "application/vnd.openxmlformats-officedocument.presentationml.presentation" =>
                    bytes.Length >= 4 &&
                    bytes[0] == 0x50 && bytes[1] == 0x4B && bytes[2] == 0x03 && bytes[3] == 0x04,

                _ => false
            };
        }
    }
}
