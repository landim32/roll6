using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddCampaignCharacterMove : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "current_move",
                table: "campaign_characters",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            // Every existing participation starts at the character's move, so nobody moves differently (037 FR-002).
            migrationBuilder.Sql(
                "UPDATE campaign_characters cc SET current_move = c.move FROM characters c WHERE c.character_id = cc.character_id;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "current_move",
                table: "campaign_characters");
        }
    }
}
