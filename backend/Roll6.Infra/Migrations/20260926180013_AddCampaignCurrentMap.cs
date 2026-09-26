using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddCampaignCurrentMap : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "current_map_id",
                table: "campaigns",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_campaigns_current_map_id",
                table: "campaigns",
                column: "current_map_id");

            migrationBuilder.AddForeignKey(
                name: "fk_map_campaign_current",
                table: "campaigns",
                column: "current_map_id",
                principalTable: "maps",
                principalColumn: "map_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_map_campaign_current",
                table: "campaigns");

            migrationBuilder.DropIndex(
                name: "IX_campaigns_current_map_id",
                table: "campaigns");

            migrationBuilder.DropColumn(
                name: "current_map_id",
                table: "campaigns");
        }
    }
}
