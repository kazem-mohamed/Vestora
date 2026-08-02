namespace MyAppApi.Data.Models.DTOs
{
    public class SendMessageDto
    {
        public int ReceiverId { get; set; }

        public string Content { get; set; } = string.Empty;

        /// <summary>
        /// The venture this message is about, when sent from a relationship.
        /// Optional — a message sent from a profile has no venture, and should not
        /// pretend to. The server verifies the sender is actually party to the venture
        /// before honouring it.
        /// </summary>
        public int? ProjectId { get; set; }
    }
}
