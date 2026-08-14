using System.Text.Json;
using Microsoft.AspNetCore.Http;
using MyAppApi.Data;
using MyAppApi.Data.Models;

namespace MyAppApi.Services
{
    /// <summary>
    /// The one way an administrative action is written to the audit trail.
    /// <para>
    /// Three places built this row by hand — both admin controllers and the payment
    /// service — and each kept its own copy of the truncation rule and its own idea of
    /// what "the actor" meant. They agreed only because whoever wrote them copied the
    /// previous one; the first divergence would have been invisible, because a log with
    /// one field quietly missing still looks like a log.
    /// </para>
    /// <para>
    /// Nothing is saved here, for the same reason <see cref="StageLog"/> saves nothing:
    /// the entry is added beside the change it describes, so the caller's existing
    /// <c>SaveChangesAsync</c> commits both or neither. The controllers used to save the
    /// action first and the record of it second, which meant a failure in between left
    /// the act done and unrecorded — the one state an audit trail exists to prevent.
    /// </para>
    /// </summary>
    public static class AuditTrail
    {
        /// <summary>
        /// The column is unbounded, but a detail long enough to matter is a detail nobody
        /// reads. Cut at the same length the payment service already used.
        /// </summary>
        private const int MaxDetails = 500;

        /// <summary>Longest reason kept, matching the column and <c>AdminReasonDto</c>.</summary>
        private const int MaxReason = 500;

        /// <summary>
        /// Records that <paramref name="actorUserId"/> did <paramref name="action"/> to
        /// <paramref name="targetType"/>/<paramref name="targetId"/>.
        /// <para>
        /// The actor is passed rather than read from the request because the payment
        /// service writes here too, and it has no <c>HttpContext</c> to read from. The
        /// context is optional for the same reason: when one is supplied the caller's
        /// address is recorded, and when there is none the field is simply absent rather
        /// than filled with a placeholder that would read like a fact.
        /// </para>
        /// <para>
        /// <paramref name="before"/> and <paramref name="after"/> take the changed fields
        /// only — <c>new { user.IsSuspended }</c>, not the user. Storing whole rows would
        /// turn the trail into a second copy of the database, and the question it answers
        /// is what an action changed.
        /// </para>
        /// </summary>
        public static void Audit(
            this AppDbContext db,
            int actorUserId,
            string action,
            string targetType,
            int? targetId,
            string? details = null,
            string? reason = null,
            object? before = null,
            object? after = null,
            HttpContext? http = null)
        {
            db.AdminAuditLogs.Add(new AdminAuditLog
            {
                AdminUserId = actorUserId,
                Action = action,
                TargetType = targetType,
                TargetId = targetId,
                Details = Trim(details, MaxDetails),
                Reason = Trim(reason, MaxReason),
                BeforeJson = Serialise(before),
                AfterJson = Serialise(after),
                IpAddress = http?.Connection.RemoteIpAddress?.ToString(),
                CreatedAtUtc = DateTime.UtcNow,
            });
        }

        private static string? Trim(string? value, int max) =>
            value is { Length: > 0 } ? (value.Length > max ? value[..max] : value) : null;

        private static string? Serialise(object? state) =>
            state == null ? null : JsonSerializer.Serialize(state);
    }
}
