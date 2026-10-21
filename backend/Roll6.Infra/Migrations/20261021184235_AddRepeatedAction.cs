using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddRepeatedAction : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "repeated",
                table: "turns",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "repeated_action",
                table: "map_npcs",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "repeated_action_user_id",
                table: "map_npcs",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "repeated_action",
                table: "campaign_characters",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "repeated_action_user_id",
                table: "campaign_characters",
                type: "bigint",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "repeated",
                table: "turns");

            migrationBuilder.DropColumn(
                name: "repeated_action",
                table: "map_npcs");

            migrationBuilder.DropColumn(
                name: "repeated_action_user_id",
                table: "map_npcs");

            migrationBuilder.DropColumn(
                name: "repeated_action",
                table: "campaign_characters");

            migrationBuilder.DropColumn(
                name: "repeated_action_user_id",
                table: "campaign_characters");
        }
    }
}
