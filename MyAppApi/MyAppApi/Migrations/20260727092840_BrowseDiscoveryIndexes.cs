using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyAppApi.Migrations
{
    /// <inheritdoc />
    public partial class BrowseDiscoveryIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Projects_ModerationStatus_LifecycleStatus_CreatedDate",
                table: "Projects",
                columns: new[] { "ModerationStatus", "LifecycleStatus", "CreatedDate" });

            migrationBuilder.CreateIndex(
                name: "IX_Projects_Stage",
                table: "Projects",
                column: "Stage");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Projects_ModerationStatus_LifecycleStatus_CreatedDate",
                table: "Projects");

            migrationBuilder.DropIndex(
                name: "IX_Projects_Stage",
                table: "Projects");
        }
    }
}
