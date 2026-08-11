using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyAppApi.Migrations
{
    /// <inheritdoc />
    public partial class OneLiveInvestmentPerInvestor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "UX_Investments_OneLivePerInvestor",
                table: "Investments",
                columns: new[] { "ProjectId", "InvestorId" },
                unique: true,
                filter: "[InvestorId] IS NOT NULL AND [Status] IN ('Pending', 'Approved')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "UX_Investments_OneLivePerInvestor",
                table: "Investments");
        }
    }
}
