using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyAppApi.Migrations
{
    /// <inheritdoc />
    public partial class Phase2_InvestmentPipeline : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Investments_InvestorId",
                table: "Investments");

            migrationBuilder.DropIndex(
                name: "IX_Investments_ProjectId",
                table: "Investments");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Investments",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<string>(
                name: "DeclinedReason",
                table: "Investments",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FounderNote",
                table: "Investments",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InvestorNote",
                table: "Investments",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Stage",
                table: "Investments",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "New");

            migrationBuilder.AddColumn<DateTime>(
                name: "StageUpdatedAt",
                table: "Investments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Investments_InvestorId_Stage",
                table: "Investments",
                columns: new[] { "InvestorId", "Stage" });

            migrationBuilder.CreateIndex(
                name: "IX_Investments_ProjectId_Status",
                table: "Investments",
                columns: new[] { "ProjectId", "Status" });

            // Backfill the pipeline stage for rows that predate it, derived from
            // the existing funding Status so history stays coherent.
            migrationBuilder.Sql(@"
                UPDATE [Investments] SET [Stage] = 'Approved' WHERE [Status] = 'Approved';
                UPDATE [Investments] SET [Stage] = 'New'      WHERE [Status] = 'Pending';
                UPDATE [Investments] SET [Stage] = 'Declined' WHERE [Status] = 'Declined';
                UPDATE [Investments] SET [StageUpdatedAt] = [Date] WHERE [StageUpdatedAt] IS NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Investments_InvestorId_Stage",
                table: "Investments");

            migrationBuilder.DropIndex(
                name: "IX_Investments_ProjectId_Status",
                table: "Investments");

            migrationBuilder.DropColumn(
                name: "DeclinedReason",
                table: "Investments");

            migrationBuilder.DropColumn(
                name: "FounderNote",
                table: "Investments");

            migrationBuilder.DropColumn(
                name: "InvestorNote",
                table: "Investments");

            migrationBuilder.DropColumn(
                name: "Stage",
                table: "Investments");

            migrationBuilder.DropColumn(
                name: "StageUpdatedAt",
                table: "Investments");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Investments",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.CreateIndex(
                name: "IX_Investments_InvestorId",
                table: "Investments",
                column: "InvestorId");

            migrationBuilder.CreateIndex(
                name: "IX_Investments_ProjectId",
                table: "Investments",
                column: "ProjectId");
        }
    }
}
