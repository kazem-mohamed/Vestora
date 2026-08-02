namespace MyAppApi.Data.Models
{
    /// <summary>
    /// The binary payload for a message attachment, kept in its own table (1:1
    /// with Message) so loading conversation history never drags the bytes along.
    /// The content type / file name live on Message as lightweight metadata.
    /// </summary>
    public class MessageAttachment
    {
        // Shared primary key with Message (1:1).
        public int MessageId { get; set; }
        public Message Message { get; set; }

        public byte[] Data { get; set; }
    }
}
