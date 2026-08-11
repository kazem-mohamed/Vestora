using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyAppApi.Migrations
{
    /// <inheritdoc />
    public partial class TermSheetsCounterOffersAndTwoWayDocs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "CounterAmount",
                table: "FundingRequests",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CounterAtUtc",
                table: "FundingRequests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CounterNote",
                table: "FundingRequests",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CounterStatus",
                table: "FundingRequests",
                type: "nvarchar(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SupersedesRequestId",
                table: "FundingRequests",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TermSheetId",
                table: "FundingRequests",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ResponseContentType",
                table: "DocumentRequests",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "ResponseData",
                table: "DocumentRequests",
                type: "varbinary(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ResponseFileName",
                table: "DocumentRequests",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ResponseNote",
                table: "DocumentRequests",
                type: "nvarchar(600)",
                maxLength: 600,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "ResponseSizeBytes",
                table: "DocumentRequests",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ParentQuestionId",
                table: "DealQuestions",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "TermSheets",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InvestmentId = table.Column<int>(type: "int", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(3)", maxLength: 3, nullable: false),
                    EquityPct = table.Column<decimal>(type: "decimal(7,4)", precision: 7, scale: 4, nullable: true),
                    Valuation = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    UseOfFunds = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    OtherTerms = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    ProposedByUserId = table.Column<int>(type: "int", nullable: false),
                    FounderAcceptedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    InvestorAcceptedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    AgreedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeclinedReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TermSheets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TermSheets_Investments_InvestmentId",
                        column: x => x.InvestmentId,
                        principalTable: "Investments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FundingRequests_TermSheetId",
                table: "FundingRequests",
                column: "TermSheetId");

            migrationBuilder.CreateIndex(
                name: "IX_DealQuestions_ParentQuestionId",
                table: "DealQuestions",
                column: "ParentQuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_TermSheets_InvestmentId_Version",
                table: "TermSheets",
                columns: new[] { "InvestmentId", "Version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_TermSheets_OneLivePerInvestment",
                table: "TermSheets",
                column: "InvestmentId",
                unique: true,
                filter: "[Status] = 'Proposed'");

            migrationBuilder.AddForeignKey(
                name: "FK_DealQuestions_DealQuestions_ParentQuestionId",
                table: "DealQuestions",
                column: "ParentQuestionId",
                principalTable: "DealQuestions",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_FundingRequests_TermSheets_TermSheetId",
                table: "FundingRequests",
                column: "TermSheetId",
                principalTable: "TermSheets",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DealQuestions_DealQuestions_ParentQuestionId",
                table: "DealQuestions");

            migrationBuilder.DropForeignKey(
                name: "FK_FundingRequests_TermSheets_TermSheetId",
                table: "FundingRequests");

            migrationBuilder.DropTable(
                name: "TermSheets");

            migrationBuilder.DropIndex(
                name: "IX_FundingRequests_TermSheetId",
                table: "FundingRequests");

            migrationBuilder.DropIndex(
                name: "IX_DealQuestions_ParentQuestionId",
                table: "DealQuestions");

            migrationBuilder.DropColumn(
                name: "CounterAmount",
                table: "FundingRequests");

            migrationBuilder.DropColumn(
                name: "CounterAtUtc",
                table: "FundingRequests");

            migrationBuilder.DropColumn(
                name: "CounterNote",
                table: "FundingRequests");

            migrationBuilder.DropColumn(
                name: "CounterStatus",
                table: "FundingRequests");

            migrationBuilder.DropColumn(
                name: "SupersedesRequestId",
                table: "FundingRequests");

            migrationBuilder.DropColumn(
                name: "TermSheetId",
                table: "FundingRequests");

            migrationBuilder.DropColumn(
                name: "ResponseContentType",
                table: "DocumentRequests");

            migrationBuilder.DropColumn(
                name: "ResponseData",
                table: "DocumentRequests");

            migrationBuilder.DropColumn(
                name: "ResponseFileName",
                table: "DocumentRequests");

            migrationBuilder.DropColumn(
                name: "ResponseNote",
                table: "DocumentRequests");

            migrationBuilder.DropColumn(
                name: "ResponseSizeBytes",
                table: "DocumentRequests");

            migrationBuilder.DropColumn(
                name: "ParentQuestionId",
                table: "DealQuestions");
        }
    }
}
