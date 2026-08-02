using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyAppApi.Migrations
{
    /// <inheritdoc />
    public partial class InvestorProfileThesisAndTicket : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "InvestmentThesis",
                table: "Users",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TicketMax",
                table: "Users",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TicketMin",
                table: "Users",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "InvestmentThesis",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "TicketMax",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "TicketMin",
                table: "Users");
        }
    }
}
