using MyAppApi.Services;
using Xunit;

namespace MyAppApi.Tests;

/// <summary>
/// Cases FM-01 .. FM-06 of the test catalogue. Each guards a rule that a
/// defect in the project's history proved was worth guarding.
/// </summary>
public class FundingMathTests
{
    // ---- FM-01: approved is not funded -------------------------------------

    [Fact] // FM-01
    public void PublicStatus_IsNotFunded_WhenOnlyCommitted()
    {
        // A round fully committed but with nothing settled must not read as funded.
        var status = FundingMath.PublicStatus(funded: 0m, committed: 400_000m, goal: 400_000m);
        Assert.Equal(FundingMath.StatusFullyCommitted, status);
        Assert.NotEqual(FundingMath.StatusFunded, status);
    }

    [Fact] // FM-01
    public void PublicStatus_IsFunded_OnlyWhenSettledReachesGoal()
    {
        Assert.Equal(
            FundingMath.StatusFunded,
            FundingMath.PublicStatus(funded: 400_000m, committed: 400_000m, goal: 400_000m));
    }

    [Fact] // FM-01
    public void PublicStatus_IsRaising_WhenNeitherReachesGoal()
    {
        Assert.Equal(
            FundingMath.StatusRaising,
            FundingMath.PublicStatus(funded: 10m, committed: 20m, goal: 400_000m));
    }

    // ---- FM-04: a venture with no transactions ----------------------------

    [Theory] // FM-04
    [InlineData(0, 0, 0)]
    [InlineData(0, 100, 0)]
    [InlineData(50, 100, 50)]
    [InlineData(100, 100, 100)]
    [InlineData(250, 100, 100)] // clamped, never above 100
    public void Pct_IsClampedAndSafe(decimal amount, decimal goal, int expected)
    {
        Assert.Equal(expected, FundingMath.Pct(amount, goal));
    }

    [Fact] // FM-04
    public void Pct_IsZero_WhenGoalIsZero()
    {
        // Division by a zero goal must yield zero rather than throw or produce NaN.
        Assert.Equal(0, FundingMath.Pct(500m, 0m));
    }

    // ---- FM-05: capacity is measured against commitments ------------------

    [Fact] // FM-05
    public void RemainingCapacity_MeasuresAgainstCommitted_NotFunded()
    {
        // The whole goal is committed but nothing has settled. Capacity must be
        // zero: accepting more requests now oversubscribes the round the moment
        // those commitments pay.
        Assert.Equal(0m, FundingMath.RemainingCapacity(goal: 400_000m, committed: 400_000m));
    }

    [Fact] // FM-05
    public void RemainingCapacity_NeverGoesNegative()
    {
        Assert.Equal(0m, FundingMath.RemainingCapacity(goal: 100m, committed: 250m));
    }

    [Fact] // FM-05
    public void RemainingCapacity_ExcludingOwnCommitment_LetsTheLastDealBeCalledIn()
    {
        // The relationship that filled the round asks for its own money. Its
        // commitment is already inside the project's total, so the figure it is
        // measured against must exclude it — otherwise headroom is zero and the
        // founder can never call in the deal that completed the raise.
        const decimal goal = 400_000m;
        const decimal thisDeal = 150_000m;
        const decimal others = 250_000m;

        Assert.Equal(0m, FundingMath.RemainingCapacity(goal, others + thisDeal));
        Assert.Equal(thisDeal, FundingMath.RemainingCapacity(goal, others));
    }

    [Fact] // FM-05
    public void RemainingCapacity_RefusesTheSecondAcceptanceThatWouldOversubscribe()
    {
        // Two requests for the whole goal each fit an empty round, because capacity
        // counts commitments and an unapproved request is not one. Accepting both is
        // what breaks the round: Committed passes the goal, and from then on every
        // relationship is measured against a total that already exceeds the target,
        // so no funding request can be issued for any of them. The rule that stops
        // this has to run at acceptance, which is where the commitment is created.
        const decimal goal = 100_000m;

        // First acceptance: the whole round is still open.
        Assert.Equal(goal, FundingMath.RemainingCapacity(goal, committed: 0m));

        // Second: nothing left, so it must be refused rather than approved. Were it
        // approved anyway the round would hold 200k against a 100k goal, and asking
        // for either deal excludes only itself — leaving the other's 100k in the way,
        // headroom at zero for both, and neither ever callable.
        Assert.Equal(0m, FundingMath.RemainingCapacity(goal, committed: goal));
    }

    // ---- FM-07: tranches -- a commitment settled in instalments ------------

    [Fact] // FM-07
    public void IsFullySettled_ComparesTheSum_NotTheFirstPayment()
    {
        // The old test was "has any payment succeeded". A 400k commitment paid in a
        // 150k first tranche would have satisfied it, closed the ask permanently, and
        // left 250k committed and uncollectable.
        Assert.False(FundingMath.IsFullySettled(settled: 150_000m, commitment: 400_000m));
        Assert.False(FundingMath.IsFullySettled(settled: 399_999m, commitment: 400_000m));
        Assert.True(FundingMath.IsFullySettled(settled: 400_000m, commitment: 400_000m));

        // Overpayment still counts as settled — the target has been reached.
        Assert.True(FundingMath.IsFullySettled(settled: 450_000m, commitment: 400_000m));
    }

    [Fact] // FM-07
    public void IsFullySettled_WithNoTarget_TurnsOnWhetherAnythingArrived()
    {
        // There is no target left to reach, so anything settled completes it. Reporting
        // such a relationship as perpetually partial would be arithmetic, not truth.
        Assert.False(FundingMath.IsFullySettled(settled: 0m, commitment: 0m));
        Assert.True(FundingMath.IsFullySettled(settled: 1m, commitment: 0m));
    }

    [Fact] // FM-07
    public void UnsettledCommitment_IsWhatMayStillBeCalledIn()
    {
        Assert.Equal(250_000m, FundingMath.UnsettledCommitment(commitment: 400_000m, settled: 150_000m));

        // Never negative: an overpaid commitment owes nothing, it does not owe less
        // than nothing.
        Assert.Equal(0m, FundingMath.UnsettledCommitment(commitment: 400_000m, settled: 450_000m));
    }

    [Fact] // FM-07
    public void StateOf_PartialSettlement_ReadsAsPartiallyFunded_NotAsPaymentDue()
    {
        // Half the commitment has arrived and the next tranche is outstanding. Money in
        // hand is the strongest fact in the room, so it leads: "PaymentDue" would erase
        // the part that is already done, and "Funded" would overstate the rest.
        var state = FundingMath.StateOf(
            investmentStatus: "Approved",
            hasSucceededPayment: true,
            hasRefundedPayment: false,
            hasOpenRequest: true,
            hasProcessingPayment: false,
            isFullySettled: false);

        Assert.Equal(FundingMath.StatePartiallyFunded, state);
    }

    [Fact] // FM-07
    public void StateOf_FullSettlement_StillOutranksEverything()
    {
        var state = FundingMath.StateOf(
            investmentStatus: PipelineStages.Declined,
            hasSucceededPayment: true,
            hasRefundedPayment: false,
            hasOpenRequest: true,
            hasProcessingPayment: true,
            isFullySettled: true);

        Assert.Equal(FundingMath.StateFunded, state);
    }

    // ---- FM-06: relationship state precedence -----------------------------

    [Fact] // FM-06
    public void StateOf_Funded_OutranksEveryOtherSignal()
    {
        // A succeeded payment is the strongest fact available; nothing overrides it.
        var state = FundingMath.StateOf(
            investmentStatus: PipelineStages.Declined,
            hasSucceededPayment: true,
            hasRefundedPayment: true,
            hasOpenRequest: true,
            hasProcessingPayment: true);

        Assert.Equal(FundingMath.StateFunded, state);
    }

    [Fact] // FM-06
    public void StateOf_Committed_WhenApprovedWithNoPaymentActivity()
    {
        var state = FundingMath.StateOf(
            investmentStatus: PipelineStages.Approved,
            hasSucceededPayment: false,
            hasRefundedPayment: false,
            hasOpenRequest: false,
            hasProcessingPayment: false);

        // Approved, and explicitly *not* Funded.
        Assert.Equal(FundingMath.StateCommitted, state);
        Assert.NotEqual(FundingMath.StateFunded, state);
    }

    [Fact] // FM-06
    public void StateOf_PaymentDue_WhenAnOpenRequestExists()
    {
        var state = FundingMath.StateOf(
            investmentStatus: PipelineStages.Approved,
            hasSucceededPayment: false,
            hasRefundedPayment: false,
            hasOpenRequest: true,
            hasProcessingPayment: false);

        Assert.Equal(FundingMath.StatePaymentDue, state);
    }

    [Fact] // FM-06
    public void StateOf_Requested_ByDefault()
    {
        var state = FundingMath.StateOf(
            investmentStatus: PipelineStages.New,
            hasSucceededPayment: false,
            hasRefundedPayment: false,
            hasOpenRequest: false,
            hasProcessingPayment: false);

        Assert.Equal(FundingMath.StateRequested, state);
    }

    // ---- FM-03: derivation is deterministic -------------------------------

    [Fact] // FM-03
    public void Derivation_IsDeterministic_OverTheSameInputs()
    {
        for (var i = 0; i < 100; i++)
        {
            Assert.Equal(
                FundingMath.PublicStatus(120m, 300m, 400m),
                FundingMath.PublicStatus(120m, 300m, 400m));
            Assert.Equal(FundingMath.Pct(120m, 400m), FundingMath.Pct(120m, 400m));
        }
    }
}
