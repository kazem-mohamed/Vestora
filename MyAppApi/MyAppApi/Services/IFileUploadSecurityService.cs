namespace MyAppApi.Services
{
    public interface IFileUploadSecurityService
    {
        Task<ServiceResult<byte[]>> ReadValidatedImageAsync(IFormFile file);

        /// <summary>
        /// Images plus the document formats a deal conversation actually needs
        /// (deck, financials, term sheet). Deliberately separate from
        /// <see cref="ReadValidatedImageAsync"/>: avatars and project covers must
        /// stay images-only, so widening them to accept a PDF would be a
        /// regression rather than a feature.
        /// </summary>
        Task<ServiceResult<byte[]>> ReadValidatedAttachmentAsync(IFormFile file);
    }
}
