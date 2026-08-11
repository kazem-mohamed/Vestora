using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyAppApi.Migrations
{
    /// <inheritdoc />
    public partial class StageHistoryRemindersAndReconciliation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ReviewNote",
                table: "PaymentEvents",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReviewedAtUtc",
                table: "PaymentEvents",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ReviewedByAdminId",
                table: "PaymentEvents",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RemindersSent",
                table: "FundingRequests",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "InvestmentStageEvents",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InvestmentId = table.Column<int>(type: "int", nullable: false),
                    FromStage = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    ToStage = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ActorUserId = table.Column<int>(type: "int", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    MinutesInPreviousStage = table.Column<int>(type: "int", nullable: true),
                    AtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InvestmentStageEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InvestmentStageEvents_Investments_InvestmentId",
                        column: x => x.InvestmentId,
                        principalTable: "Investments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_InvestmentStageEvents_InvestmentId_AtUtc",
                table: "InvestmentStageEvents",
                columns: new[] { "InvestmentId", "AtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_InvestmentStageEvents_ToStage_AtUtc",
                table: "InvestmentStageEvents",
                columns: new[] { "ToStage", "AtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "InvestmentStageEvents");

            migrationBuilder.DropColumn(
                name: "ReviewNote",
                table: "PaymentEvents");

            migrationBuilder.DropColumn(
                name: "ReviewedAtUtc",
                table: "PaymentEvents");

            migrationBuilder.DropColumn(
                name: "ReviewedByAdminId",
                table: "PaymentEvents");

            migrationBuilder.DropColumn(
                name: "RemindersSent",
                table: "FundingRequests");
        }
    }
}
