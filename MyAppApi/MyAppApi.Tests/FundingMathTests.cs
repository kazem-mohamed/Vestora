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
