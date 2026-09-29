using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddPostureAndTokenSpaces : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "posture",
                table: "map_npcs",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "posture",
                table: "campaign_characters",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            // Token sizes are limited to 1, 2, 3, 7 or 10 hexes (031): invalid standing sizes become 1, invalid down sizes 2.
            migrationBuilder.Sql("UPDATE tokens SET up_space = 1 WHERE up_space NOT IN (1, 2, 3, 7, 10);");
            migrationBuilder.Sql("UPDATE tokens SET down_space = 2 WHERE down_space IS NOT NULL AND down_space NOT IN (1, 2, 3, 7, 10);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "posture",
                table: "map_npcs");

            migrationBuilder.DropColumn(
                name: "posture",
                table: "campaign_characters");
        }
    }
}
