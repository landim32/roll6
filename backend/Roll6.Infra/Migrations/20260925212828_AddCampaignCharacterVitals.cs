using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddCampaignCharacterVitals : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "current_energy",
                table: "campaign_characters",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "current_life",
                table: "campaign_characters",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            // Existing participations start with the character's totals (FR-012).
            migrationBuilder.Sql(
                "UPDATE campaign_characters cc SET current_life = c.life, current_energy = c.energy " +
                "FROM characters c WHERE c.character_id = cc.character_id;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "current_energy",
                table: "campaign_characters");

            migrationBuilder.DropColumn(
                name: "current_life",
                table: "campaign_characters");
        }
    }
}
