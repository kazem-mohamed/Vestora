namespace MyAppApi.Settings
{
    public class FileUploadSecuritySettings
    {
        public long MaxImageBytes { get; set; } = 2 * 1024 * 1024;

        public string[] AllowedImageContentTypes { get; set; } =
        {
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/bmp"
        };

        // Documents run to a higher ceiling than images because the thing people
        // actually send in a deal conversation is a deck, and a deck with slides
        // in it does not fit in 2 MB. Still under the endpoint's 15 MB request
        // limit, which stays the outer bound.
        public long MaxDocumentBytes { get; set; } = 10 * 1024 * 1024;

        // Only formats whose first bytes can be verified — see
        // FileUploadSecurityService. A type nobody can check by signature (plain
        // text, CSV) would be a hole in that model, not a convenience.
        public string[] AllowedDocumentContentTypes { get; set; } =
        {
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        };
    }
}
