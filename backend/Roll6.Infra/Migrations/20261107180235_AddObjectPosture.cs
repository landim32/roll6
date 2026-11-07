using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddObjectPosture : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "posture",
                table: "map_tokens",
                type: "integer",
                nullable: false,
                defaultValue: 1);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "posture",
                table: "map_tokens");
        }
    }
}
