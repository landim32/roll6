using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddCurrentMapStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 078: each campaign's current map becomes "Atual" (status 4); a pointer to a map that is not (only possible
            // before 048 refused archived maps) is cleared, so the pointer and the status always agree.
            migrationBuilder.Sql(@"UPDATE maps m SET status = 4 FROM campaigns c WHERE c.current_map_id = m.map_id AND m.status = 1;");
            migrationBuilder.Sql(@"UPDATE campaigns SET current_map_id = NULL WHERE current_map_id IS NOT NULL AND current_map_id NOT IN (SELECT map_id FROM maps WHERE status = 4);");

            migrationBuilder.CreateIndex(
                name: "ix_maps_campaign_current",
                table: "maps",
                column: "campaign_id",
                unique: true,
                filter: "status = 4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_maps_campaign_current",
                table: "maps");

            migrationBuilder.Sql(@"UPDATE maps SET status = 1 WHERE status = 4;");
        }
    }
}
