using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyAppApi.Migrations
{
    /// <inheritdoc />
    public partial class AddPrimaryAdminFlag : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsPrimaryAdmin",
                table: "Users",
                type: "bit",
                nullable: true);

            // Existing admins get an explicit false rather than a null nobody set on
            // purpose, and the oldest one becomes primary — so the platform is never left
            // with zero admins able to create or remove another after this migration runs.
            migrationBuilder.Sql(@"
                UPDATE Users SET IsPrimaryAdmin = 0 WHERE UserType = 'Admin';
                UPDATE Users SET IsPrimaryAdmin = 1
                WHERE Id = (SELECT MIN(Id) FROM Users WHERE UserType = 'Admin');
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsPrimaryAdmin",
                table: "Users");
        }
    }
}
