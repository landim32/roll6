using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class RemoveCurrentMap : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 108: the data first, it needs status 4 and current_map_id, and the new index needs one piece per character.
            // An archived map keeps no characters, and a deleted one could never let them be placed again.
            migrationBuilder.Sql("""
                DELETE FROM map_tokens AS piece
                USING maps AS map
                WHERE map.map_id = piece.map_id
                  AND piece.campaign_character_id IS NOT NULL
                  AND map.status IN (2, 3);
                """);

            // Each character keeps the piece on the current map, else the one positioned last.
            migrationBuilder.Sql("""
                DELETE FROM map_tokens AS piece
                USING (
                    SELECT candidate.map_token_id,
                           row_number() OVER (
                               PARTITION BY candidate.campaign_character_id
                               ORDER BY CASE WHEN campaign.current_map_id = candidate.map_id THEN 0 ELSE 1 END,
                                        COALESCE(candidate.updated_at, candidate.created_at) DESC,
                                        candidate.map_token_id DESC) AS place
                    FROM map_tokens AS candidate
                    JOIN maps AS map ON map.map_id = candidate.map_id
                    JOIN campaigns AS campaign ON campaign.campaign_id = map.campaign_id
                    WHERE candidate.campaign_character_id IS NOT NULL
                ) AS ranked
                WHERE piece.map_token_id = ranked.map_token_id
                  AND ranked.place > 1;
                """);

            migrationBuilder.Sql("UPDATE maps SET status = 1 WHERE status = 4;");

            migrationBuilder.DropForeignKey(
                name: "fk_map_campaign_current",
                table: "campaigns");

            migrationBuilder.DropIndex(
                name: "ix_maps_campaign_current",
                table: "maps");

            migrationBuilder.DropIndex(
                name: "IX_map_tokens_campaign_character_id",
                table: "map_tokens");

            migrationBuilder.DropIndex(
                name: "ix_map_tokens_map_campaign_character",
                table: "map_tokens");

            migrationBuilder.DropIndex(
                name: "IX_campaigns_current_map_id",
                table: "campaigns");

            migrationBuilder.DropColumn(
                name: "current_map_id",
                table: "campaigns");

            migrationBuilder.CreateIndex(
                name: "ix_map_tokens_campaign_character",
                table: "map_tokens",
                column: "campaign_character_id",
                unique: true,
                filter: "campaign_character_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_map_tokens_map_id",
                table: "map_tokens",
                column: "map_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Only the schema comes back: the deleted pieces and which map was current are gone for good, so every campaign
            // ends up with no current map (current_map_id null and no map with status 4).
            migrationBuilder.DropIndex(
                name: "ix_map_tokens_campaign_character",
                table: "map_tokens");

            migrationBuilder.DropIndex(
                name: "IX_map_tokens_map_id",
                table: "map_tokens");

            migrationBuilder.AddColumn<long>(
                name: "current_map_id",
                table: "campaigns",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_maps_campaign_current",
                table: "maps",
                column: "campaign_id",
                unique: true,
                filter: "status = 4");

            migrationBuilder.CreateIndex(
                name: "IX_map_tokens_campaign_character_id",
                table: "map_tokens",
                column: "campaign_character_id");

            migrationBuilder.CreateIndex(
                name: "ix_map_tokens_map_campaign_character",
                table: "map_tokens",
                columns: new[] { "map_id", "campaign_character_id" },
                unique: true,
                filter: "campaign_character_id IS NOT NULL");

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
    }
}
