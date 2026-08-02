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
    }
}
