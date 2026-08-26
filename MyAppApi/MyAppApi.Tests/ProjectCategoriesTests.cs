using MyAppApi.Services;
using Xunit;

namespace MyAppApi.Tests;

/// <summary>
/// The closed key set replacing the old free-text Category + Industry pair.
/// Must stay in lockstep with the frontend mirror (categories.ts) — these
/// cases only cover the shape of the C# side (validity, "other" fallback,
/// no duplicates), not the specific keys, since the list itself is a product
/// decision that will keep evolving.
/// </summary>
public class ProjectCategoriesTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("HealthTech")]  // old free-text values are not keys
    [InlineData("Fintech")]     // case matters
    [InlineData("DROP TABLE")]
    public void IsValid_RejectsAnythingUndeclared(string? category)
    {
        Assert.False(ProjectCategories.IsValid(category));
    }

    [Fact]
    public void IsValid_AcceptsEveryDeclaredKey()
    {
        foreach (var key in ProjectCategories.All)
        {
            Assert.True(ProjectCategories.IsValid(key));
        }
    }

    [Fact]
    public void OtherIsADeclaredKey()
    {
        Assert.Contains(ProjectCategories.Other, ProjectCategories.All);
    }

    [Fact]
    public void CategoryListHasNoDuplicates()
    {
        Assert.Equal(ProjectCategories.All.Length, ProjectCategories.All.Distinct().Count());
    }
}
