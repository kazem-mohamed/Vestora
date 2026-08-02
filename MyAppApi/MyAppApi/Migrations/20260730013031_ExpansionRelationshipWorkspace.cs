using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyAppApi.Migrations
{
    /// <inheritdoc />
    public partial class ExpansionRelationshipWorkspace : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Payments");

            migrationBuilder.DropTable(
                name: "ProjectAnalyses");

            migrationBuilder.AddColumn<bool>(
                name: "ListedInDirectory",
                table: "Users",
                type: "bit",
                nullable: true);

            // The C# default (= true) only applies to newly constructed entities, so
            // every investor that already exists would come back NULL and read as
            // "withdrawn from the directory" — the whole directory would launch empty.
            // Opt them in explicitly; the column stays nullable because it belongs to
            // the Investor subclass and must remain null for everyone else.
            migrationBuilder.Sql(
                "UPDATE [Users] SET [ListedInDirectory] = 1 " +
                "WHERE [UserType] = 'Investor' AND [ListedInDirectory] IS NULL;");

            migrationBuilder.AlterColumn<string>(
                name: "Content",
                table: "Reviews",
                type: "nvarchar(1500)",
                maxLength: 1500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "Communicative",
                table: "Reviews",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "DeliveredOnPlan",
                table: "Reviews",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "Transparent",
                table: "Reviews",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Reviews",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "WouldBackAgain",
                table: "Reviews",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "RoundClosedAtUtc",
                table: "Projects",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RoundClosingNote",
                table: "Projects",
                type: "nvarchar(600)",
                maxLength: 600,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RoundOutcome",
                table: "Projects",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ProjectId",
                table: "Messages",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "DealQuestions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InvestmentId = table.Column<int>(type: "int", nullable: false),
                    AskedByUserId = table.Column<int>(type: "int", nullable: false),
                    Question = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Answer = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    AnsweredByUserId = table.Column<int>(type: "int", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AnsweredAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsWithdrawn = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DealQuestions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DealQuestions_Investments_InvestmentId",
                        column: x => x.InvestmentId,
                        principalTable: "Investments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DealQuestions_Users_AnsweredByUserId",
                        column: x => x.AnsweredByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DealQuestions_Users_AskedByUserId",
                        column: x => x.AskedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DocumentRequests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InvestmentId = table.Column<int>(type: "int", nullable: false),
                    RequestedByUserId = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    Note = table.Column<string>(type: "nvarchar(600)", maxLength: 600, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    DeclinedReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    FulfilledByDocumentId = table.Column<int>(type: "int", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ResolvedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DocumentRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DocumentRequests_Investments_InvestmentId",
                        column: x => x.InvestmentId,
                        principalTable: "Investments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DocumentRequests_ProjectDocuments_FulfilledByDocumentId",
                        column: x => x.FulfilledByDocumentId,
                        principalTable: "ProjectDocuments",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_DocumentRequests_Users_RequestedByUserId",
                        column: x => x.RequestedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SavedSearches",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Scope = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Search = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    Sector = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    Location = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    Stage = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    Commitment = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastSeenAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SavedSearches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SavedSearches_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Users_ListedInDirectory",
                table: "Users",
                column: "ListedInDirectory");

            migrationBuilder.CreateIndex(
                name: "IX_Projects_RoundClosedAtUtc",
                table: "Projects",
                column: "RoundClosedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_Messages_ProjectId_SentAt",
                table: "Messages",
                columns: new[] { "ProjectId", "SentAt" });

            migrationBuilder.CreateIndex(
                name: "IX_DealQuestions_AnsweredByUserId",
                table: "DealQuestions",
                column: "AnsweredByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_DealQuestions_AskedByUserId",
                table: "DealQuestions",
                column: "AskedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_DealQuestions_InvestmentId_CreatedAtUtc",
                table: "DealQuestions",
                columns: new[] { "InvestmentId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_DocumentRequests_FulfilledByDocumentId",
                table: "DocumentRequests",
                column: "FulfilledByDocumentId");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentRequests_InvestmentId_Status",
                table: "DocumentRequests",
                columns: new[] { "InvestmentId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_DocumentRequests_RequestedByUserId",
                table: "DocumentRequests",
                column: "RequestedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SavedSearches_UserId_Scope",
                table: "SavedSearches",
                columns: new[] { "UserId", "Scope" });

            migrationBuilder.AddForeignKey(
                name: "FK_Messages_Projects_ProjectId",
                table: "Messages",
                column: "ProjectId",
                principalTable: "Projects",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Messages_Projects_ProjectId",
                table: "Messages");

            migrationBuilder.DropTable(
                name: "DealQuestions");

            migrationBuilder.DropTable(
                name: "DocumentRequests");

            migrationBuilder.DropTable(
                name: "SavedSearches");

            migrationBuilder.DropIndex(
                name: "IX_Users_ListedInDirectory",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Projects_RoundClosedAtUtc",
                table: "Projects");

            migrationBuilder.DropIndex(
                name: "IX_Messages_ProjectId_SentAt",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "ListedInDirectory",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Communicative",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "DeliveredOnPlan",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "Transparent",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "WouldBackAgain",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "RoundClosedAtUtc",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "RoundClosingNote",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "RoundOutcome",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "ProjectId",
                table: "Messages");

            migrationBuilder.AlterColumn<string>(
                name: "Content",
                table: "Reviews",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(1500)",
                oldMaxLength: 1500,
                oldNullable: true);

            migrationBuilder.CreateTable(
                name: "Payments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InvestorId = table.Column<int>(type: "int", nullable: false),
                    ProjectId = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    PaymentDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PaymentMethod = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TransactionId = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Payments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Payments_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Payments_Users_InvestorId",
                        column: x => x.InvestorId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProjectAnalyses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProjectId = table.Column<int>(type: "int", nullable: false),
                    AnalysisDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AnalysisResult = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectAnalyses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectAnalyses_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Payments_InvestorId",
                table: "Payments",
                column: "InvestorId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_ProjectId",
                table: "Payments",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectAnalyses_ProjectId",
                table: "ProjectAnalyses",
                column: "ProjectId");
        }
    }
}
