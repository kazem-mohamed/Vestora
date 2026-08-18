// TypeScript mirrors of the backend DTOs (see Vestora_Backend_Status.md).

export type UserType = "Investor" | "Innovator" | "Admin";

export interface LoginResponse {
  message: string;
  accessToken: string;
  expiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  userId: number;
  userType: UserType;
  userName: string;
  userEmail: string;
  /** Account-level, not per-browser: false sends the user to /onboarding. */
  hasOnboarded: boolean;
  /** Set when an admin created this account and chose its first password. */
  mustChangePassword: boolean;
}

export interface ApiMessage {
  message: string;
  /**
   * Whether an email the endpoint was meant to send actually left the server.
   *
   * Absent when the endpoint sends no mail. `false` means the account exists but
   * the code never went out — the interface must say so rather than sending
   * someone to watch an empty inbox.
   */
  emailDelivered?: boolean | null;
}

export interface UserProfile {
  id: number;
  userName: string;
  email: string;
  userType: UserType;
  birthDate: string | null;
  phone: string | null;
  briefBio: string | null;
  websiteUrl: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  /** Investor-only; null for Innovator/Admin. */
  preferredIndustries: string | null;
  /** Investor-only: what they look for, and the cheque they write. */
  investmentThesis: string | null;
  ticketMin: number | null;
  ticketMax: number | null;
  /** Ambient notifications the member may switch off. The four support
   *  notifications are never optional — they carry pipeline decisions. */
  notifyOnFollow: boolean;
  notifyOnProjectUpdate: boolean;
  hasAvatar: boolean;
  hasCover: boolean;
  isEmailVerified: boolean;
}

export interface PublicUserProfile {
  id: number;
  userName: string;
  userType: UserType;
  briefBio: string | null;
  hasAvatar: boolean;
}

// Full public profile for /u/[id] — identity + live stats + follow relationship.
export interface PublicProfileDetail {
  id: number;
  userName: string;
  userType: UserType;
  briefBio: string | null;
  websiteUrl: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  /** Investor-only; null for Innovator/Admin. */
  preferredIndustries: string | null;
  /** Investor-only: what they look for, and the cheque they write. */
  investmentThesis: string | null;
  ticketMin: number | null;
  ticketMax: number | null;
  hasAvatar: boolean;
  hasCover: boolean;
  joinedAtUtc: string | null;
  followersCount: number;
  followingCount: number;
  projectsCount: number;
  backedCount: number;
  isFollowedByMe: boolean;
  isMe: boolean;
  teamMemberships: TeamMembership[];
  /** Facts Vestora can prove about this member. Never a score, never "Verified". */
  trustSignals: TrustSignal[];
}

export interface TeamMembership {
  projectId: number;
  projectName: string;
  role: string | null;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Reply {
  id: number;
  content: string;
  createdDate: string;
  userId: number;
  userName: string;
}

export interface Comment {
  id: number;
  content: string;
  createdDate: string;
  userId: number;
  userName: string;
  replies: Reply[];
}

/** Sort orders the browse feed supports. Every one maps to a real stored value. */
export type BrowseSort = "newest" | "momentum" | "close" | "largest" | "backers" | "discussed";

/**
 * Round filter. Three states now that money exists: still open to requests, fully
 * spoken for, and actually paid for.
 */
export type CommitmentFilter = "open" | "committed" | "funded";

// ===== Funding & sandbox payments =====
//
// Four words that are not synonyms, and the whole point of this layer:
//   Requested  — the investor asked; the founder has not answered.
//   Committed  — the founder accepted the relationship. Still no money.
//   PaymentDue — the founder asked for the agreed amount. Money is owed.
//   Funded     — a payment settled. This, and only this, is money.

export type FundingState =
  | "Requested"
  | "Committed"
  | "PaymentDue"
  | "Processing"
  // Some of the commitment has settled and some has not. A commitment may be called
  // in over several tranches, and neither "PaymentDue" nor "Funded" tells the truth
  // about that halfway point.
  | "PartiallyFunded"
  | "Funded"
  | "Refunded"
  | "Declined"
  | "None";

export type FundingRequestStatus = "Open" | "Paid" | "Cancelled" | "Expired";

/**
 * The transaction state machine. Terminal states are never rewritten — a retry
 * always produces a new attempt, so the history reads as what actually happened.
 */
export type PaymentStatus =
  | "Initiated"
  | "Processing"
  | "Succeeded"
  | "Failed"
  | "Cancelled"
  | "Refunded";

export interface PaymentTransaction {
  id: number;
  reference: string;
  fundingRequestId: number;
  fundingRequestReference: string | null;
  investmentId: number;
  projectId: number;
  projectName: string;
  coverImageId: number | null;
  investorId: number;
  investorName: string;
  founderId: number;
  founderName: string;
  /** Which attempt this is for its request: 1, 2, 3… */
  attemptNumber: number;
  amount: number;
  currency: string;
  /** Fee rate frozen onto this row at settlement (500 = 5%). */
  feeRateBps: number;
  feeAmount: number;
  netToFounder: number;
  status: PaymentStatus;
  provider: string;
  providerPaymentId: string | null;
  providerRefundId: string | null;
  /** Only present while the attempt is still live. */
  checkoutUrl: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  cancelReason: string | null;
  refundReason: string | null;
  createdAtUtc: string;
  expiresAtUtc: string;
  succeededAtUtc: string | null;
  failedAtUtc: string | null;
  cancelledAtUtc: string | null;
  refundedAtUtc: string | null;
  /** Always true in this project. Surfaced so the interface can say so out loud. */
  isSandbox: boolean;
}

export interface FundingRequest {
  id: number;
  reference: string;
  investmentId: number;
  projectId: number;
  investorId: number;
  amount: number;
  currency: string;
  status: FundingRequestStatus;
  note: string | null;
  closedReason: string | null;
  createdAtUtc: string;
  expiresAtUtc: string;
  paidAtUtc: string | null;
  feeRateBps: number;
  estimatedFee: number;
  estimatedNetProceeds: number;

  // ---- Counter-offer ----
  // The founder names a figure; this is the investor's half of that sentence.
  counterAmount: number | null;
  counterNote: string | null;
  counterAtUtc: string | null;
  counterStatus: "Proposed" | "Accepted" | "Declined" | null;
  /** The ask this one replaced, when it was issued to accept a counter. */
  supersedesRequestId: number | null;
  /** The agreed terms this ask calls in, when the relationship has any. */
  termSheetId: number | null;

  /** Every attempt made against this request, oldest first. */
  attempts: PaymentTransaction[];
}

export interface CheckoutSession {
  transactionId: number;
  reference: string;
  checkoutUrl: string;
  provider: string;
  isSandbox: boolean;
  amount: number;
  currency: string;
  /** True when a live attempt was handed back rather than a new one opened. */
  resumed: boolean;
}

export interface PaymentConfig {
  provider: string;
  isSandbox: boolean;
  currency: string;
  feeRateBps: number;
  feeRatePercent: number;
  checkoutTtlMinutes: number;
  fundingRequestTtlDays: number;
}

export interface InvestorPaymentSummary {
  fundedTotal: number;
  fundedCount: number;
  paymentDueTotal: number;
  paymentDueCount: number;
  committedTotal: number;
  refundedTotal: number;
  failedCount: number;
  currency: string;
}

export interface InvestorPayments {
  summary: InvestorPaymentSummary;
  /** Requests waiting on the investor — the actionable band. */
  due: FundingRequest[];
  transactions: PaymentTransaction[];
  isSandbox: boolean;
  provider: string;
}

// ===== Admin revenue =====

export interface AdminRevenueKpis {
  grossTransactionVolume: number;
  platformRevenue: number;
  netToFounders: number;
  succeededCount: number;
  failedCount: number;
  cancelledCount: number;
  refundedCount: number;
  refundedAmount: number;
  /** Succeeded ÷ (succeeded + failed). Cancellations are not failures. */
  successRate: number;
  averageTransactionValue: number;
  /** Attempts still live past their expiry — operational, not accounting. */
  stuckCount: number;
  openFundingRequests: number;
  openFundingAmount: number;
}

export interface RevenuePoint {
  label: string;
  gross: number;
  revenue: number;
  count: number;
}

export interface TopEarningVenture {
  projectId: number;
  projectName: string;
  founderId: number;
  founderName: string;
  gross: number;
  revenue: number;
  transactions: number;
}

export interface AdminRevenue {
  kpis: AdminRevenueKpis;
  revenueOverTime: RevenuePoint[];
  topVentures: TopEarningVenture[];
  isSandbox: boolean;
  provider: string;
  feeRateBps: number;
  currency: string;
}

export interface AdminTransactionRow extends PaymentTransaction {
  providerSessionId: string | null;
  refundedByAdminId: number | null;
}

/**
 * A confirmation the system recorded but could not act on.
 *
 * Most are harmless — a resent webhook arriving after the return trip already settled
 * the payment. `isConflict` marks the ones that are not: the provider reports money
 * taken against an attempt Vestora had written off, which means the two sides disagree
 * about a real payment and a person has to go and look.
 */
export interface ReconciliationEvent {
  id: number;
  provider: string;
  providerEventId: string;
  eventType: string;
  source: string;
  outcome: string | null;
  receivedAtUtc: string;
  isConflict: boolean;
  reviewedAtUtc: string | null;
  reviewNote: string | null;

  transactionId: number | null;
  transactionReference: string | null;
  transactionStatus: PaymentStatus | null;
  amount: number | null;
  currency: string | null;
  investmentId: number | null;
  projectName: string | null;
  investorName: string | null;
}

export interface Reconciliation {
  items: ReconciliationEvent[];
  totalCount: number;
  /** Unreviewed conflicts across the whole queue, not just this page. */
  openConflicts: number;
  page: number;
  pageSize: number;
}

/**
 * Slim card projection for the public browse feed. Carries the deal shape the
 * investor triages on, plus the real discovery signals — and none of the heavy
 * or internal fields the old list response shipped.
 */
export interface ProjectCard {
  id: number;
  name: string;
  topic: string | null;
  category: string | null;
  industry: string | null;
  location: string | null;
  stage: string | null;
  investmentNeeded: number;
  /** Sum of APPROVED commitments. Never render this as "raised" or "funded". */
  committedAmount: number;
  /** Money that settled. This is the figure a card leads with. */
  fundedAmount: number;
  equityOffered: number | null;
  ownerId: number;
  ownerName: string;
  backerCount: number;
  /** Investors whose payment settled. */
  fundedBackerCount: number;
  createdDate: string;
  coverImageId: number | null;
  isFullyCommitted: boolean;
  /** Settled money covers the goal — the stronger claim. */
  isFullyFunded: boolean;
  fundingStatus: FundingStatus;
  viewCount: number;
  lastUpdateAt: string | null;
  averageRating: number | null;
  reviewCount: number;
}

/** What a venture's round is doing, in the language the product uses everywhere. */
export type FundingStatus = "Funded" | "Fully Committed" | "Raising";

export interface FacetValue {
  value: string;
  count: number;
}

/** Filter options with live counts, so the UI never offers a dead-end choice. */
export interface ProjectFacets {
  stages: FacetValue[];
  sectors: FacetValue[];
  locations: FacetValue[];
  total: number;
  open: number;
  fullyCommitted: number;
  /** Rounds where the money actually arrived — stricter than fullyCommitted. */
  fullyFunded: number;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  videoUrl: string | null;
  topic: string | null;
  category: string | null;
  industry: string | null;
  location: string | null;
  investmentNeeded: number;
  /**
   * Settled money. Carries the same value as `fundedAmount` — kept because older
   * call sites read this name, but it no longer means "sum of approvals".
   */
  raisedAmount: number;
  /** Money that actually arrived, in the sandbox simulation. */
  fundedAmount: number;
  /** Founder-approved commitments, paid or not. Always ≥ fundedAmount. */
  committedAmount: number;
  /** Requests still awaiting the founder's decision. */
  interestAmount: number;
  /** Investors whose payment settled. */
  fundedInvestorCount: number;
  /** "PendingReview" | "Approved" | "Rejected" — admin review gate on listings. */
  moderationStatus: string;
  /** Admin's reason when rejected — shown to the owner so they can fix it. */
  moderationNote: string | null;
  /** Founder-controlled: "Active" | "Paused" | "Closed". */
  lifecycleStatus: string;
  /** Set once the round is closed. Non-null means this listing is a record, not an ask. */
  roundClosedAtUtc: string | null;
  roundOutcome: RoundOutcome | null;
  roundClosingNote: string | null;
  /** Requests still awaiting the founder's decision. Closing the round declines these. */
  pendingRequestsCount: number;
  stage: string | null;
  valuation: number | null;
  equityOffered: number | null;
  useOfFunds: string | null;
  ownerId: number;
  ownerName: string;
  numberOfInvestors: number;
  totalInteractions: number;
  status: string;
  commentsCount: number;
  imageIds: number[];
  comments: Comment[];
  /** Facts Vestora can prove about this listing, for whoever is weighing it up. */
  trustSignals: TrustSignal[];
}

export interface ProjectUpdate {
  id: number;
  title: string;
  body: string;
  createdDate: string;
  imageIds: number[];
}

export type MilestoneStatus = "Planned" | "InProgress" | "Done";

export interface Milestone {
  id: number;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  progress: number;
  sortOrder: number;
  date: string | null;
}

export interface TeamMember {
  id: number;
  name: string;
  role: string | null;
  bio: string | null;
  linkedinUrl: string | null;
  /** Owner-only — null for anyone viewing another founder's roster. */
  email: string | null;
  sortOrder: number;
  hasAvatar: boolean;
}

export interface ProjectDocument {
  id: number;
  title: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  visibility: "Public" | "Backers";
  uploadedAt: string;
}

export interface Notification {
  notificationId: number;
  content: string;
  dateCreated: string;
  isRead: boolean;
  notificationType: string | null;
  projectId: number | null;
  investmentId: number | null;
  actorUserId: number | null;
  userId: number;
}

export interface Message {
  id: number;
  content: string;
  sentAt: string;
  senderId: number;
  receiverId: number;
  isRead: boolean;
  /** Attachment metadata (image or document); null/absent for plain text. */
  attachmentType?: string | null;
  attachmentName?: string | null;
  /** Client-only: an optimistic message not yet confirmed by the server. */
  pending?: boolean;
  /** Client-only: an optimistic send that failed and can be retried. */
  failed?: boolean;
  /** Client-only: object URL previewing an attachment while it uploads. */
  localPreviewUrl?: string;
}

export interface ConversationSummary {
  messageId: number;
  content: string;
  attachmentType?: string | null;
  sentAt: string;
  senderId: number;
  senderName: string;
  receiverId: number;
  receiverName: string;
  partnerId: number;
  partnerName: string;
  unreadCount: number;
  isMine: boolean;
}

export interface InvestmentSummary {
  /** Approved commitments. Intent, with a person attached. */
  totalSupport: number;
  /** Sum of still-pending (not yet founder-approved) support requests. */
  pendingAmount: number;
  /** Agreed amounts with an open, unpaid ask. */
  paymentDueAmount: number;
  /** Settled payments — the only figure that may be called invested. */
  fundedAmount: number;
  fundedProjectsCount: number;
  supportedProjectsCount: number;
}

/** The investor's standing with one venture, money included. */
export interface MySupport {
  investmentId?: number;
  status: string;
  amount: number;
  fundingState: FundingState;
  fundingRequestId?: number | null;
  agreedAmount?: number | null;
  fundingRequestExpiresAt?: string | null;
  fundedAmount?: number | null;
}

export interface InvestmentActivity {
  date: string;
  projectName: string;
  amount: number;
  type: string;
  /** "Pending" | "Approved" — added with the F3 approval model. */
  status?: string;
}

export interface AdminUser {
  id: number;
  userName: string;
  email: string;
  userType: UserType;
  isEmailVerified: boolean;
  isSuspended: boolean;
  suspensionReason: string | null;
  /** Only meaningful when userType is "Admin". */
  isPrimaryAdmin: boolean;
}

export interface AdminAnalytics {
  totalUsers: number;
  investors: number;
  innovators: number;
  admins: number;
  totalProjects: number;
  /** Ventures whose settled money covers the goal. */
  fundedProjects: number;
  /** Ventures fully spoken for but not fully paid. */
  fullyCommittedProjects: number;
  totalInvestments: number;
  /** Settled money across the platform. */
  totalInvestedAmount: number;
  /** Approved commitments in money terms — always ≥ totalInvestedAmount. */
  totalCommittedAmount: number;
  platformRevenue: number;
  fundedTransactions: number;
}

// ===== Founder Control Room (F8) =====

export interface FounderKpis {
  venturesCount: number;
  /** Ventures whose settled money covers the goal. */
  fundedVenturesCount: number;
  /** Fully spoken for but not fully paid. */
  fullyCommittedVenturesCount: number;
  /** Sum of APPROVED support commitments — not money received. */
  totalCommitted: number;
  /** Settled payments. The only figure that may be called raised. */
  totalFunded: number;
  /** Funded minus the platform fee. */
  netProceeds: number;
  platformFees: number;
  awaitingPayment: number;
  awaitingPaymentCount: number;
  totalGoal: number;
  totalInvestors: number;
  fundedInvestors: number;
  pendingRequestsCount: number;
  pendingRequestsAmount: number;
  followersCount: number;
  commentsCount: number;
  unreadMessages: number;
  refundedAmount: number;
  refundedCount: number;
  failedPaymentCount: number;
}

export interface TimePoint {
  label: string; // "yyyy-MM"
  value: number;
}

export interface VentureFunding {
  id: number;
  name: string;
  /** Settled money. */
  raised: number;
  /** Approved commitments — the ghost layer behind it. */
  committed: number;
  goal: number;
}

/** One relationship the founder has asked for money and not yet received it. */
export interface AwaitingPayment {
  fundingRequestId: number;
  reference: string;
  investmentId: number;
  projectId: number;
  projectName: string;
  investorId: number;
  investorName: string;
  amount: number;
  netProceeds: number;
  createdAtUtc: string;
  expiresAtUtc: string;
  attemptCount: number;
  lastAttemptStatus: PaymentStatus | null;
}

export interface ApprovedVsPending {
  approvedCount: number;
  approvedAmount: number;
  pendingCount: number;
  pendingAmount: number;
}

export interface PendingApproval {
  investmentId: number;
  notificationId: number;
  projectId: number;
  projectName: string;
  investorId: number;
  investorName: string;
  amount: number;
  date: string;
  /** How the investor asked to be reached, e.g. "Email: a@b.com". */
  contactInfo: string | null;
}

export interface Backer {
  id: number;
  investorId: number;
  investorName: string;
  amount: number;
  status: string;
  contactInfo: string | null;
  date: string;
}

/** One investor relationship from the founder's side. */
export interface FounderPipelineItem {
  investmentId: number;
  notificationId: number;
  projectId: number;
  projectName: string;
  investorId: number;
  investorName: string;
  amount: number;
  stage: PipelineStage;
  status: string;
  date: string;
  stageUpdatedAt: string | null;
  contactInfo: string | null;
  founderNote: string | null;
  declinedReason: string | null;
  /** Who the investor is — shown so the decision is informed, not blind. */
  investorThesis: string | null;
  investorTicketMin: number | null;
  investorTicketMax: number | null;
  investorIndustries: string | null;
}

export interface TopVenture {
  id: number;
  name: string;
  category: string | null;
  /** Settled money. */
  raised: number;
  /** Approved commitments. */
  committed: number;
  goal: number;
  investors: number;
  fundedInvestors: number;
  /** Percentage of goal funded. */
  pct: number;
  /** Percentage of goal committed. Always ≥ pct. */
  committedPct: number;
  status: FundingStatus;
}

export interface DashboardComment {
  id: number;
  projectId: number;
  projectName: string;
  userId: number;
  userName: string;
  content: string;
  date: string;
}

export interface DashboardActivity {
  type: "investment" | "comment" | "follow" | "update";
  date: string;
  projectId: number | null;
  projectName: string | null;
  actorName: string | null;
  amount: number | null;
  text: string | null;
}

export interface FounderDashboard {
  kpis: FounderKpis;
  /** Cumulative committed capital by month — the promises curve. */
  fundingOverTime: TimePoint[];
  /** Cumulative settled capital by month. The gap between the two is the story. */
  fundedOverTime: TimePoint[];
  fundingByVenture: VentureFunding[];
  approvedVsPending: ApprovedVsPending;
  /** Relationships with an open ask — the founder's collection queue. */
  awaitingPayment: AwaitingPayment[];
  followerGrowth: TimePoint[];
  investorGrowth: TimePoint[];
  pendingApprovals: PendingApproval[];
  /** Every investor relationship at any stage (declines included). */
  pipeline: FounderPipelineItem[];
  topVentures: TopVenture[];
  recentComments: DashboardComment[];
  recentActivity: DashboardActivity[];
}

// ===== Investor dashboard =====

/** Relationship pipeline stages — mirrors PipelineStages on the backend. */
export type PipelineStage =
  | "New"
  | "Reviewing"
  | "Approved"
  | "Contacted"
  | "InDiscussion"
  | "Committed"
  | "Closed"
  | "Declined";

export interface InvestorKpis {
  pendingCount: number;
  pendingAmount: number;
  approvedCount: number;
  approvedAmount: number;
  /** The founder has asked for the money and it is unpaid. Actionable. */
  paymentDueCount: number;
  paymentDueAmount: number;
  /** Settled payments. The only band that may be called invested. */
  fundedCount: number;
  fundedAmount: number;
  venturesFunded: number;
  venturesBacked: number;
  watchlistCount: number;
  unreadMessages: number;
  declinedCount: number;
  refundedAmount: number;
  failedPaymentCount: number;
}

export interface PipelineItem {
  investmentId: number;
  projectId: number;
  projectName: string;
  category: string | null;
  founderId: number;
  founderName: string;
  amount: number;
  stage: PipelineStage;
  status: string;
  date: string;
  stageUpdatedAt: string | null;
  investorNote: string | null;
  declinedReason: string | null;
  coverImageId: number | null;
  /** Where this relationship sits on the money axis. */
  fundingState: FundingState;
  /** Set when an ask is open — this is what makes the row actionable. */
  fundingRequestId: number | null;
  /** The agreed amount, which may differ from what was originally requested. */
  agreedAmount: number | null;
  fundingRequestExpiresAt: string | null;
  fundedAmount: number | null;
  fundedAt: string | null;
  /** Last attempt failed and the ask is still open — a retry is available. */
  canRetry: boolean;
}

export interface BackedVenture {
  projectId: number;
  projectName: string;
  category: string | null;
  industry: string | null;
  stage: string | null;
  founderId: number;
  founderName: string;
  myCommitment: number;
  /** What this investor actually paid in. */
  myFunded: number;
  /** Open ask against this investor for this venture. */
  myPaymentDue: number;
  goal: number;
  totalCommitted: number;
  /** Settled capital across all investors — the venture's real progress. */
  totalFunded: number;
  coverImageId: number | null;
  latestUpdateTitle: string | null;
  latestUpdateDate: string | null;
}

export interface AllocationSlice {
  label: string;
  amount: number;
  count: number;
}

export interface InvestorActivity {
  type: "commitment" | "approved" | "declined" | "update" | "milestone";
  date: string;
  projectId: number | null;
  projectName: string | null;
  amount: number | null;
  text: string | null;
}

export interface InvestorDashboard {
  kpis: InvestorKpis;
  pipeline: PipelineItem[];
  portfolio: BackedVenture[];
  byIndustry: AllocationSlice[];
  byStage: AllocationSlice[];
  commitmentsOverTime: TimePoint[];
  /** Cumulative settled capital by month — the honest portfolio curve. */
  fundedOverTime: TimePoint[];
  recentActivity: InvestorActivity[];
  watchlistCount: number;
}

// ===== Moderation & Reports (F9) =====

export type ReportReason = "Spam" | "Scam" | "Copyright" | "Offensive" | "Duplicate" | "Other";

export interface Report {
  id: number;
  projectId: number;
  projectName: string;
  reporterId: number;
  reporterName: string;
  reason: string;
  details: string | null;
  status: string; // Open | Resolved | Dismissed
  createdAt: string;
}

export interface AdminReportsResponse {
  items: Report[];
  totalCount: number;
  openCount: number;
  page: number;
  pageSize: number;
}

export interface AdminAuditEntry {
  id: number;
  adminUserId: number;
  adminName: string;
  action: string;
  targetType: string;
  targetId: number | null;
  details: string | null;
  /** The justification the acting admin gave. Required on every destructive action. */
  reason: string | null;
  /** The changed fields only, as JSON — not a copy of the row. */
  beforeJson: string | null;
  afterJson: string | null;
  ipAddress: string | null;
  createdAtUtc: string;
}

/** Built from the rows actually present, so a new action type appears the first time it is used. */
export interface AdminAuditFacets {
  actions: string[];
  targetTypes: string[];
  admins: { id: number; name: string }[];
}

export interface AdminAuditLogResponse {
  items: AdminAuditEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  facets: AdminAuditFacets;
}

export interface AdminAuditFilters {
  page?: number;
  pageSize?: number;
  adminId?: number;
  action?: string;
  targetType?: string;
  from?: string;
  to?: string;
}

export interface SecurityEvent {
  id: number;
  eventType: string;
  email: string | null;
  ipAddress: string | null;
  details: string | null;
  createdAtUtc: string;
  userId: number | null;
}

export interface AdminSecurity {
  events: SecurityEvent[];
  byType: { type: string; count: number }[];
  lockedAccounts: number;
  suspendedAccounts: number;
  days: number;
}

export interface AdminGrowth {
  userGrowth: TimePoint[];
  investorGrowth: TimePoint[];
  innovatorGrowth: TimePoint[];
  ventureGrowth: TimePoint[];
}

// ===== Admin: funnel, timings, revenue over time =====

/** Cumulative — how many relationships ever got at least this far. */
export interface AdminFunnelStep {
  stage: string;
  count: number;
}

/**
 * A ratio as its two halves. The API deliberately never sends a percentage: at this
 * size one event moves most of these by several points, so the counts lead and the
 * percentage is the smaller, derived reading.
 */
export interface AdminConversion {
  key: string;
  numerator: number;
  denominator: number;
}

/** Measured from InvestmentStageEvent, median rather than mean, with its sample size. */
export interface AdminStageDwell {
  stage: string;
  samples: number;
  medianMinutes: number;
  longestMinutes: number;
}

export interface AdminRevenuePeriod {
  /** "yyyy-MM". */
  label: string;
  transactions: number;
  gross: number;
  fees: number;
}

export interface AdminRevenueByVenture {
  projectId: number;
  name: string;
  transactions: number;
  gross: number;
  fees: number;
}

export interface AdminInsights {
  funnel: AdminFunnelStep[];
  /** A side exit from the funnel, not a rung of it. */
  declined: number;
  conversions: AdminConversion[];
  stageDwell: AdminStageDwell[];
  revenueByMonth: AdminRevenuePeriod[];
  revenueByVenture: AdminRevenueByVenture[];
  /** Below totalRelationships, the dwell figures describe a subset. */
  relationshipsWithHistory: number;
  totalRelationships: number;
}

// ===== Admin: cross-entity search =====

export interface AdminSearchHit {
  id: number;
  title: string;
  subtitle: string | null;
  /** Status, role or stage — whatever this kind of record is defined by. */
  badge: string | null;
  /** Removed or suspended. Shown rather than hidden — usually the reason for the search. */
  muted: boolean;
  href: string;
}

export interface AdminSearchResults {
  query: string;
  users: AdminSearchHit[];
  ventures: AdminSearchHit[];
  deals: AdminSearchHit[];
  transactions: AdminSearchHit[];
  reports: AdminSearchHit[];
}

// ===== Admin: what is waiting on a human =====

export interface AdminFlaggedVenture {
  projectId: number;
  name: string;
  openReports: number;
}

/** Counts against stated thresholds. Not anomaly detection — see AdminController.GetAlerts. */
export interface AdminAlerts {
  pendingReview: number;
  openReports: number;
  lockedAccounts: number;
  suspendedAccounts: number;
  heavilyReported: AdminFlaggedVenture[];
  /** Echoed so the screen can state the rule instead of asserting a judgement. */
  reportThreshold: number;
  staleUnappliedEvents: number;
  staleEventHours: number;
  recentFailedPayments: number;
  failedPaymentDays: number;
}

// ===== Admin: one account, everything attached to it =====

export interface AdminAccount {
  id: number;
  userName: string;
  email: string;
  userType: UserType;
  phone: string | null;
  briefBio: string | null;
  isEmailVerified: boolean;
  emailVerifiedAtUtc: string | null;
  createdAtUtc: string | null;
  lastSeenAt: string | null;
  onboardedAtUtc: string | null;
  isSuspended: boolean;
  suspendedAtUtc: string | null;
  suspensionReason: string | null;
  /** Removed by an administrator. */
  isDeleted: boolean;
  /** Set when the person closed their own account — a different fact from isDeleted. */
  deletedAtUtc: string | null;
}

/** Narrower than {@link SecurityEvent}: this feed is already scoped to one account. */
export interface AdminUserSecurityEvent {
  id: number;
  eventType: string;
  ipAddress: string | null;
  details: string | null;
  createdAtUtc: string;
}

export interface AdminUserSecuritySnapshot {
  failedLoginCount: number;
  lockoutEndUtc: string | null;
  lastFailedLoginAtUtc: string | null;
  isLockedOut: boolean;
  distinctIpCount: number;
  recentEvents: AdminUserSecurityEvent[];
}

export interface AdminUserVenture {
  projectId: number;
  name: string;
  category: string | null;
  /** PendingReview | Approved | Rejected. */
  moderationStatus: string;
  moderationNote: string | null;
  isDeleted: boolean;
  createdDate: string;
  goal: number;
  /** Founder-approved commitments — never money received. */
  committed: number;
  /** Settled payments. The only figure that may be called funded. */
  funded: number;
  committedInvestors: number;
  fundedInvestors: number;
  openReports: number;
}

export interface AdminUserReportItem {
  id: number;
  projectId: number;
  projectName: string;
  reason: string;
  status: string;
  createdAt: string;
  /** True when this person filed it, false when it was filed about them. */
  filedByThem: boolean;
}

export interface AdminUserReports {
  againstThemOpen: number;
  againstThemTotal: number;
  filedByThemTotal: number;
  recent: AdminUserReportItem[];
}

export interface AdminUserDeal {
  investmentId: number;
  projectId: number;
  projectName: string;
  counterpartyName: string;
  counterpartyId: number | null;
  /** Which side of the table this account is on. */
  side: "investor" | "founder";
  /** The commitment. Never the amount received. */
  amount: number;
  /** Settled across every tranche. */
  settled: number;
  status: string;
  stage: PipelineStage;
  date: string;
  stageUpdatedAt: string | null;
}

export interface AdminUserTransaction {
  id: number;
  reference: string;
  projectId: number;
  projectName: string;
  amount: number;
  currency: string;
  status: string;
  createdAtUtc: string;
  succeededAtUtc: string | null;
  refundedAtUtc: string | null;
  refundReason: string | null;
  failureMessage: string | null;
}

export interface AdminUserPayments {
  settledTotal: number;
  refundedTotal: number;
  succeededCount: number;
  failedCount: number;
  refundedCount: number;
  recent: AdminUserTransaction[];
}

export interface AdminUserAuditEntry {
  id: number;
  adminName: string;
  action: string;
  details: string | null;
  createdAtUtc: string;
}

export interface AdminUserOverview {
  account: AdminAccount;
  security: AdminUserSecuritySnapshot;
  ventures: AdminUserVenture[];
  reports: AdminUserReports;
  deals: AdminUserDeal[];
  payments: AdminUserPayments;
  activity: AdminUserAuditEntry[];
  unreadMessages: number;
}

// A listing awaiting admin review before it's visible on public browse/details.
export interface PendingProject {
  id: number;
  name: string;
  description: string;
  topic: string | null;
  category: string | null;
  industry: string | null;
  location: string | null;
  stage: string | null;
  investmentNeeded: number;
  valuation: number | null;
  equityOffered: number | null;
  ownerId: number;
  ownerName: string;
  createdDate: string;
  /** Completeness signals — what a reviewer weighs before approving. */
  coverImageId: number | null;
  imageCount: number;
  teamCount: number;
  documentCount: number;
  milestoneCount: number;
}

// ===== Analytics, Reviews & Feed (F10) =====

export interface ProjectAnalytics {
  views: number;
  uniqueVisitors: number;
  saves: number;
  comments: number;
  investors: number;
  fundedInvestors: number;
  /** Settled money. Was previously the sum of approvals under this name. */
  raised: number;
  committed: number;
  netProceeds: number;
  goal: number;
  conversionRate: number;
  viewsOverTime: TimePoint[];
  /** Cumulative settled, monthly. */
  fundingOverTime: TimePoint[];
  /** Cumulative committed, monthly. */
  commitmentsOverTime: TimePoint[];
}

export interface Review {
  id: number;
  investorId: number;
  investorName: string;
  rating: number;
  content: string | null;
  createdAt: string;
}

export interface ReviewSummary {
  average: number;
  count: number;
  canReview: boolean;
  hasReviewed: boolean;
  items: Review[];
}

export type FeedType = "new_project" | "update" | "investment" | "new_user" | "milestone";

export interface FeedItem {
  type: FeedType;
  date: string;
  projectId: number | null;
  projectName: string | null;
  actorId: number | null;
  actorName: string | null;
  text: string | null;
}

export interface FeedResponse {
  items: FeedItem[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
//  Capital discovery — the founder's side of the marketplace
// ============================================================================

/**
 * An investor as a founder needs to read them: the mandate first, then the
 * evidence that the mandate is real. Carries no private figures — how much
 * anyone committed to what is never part of this.
 */
export interface InvestorCard {
  id: number;
  userName: string;
  briefBio: string | null;
  hasAvatar: boolean;

  investmentThesis: string | null;
  preferredIndustries: string | null;
  ticketMin: number | null;
  ticketMax: number | null;

  /** Distinct ventures with an approved commitment. */
  backedCount: number;
  /** Sectors actually backed, which may differ from the stated ones. */
  activeSectors: string[];
  lastBackedAtUtc: string | null;
  joinedAtUtc: string | null;
  activeRelationships: number;
  /** True when the viewing founder already has a relationship with them. */
  alreadyConnected: boolean;
}

export type TicketBand = "under50" | "50to250" | "250to1m" | "over1m";
export type CapitalSort = "backed" | "active" | "ticket" | "newest";

export interface CapitalFacets {
  sectors: FacetValue[];
  ticketBands: FacetValue[];
  total: number;
  withTrackRecord: number;
  withThesis: number;
}

// ============================================================================
//  Deal room — one investment relationship
// ============================================================================

export type DealEventType =
  | "opened" | "stage" | "question" | "answer" | "doc_request"
  | "doc_fulfilled" | "doc_declined" | "document" | "declined" | "round_closed"
  // The money, in the same chronology as everything else.
  | "funds_requested" | "funding_cancelled" | "funding_expired"
  | "payment_succeeded" | "payment_failed" | "payment_refunded";

export interface DealEvent {
  type: DealEventType;
  atUtc: string;
  actorUserId: number | null;
  actorName: string | null;
  detail: string | null;
  refId: number | null;
  /** Free prose attached to the event — a decline reason, a settlement reference. */
  note: string | null;
  /** On a stage event: minutes spent in the stage the relationship just left. */
  durationMinutes: number | null;
}

/** Time in one stage, in the order the relationship passed through them. */
export interface StageDuration {
  stage: PipelineStage;
  minutes: number;
  /** The stage it is sitting in now — this clock is still running. */
  isCurrent: boolean;
}

export interface DealQuestion {
  id: number;
  question: string;
  answer: string | null;
  askedByUserId: number;
  askedByName: string;
  answeredByName: string | null;
  createdAtUtc: string;
  answeredAtUtc: string | null;
  isWithdrawn: boolean;
  canAnswer: boolean;
  canWithdraw: boolean;
  /** The question this clarifies, when it is a follow-up. */
  parentQuestionId: number | null;
  /** True when the caller may push back on the answer. Asker only, once, roots only. */
  canFollowUp: boolean;
  /** Follow-ups on this question, oldest first. Always empty on a follow-up. */
  followUps: DealQuestion[];
}

export type DocRequestStatus = "Open" | "Fulfilled" | "Declined" | "Withdrawn";

/** "ToFounder" — the investor is asking. "ToInvestor" — the founder is. */
export type DocRequestDirection = "ToFounder" | "ToInvestor";

export interface DealDocumentRequest {
  id: number;
  title: string;
  note: string | null;
  status: DocRequestStatus;
  declinedReason: string | null;
  fulfilledByDocumentId: number | null;
  fulfilledByDocumentTitle: string | null;
  requestedByUserId: number;
  requestedByName: string;
  createdAtUtc: string;
  resolvedAtUtc: string | null;
  canResolve: boolean;
  canWithdraw: boolean;
  direction: DocRequestDirection;
  /** The investor's uploaded answer, when they were the one being asked. */
  responseFileName: string | null;
  responseSizeBytes: number | null;
  hasResponseFile: boolean;
  responseNote: string | null;
}

export type TermSheetStatus = "Proposed" | "Accepted" | "Declined" | "Superseded";

/**
 * What the two sides say they agreed to, in writing, each having accepted it.
 *
 * Not a contract — Vestora holds no signatures and enforces nothing. It is the text
 * that the "agreed off-platform" stage was standing in for, so the funding request
 * that follows rests on something a person can read.
 */
export interface TermSheet {
  id: number;
  version: number;
  amount: number;
  currency: string;
  equityPct: number | null;
  valuation: number | null;
  useOfFunds: string | null;
  otherTerms: string | null;
  status: TermSheetStatus;
  proposedByUserId: number;
  proposedByMe: boolean;
  /** Stated separately, because whose acceptance is missing is the actionable half. */
  acceptedByMe: boolean;
  acceptedByThem: boolean;
  agreedAtUtc: string | null;
  declinedReason: string | null;
  createdAtUtc: string;
  canAccept: boolean;
  canDecline: boolean;
}

export type DealHealthStatus = "Healthy" | "Slowing" | "Stalled" | "Concluded";

/** Whether the relationship is moving, and what is holding it up. Derived, never stored. */
export interface DealHealth {
  status: DealHealthStatus;
  score: number;
  daysSinceActivity: number;
  /** Machine-readable reasons, translated client-side via `deal.health.reason.*`. */
  reasons: string[];
}

export interface DealDocument {
  id: number;
  title: string;
  fileName: string;
  sizeBytes: number;
  visibility: "Public" | "Backers";
  uploadedAt: string;
  /** Whether this investor opened it — founder-only signal. */
  openedByInvestor: boolean | null;
}

/** What this side owes the other, derived from state rather than asked of anyone. */
export type DealNextStep =
  | "review_request" | "answer_questions" | "supply_documents"
  | "read_messages" | "make_contact" | "ask_first_question"
  // Money owed sorts ahead of everything else in the room's call to action.
  | "complete_payment" | "retry_payment" | "request_funds";

export interface DealRoom {
  investmentId: number;

  projectId: number;
  projectName: string;
  projectTopic: string | null;
  coverImageId: number | null;
  investmentNeeded: number;
  committedAmount: number;
  /** Settled capital across the whole venture. */
  fundedAmount: number;
  projectStage: string | null;
  lifecycleStatus: string;
  roundClosedAtUtc: string | null;

  founderId: number;
  founderName: string;
  investorId: number;
  investorName: string;
  viewerRole: "founder" | "investor" | "admin";

  stage: string;
  status: string;
  stageUpdatedAt: string | null;
  openedAt: string;
  /** A stated commitment, never a transferred sum. */
  amount: number;

  contactInfo: string | null;
  declinedReason: string | null;
  myNote: string | null;

  questions: DealQuestion[];
  documentRequests: DealDocumentRequest[];
  documents: DealDocument[];
  timeline: DealEvent[];
  /** Time in each stage passed through, current one included and still counting. */
  stageDurations: StageDuration[];
  unreadMessages: number;
  nextSteps: DealNextStep[];
  allowedStages: string[];

  /** Every version of the terms this relationship has produced, newest first. */
  termSheets: TermSheet[];
  /** The version both sides accepted, when there is one. The deal, in writing. */
  agreedTerms: TermSheet | null;
  /** Whether the relationship is moving, and what is holding it up. */
  health: DealHealth;
  /** Settled across every tranche on this relationship. */
  settledTotal: number;
  /** What it is expected to settle in total — agreed terms if any, else the commitment. */
  commitmentTarget: number;

  // ---- Funding ----
  //
  // The relationship's money lives here rather than on a separate payment screen.
  // A deal room is where terms are agreed, so it is where the founder asks for
  // the agreed number and where the investor answers.

  fundingState: FundingState;
  /** The live or most recent ask, with its full attempt history. */
  fundingRequest: FundingRequest | null;
  /** Settled amount for THIS relationship. */
  fundedThisDeal: number | null;
  fundedAtUtc: string | null;
  /** True when the founder may issue an ask right now. */
  canRequestFunds: boolean;
  /** True when the investor has an open ask they can pay. */
  canCompletePayment: boolean;
  /** Ceiling on the ask, given what the round has committed elsewhere. */
  maxRequestableAmount: number;
  feeRateBps: number;
  isSandbox: boolean;
}

export interface DealSummary {
  investmentId: number;
  projectId: number;
  projectName: string;
  coverImageId: number | null;
  counterpartId: number;
  counterpartName: string;
  stage: string;
  amount: number;
  /** The agreed amount when an ask is open — differs from `amount` after negotiation. */
  agreedAmount: number | null;
  stageUpdatedAt: string | null;
  openedAt: string;
  openQuestions: number;
  openDocumentRequests: number;
  unreadMessages: number;
  fundingState: FundingState;
  /** True when the relationship is waiting on the caller specifically. */
  needsMe: boolean;
}

// ============================================================================
//  Signals — kept searches and the action centre
// ============================================================================

export interface SavedSearch {
  id: number;
  name: string;
  scope: "ventures" | "investors";
  search: string | null;
  sector: string | null;
  location: string | null;
  stage: string | null;
  commitment: string | null;
  createdAtUtc: string;
  lastSeenAtUtc: string;
  newMatches: number;
  totalMatches: number;
}

/** "What needs me" kept strictly apart from "what changed". */
export interface ActionCenter {
  /** Sum of the blocking items — stalled is deliberately not in it. */
  needsAction: number;
  questionsToAnswer: number;
  pendingRequests: number;
  documentRequestsToFill: number;
  approvedAwaitingContact: number;
  /** Proposed by the other side and awaiting specifically this caller's acceptance. */
  termSheetsAwaitingYou: number;
  /** Investor only: an open ask against them. */
  paymentsDue: number;
  /** Founder only: open asks about to lapse and release their capacity. */
  requestsNearingExpiry: number;
  expiryWindowDays: number;
  /** Live relationships whose stage has not moved. Counted, not diagnosed. */
  stalledDeals: number;
  stalledAfterDays: number;
  unreadMessages: number;
  unreadNotifications: number;
  newFromSavedSearches: number;
}

// ============================================================================
//  Endorsements — replaced the 1–5 star review
// ============================================================================

export interface Endorsement {
  id: number;
  investorId: number;
  investorName: string;
  hasAvatar: boolean;
  communicative: boolean;
  transparent: boolean;
  deliveredOnPlan: boolean;
  wouldBackAgain: boolean;
  content: string | null;
  createdAt: string;
  updatedAt: string | null;
  /** Written under the old star system: has no traits. */
  isLegacy: boolean;
}

export interface EndorsementSummary {
  count: number;
  communicativeCount: number;
  transparentCount: number;
  deliveredOnPlanCount: number;
  wouldBackAgainCount: number;
  canEndorse: boolean;
  hasEndorsed: boolean;
  items: Endorsement[];
}

// ============================================================================
//  Founder insights — the interest funnel
// ============================================================================

export type FunnelKey = "viewed" | "saved" | "requested" | "approved" | "in_discussion";

export interface FunnelStage {
  key: FunnelKey;
  count: number;
}

export interface DocumentEngagement {
  documentId: number;
  title: string;
  visibility: string;
  opens: number;
  distinctReaders: number;
}

export interface StalledRelationship {
  investmentId: number;
  investorId: number;
  investorName: string;
  amount: number;
  stage: string;
  sinceUtc: string;
  daysWaiting: number;
}

/** A fact the platform can prove, named for exactly what it is. */
export interface TrustSignal {
  key: string;
  level: "Verified" | "History" | "SelfReported";
  value: string | null;
}

export interface VentureInsights {
  projectId: number;
  projectName: string;
  totalViews: number;
  funnel: FunnelStage[];
  declined: number;
  committedAmount: number;
  goal: number;
  documents: DocumentEngagement[];
  stalled: StalledRelationship[];
  trustSignals: TrustSignal[];
  roundClosedAtUtc: string | null;
  roundOutcome: string | null;
}

export type RoundOutcome = "Completed" | "PartiallyRaised" | "Withdrawn";
