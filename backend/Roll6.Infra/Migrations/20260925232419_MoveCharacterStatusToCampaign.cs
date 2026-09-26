using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class MoveCharacterStatusToCampaign : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "character_status",
                table: "campaign_characters",
                type: "character varying(260)",
                maxLength: 260,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "sheet",
                table: "campaign_characters",
                type: "character varying(20000)",
                maxLength: 20000,
                nullable: true);

            // Every participation gets the character's status and a copy of its sheet (010 FR-005).
            migrationBuilder.Sql(
                "UPDATE campaign_characters cc SET character_status = c.status, sheet = c.sheet " +
                "FROM characters c WHERE c.character_id = cc.character_id;");

            migrationBuilder.DropColumn(
                name: "status",
                table: "characters");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "status",
                table: "characters",
                type: "character varying(260)",
                maxLength: 260,
                nullable: true);

            // Back to the character: the status of its most recently updated participation.
            migrationBuilder.Sql(
                "UPDATE characters c SET status = cc.character_status " +
                "FROM (SELECT DISTINCT ON (character_id) character_id, character_status FROM campaign_characters " +
                "ORDER BY character_id, updated_at DESC) cc WHERE cc.character_id = c.character_id;");

            migrationBuilder.DropColumn(
                name: "character_status",
                table: "campaign_characters");

            migrationBuilder.DropColumn(
                name: "sheet",
                table: "campaign_characters");
        }
    }
}
