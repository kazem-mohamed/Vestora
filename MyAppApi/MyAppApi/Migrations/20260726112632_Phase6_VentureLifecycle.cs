using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyAppApi.Migrations
{
    /// <inheritdoc />
    public partial class Phase6_VentureLifecycle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LifecycleStatus",
                table: "Projects",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Active");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LifecycleStatus",
                table: "Projects");
        }
    }
}
