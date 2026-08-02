using MyAppApi.Services;
using Xunit;

namespace MyAppApi.Tests;

/// <summary>
/// Cases PS-01 .. PS-04. The rule under test is the one whose absence caused
/// the defect recorded in the Challenges chapter: funding must begin at the
/// founder's approval and not before.
/// </summary>
public class PipelineStagesTests
{
    [Theory] // PS-04
    [InlineData(PipelineStages.New)]
    [InlineData(PipelineStages.Reviewing)]
    [InlineData(PipelineStages.Approved)]
    [InlineData(PipelineStages.Contacted)]
    [InlineData(PipelineStages.InDiscussion)]
    [InlineData(PipelineStages.Committed)]
    [InlineData(PipelineStages.Closed)]
    [InlineData(PipelineStages.Declined)]
    public void IsValid_AcceptsEveryDeclaredStage(string stage)
    {
        Assert.True(PipelineStages.IsValid(stage));
    }

    [Theory] // PS-04
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("approved")]     // case matters
    [InlineData("Funded")]       // not a pipeline stage
    [InlineData("DROP TABLE")]
    public void IsValid_RejectsAnythingUndeclared(string? stage)
    {
        Assert.False(PipelineStages.IsValid(stage));
    }

    [Theory] // PS-01
    [InlineData(PipelineStages.Approved)]
    [InlineData(PipelineStages.Contacted)]
    [InlineData(PipelineStages.InDiscussion)]
    [InlineData(PipelineStages.Committed)]
    [InlineData(PipelineStages.Closed)]
    public void CountsTowardFunding_FromApprovalOnward(string stage)
    {
        Assert.True(PipelineStages.CountsTowardFunding(stage));
    }

    [Theory] // PS-01
    [InlineData(PipelineStages.New)]
    [InlineData(PipelineStages.Reviewing)]
    public void DoesNotCountTowardFunding_BeforeApproval(string stage)
    {
        // A request the founder has not accepted must not move any number.
        Assert.False(PipelineStages.CountsTowardFunding(stage));
    }

    [Fact] // PS-02
    public void DeclinedNeverCountsTowardFunding()
    {
        // The row is kept for history; it must never contribute.
        Assert.False(PipelineStages.CountsTowardFunding(PipelineStages.Declined));
    }

    [Fact] // PS-03
    public void TerminalStagesAreDeclaredAndDistinct()
    {
        Assert.Contains(PipelineStages.Closed, PipelineStages.Terminal);
        Assert.Contains(PipelineStages.Declined, PipelineStages.Terminal);
        Assert.DoesNotContain(PipelineStages.Approved, PipelineStages.Terminal);
    }

    [Fact] // PS-03
    public void EveryTerminalStageIsAlsoAValidStage()
    {
        foreach (var stage in PipelineStages.Terminal)
        {
            Assert.True(PipelineStages.IsValid(stage));
        }
    }

    [Fact] // PS-04
    public void StageListHasNoDuplicates()
    {
        Assert.Equal(PipelineStages.All.Length, PipelineStages.All.Distinct().Count());
    }
}
