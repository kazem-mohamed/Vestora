using System;
using System.Collections.Generic;

namespace MyAppApi.Data.Models.DTOs
{
    /// <summary>
    /// Everything one investment relationship is, in a single response.
    /// <para>
    /// The relationship's facts were already spread across five tables — the
    /// investment, its stage, the messages, the data room, the notifications. Reading
    /// it required five round-trips and left both sides assembling the story in their
    /// heads. This assembles it once, server-side, with each side seeing only what
    /// belongs to them.
    /// </para>
    /// </summary>
    public class DealRoomDto
    {
        public int InvestmentId { get; set; }

        // ---- The venture ----
        public int ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public string? ProjectTopic { get; set; }
        public int? CoverImageId { get; set; }
        public decimal InvestmentNeeded { get; set; }
        public decimal CommittedAmount { get; set; }

        /// <summary>Settled capital across the whole venture — the number its page leads with.</summary>
        public decimal FundedAmount { get; set; }

        public string? ProjectStage { get; set; }
        public string LifecycleStatus { get; set; } = "Active";
        public DateTime? RoundClosedAtUtc { get; set; }

        // ---- The two sides ----
        public int FounderId { get; set; }
        public string FounderName { get; set; } = string.Empty;
        public int InvestorId { get; set; }
        public string InvestorName { get; set; } = string.Empty;

        /// <summary>"founder" or "investor" — which side the caller is on.</summary>
        public string ViewerRole { get; set; } = string.Empty;

        // ---- Relationship state ----
        public string Stage { get; set; } = "New";
        public string Status { get; set; } = "Pending";
        public DateTime? StageUpdatedAt { get; set; }
        public DateTime OpenedAt { get; set; }

        /// <summary>
        /// The amount under discussion. Both sides see it: it is the substance of the
        /// relationship, and hiding it from either would make the room pointless.
        /// This is a stated commitment, never a transferred sum.
        /// </summary>
        public decimal Amount { get; set; }

        public string? ContactInfo { get; set; }
        public string? DeclinedReason { get; set; }

        /// <summary>The caller's own private note. The other side's is never sent.</summary>
        public string? MyNote { get; set; }

        // ---- Funding state ----
        //
        // The relationship's money lives here rather than in a separate payment screen.
        // A deal room is where terms are agreed, so it is where the founder asks for the
        // agreed number and where the investor answers — the payment is a moment in the
        // relationship, not a departure from it.

        /// <summary>Requested | Committed | PaymentDue | Processing | Funded | Refunded | Declined.</summary>
        public string FundingState { get; set; } = "Requested";

        /// <summary>The live or most recent funding request, with its attempt history.</summary>
        public FundingRequestDto? FundingRequest { get; set; }

        /// <summary>Settled amount for THIS relationship, when it has been funded.</summary>
        public decimal? FundedThisDeal { get; set; }

        public DateTime? FundedAtUtc { get; set; }

        /// <summary>True when the founder may issue an ask right now.</summary>
        public bool CanRequestFunds { get; set; }

        /// <summary>True when the investor has an open ask they can pay.</summary>
        public bool CanCompletePayment { get; set; }

        /// <summary>The most this founder may ask for, given what the round has already committed elsewhere.</summary>
        public decimal MaxRequestableAmount { get; set; }

        /// <summary>Platform fee in basis points, so the founder sees proceeds before sending.</summary>
        public int FeeRateBps { get; set; }

        /// <summary>Always true in this project — surfaced so the room can label the environment.</summary>
        public bool IsSandbox { get; set; } = true;

        // ---- Working set ----
        public List<DealQuestionDto> Questions { get; set; } = new();
        public List<DocumentRequestDto> DocumentRequests { get; set; } = new();
        public List<DealEventDto> Timeline { get; set; } = new();
        public int UnreadMessages { get; set; }

        /// <summary>Documents visible to the caller for this venture.</summary>
        public List<DealDocumentDto> Documents { get; set; } = new();

        /// <summary>
        /// What this side is expected to do next, derived from real state rather than
        /// asked of the user. Drives the room's single call to action.
        /// </summary>
        public List<string> NextSteps { get; set; } = new();

        public List<string> AllowedStages { get; set; } = new();
    }

    public class DealQuestionDto
    {
        public int Id { get; set; }
        public string Question { get; set; } = string.Empty;
        public string? Answer { get; set; }
        public int AskedByUserId { get; set; }
        public string AskedByName { get; set; } = string.Empty;
        public string? AnsweredByName { get; set; }
        public DateTime CreatedAtUtc { get; set; }
        public DateTime? AnsweredAtUtc { get; set; }
        public bool IsWithdrawn { get; set; }
        public bool CanAnswer { get; set; }
        public bool CanWithdraw { get; set; }
    }

    public class DocumentRequestDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Note { get; set; }
        public string Status { get; set; } = "Open";
        public string? DeclinedReason { get; set; }
        public int? FulfilledByDocumentId { get; set; }
        public string? FulfilledByDocumentTitle { get; set; }
        public int RequestedByUserId { get; set; }
        public string RequestedByName { get; set; } = string.Empty;
        public DateTime CreatedAtUtc { get; set; }
        public DateTime? ResolvedAtUtc { get; set; }
        public bool CanResolve { get; set; }
        public bool CanWithdraw { get; set; }
    }

    public class DealDocumentDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public long SizeBytes { get; set; }
        public string Visibility { get; set; } = "Public";
        public DateTime UploadedAt { get; set; }
        /// <summary>Whether the caller has opened it — the founder sees this per document.</summary>
        public bool? OpenedByInvestor { get; set; }
    }

    /// <summary>
    /// One thing that happened, from any of the underlying systems, normalised so the
    /// relationship reads as a single chronology instead of four separate lists.
    /// </summary>
    public class DealEventDto
    {
        /// <summary>opened · stage · question · answer · doc_request · doc_fulfilled · document · message · declined · round_closed</summary>
        public string Type { get; set; } = string.Empty;
        public DateTime AtUtc { get; set; }
        public int? ActorUserId { get; set; }
        public string? ActorName { get; set; }
        /// <summary>Short factual payload — a stage name, a document title, a question.</summary>
        public string? Detail { get; set; }
        public int? RefId { get; set; }
    }

    // ---- Inputs ----

    public class AskQuestionInput
    {
        public string Question { get; set; } = string.Empty;
    }

    public class AnswerQuestionInput
    {
        public string Answer { get; set; } = string.Empty;
    }

    public class RequestDocumentInput
    {
        public string Title { get; set; } = string.Empty;
        public string? Note { get; set; }
    }

    public class ResolveDocumentRequestInput
    {
        /// <summary>"Fulfilled" or "Declined".</summary>
        public string Status { get; set; } = string.Empty;
        public int? DocumentId { get; set; }
        public string? DeclinedReason { get; set; }
    }

    /// <summary>A relationship as it appears in a list of relationships.</summary>
    public class DealSummaryDto
    {
        public int InvestmentId { get; set; }
        public int ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public int? CoverImageId { get; set; }
        public int CounterpartId { get; set; }
        public string CounterpartName { get; set; } = string.Empty;
        public string Stage { get; set; } = "New";
        public decimal Amount { get; set; }
        public DateTime? StageUpdatedAt { get; set; }
        public DateTime OpenedAt { get; set; }
        public int OpenQuestions { get; set; }
        public int OpenDocumentRequests { get; set; }
        public int UnreadMessages { get; set; }
        /// <summary>True when the relationship is waiting on the caller specifically.</summary>
        public bool NeedsMe { get; set; }

        /// <summary>Requested | Committed | PaymentDue | Processing | Funded | Refunded | Declined.</summary>
        public string FundingState { get; set; } = "Requested";

        /// <summary>The agreed amount when an ask is open — differs from Amount after negotiation.</summary>
        public decimal? AgreedAmount { get; set; }
    }
}
