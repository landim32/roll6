using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddCampaignNpcCategory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "category",
                table: "campaign_npcs",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<long>(
                name: "master_campaign_character_id",
                table: "campaign_npcs",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_campaign_npcs_master",
                table: "campaign_npcs",
                column: "master_campaign_character_id");

            migrationBuilder.AddForeignKey(
                name: "fk_campaign_npc_master",
                table: "campaign_npcs",
                column: "master_campaign_character_id",
                principalTable: "campaign_characters",
                principalColumn: "campaign_character_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_campaign_npc_master",
                table: "campaign_npcs");

            migrationBuilder.DropIndex(
                name: "ix_campaign_npcs_master",
                table: "campaign_npcs");

            migrationBuilder.DropColumn(
                name: "category",
                table: "campaign_npcs");

            migrationBuilder.DropColumn(
                name: "master_campaign_character_id",
                table: "campaign_npcs");
        }
    }
}
