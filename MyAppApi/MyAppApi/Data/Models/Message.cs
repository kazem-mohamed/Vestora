namespace MyAppApi.Data.Models
{
    public class Message
    {
        public int Id { get; set; }
        public string Content { get; set; }
        public DateTime SentAt { get; set; }

        // Read receipt for the RECEIVER — drives unread counts + the inbox badge.
        public bool IsRead { get; set; }

        // Attachment metadata (image only for now). Null = a plain text message.
        // The bytes live in MessageAttachment so history queries stay lightweight.
        public string? AttachmentType { get; set; }
        public string? AttachmentName { get; set; }

        // The venture this message is about, when it is about one.
        //
        // Messaging began as plain user-to-user, which left a founder running three
        // ventures with one undifferentiated thread per investor and no way to tell
        // which venture a conversation concerned. Nullable on purpose: a message sent
        // from a profile is genuinely contextless and should stay that way, so the
        // general inbox keeps working exactly as before.
        public int? ProjectId { get; set; }
        public Project? Project { get; set; }

        public int SenderId { get; set; }
        public User Sender { get; set; }

        public int ReceiverId { get; set; }
        public User Receiver { get; set; }
    }
}
