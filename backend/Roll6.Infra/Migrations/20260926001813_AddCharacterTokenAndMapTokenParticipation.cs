using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddCharacterTokenAndMapTokenParticipation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_map_tokens_map_id",
                table: "map_tokens");

            migrationBuilder.AddColumn<long>(
                name: "campaign_character_id",
                table: "map_tokens",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "token_id",
                table: "characters",
                type: "bigint",
                nullable: true);

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
                name: "IX_characters_token_id",
                table: "characters",
                column: "token_id");

            migrationBuilder.AddForeignKey(
                name: "fk_token_character",
                table: "characters",
                column: "token_id",
                principalTable: "tokens",
                principalColumn: "token_id");

            migrationBuilder.AddForeignKey(
                name: "fk_campaign_character_map_token",
                table: "map_tokens",
                column: "campaign_character_id",
                principalTable: "campaign_characters",
                principalColumn: "campaign_character_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_token_character",
                table: "characters");

            migrationBuilder.DropForeignKey(
                name: "fk_campaign_character_map_token",
                table: "map_tokens");

            migrationBuilder.DropIndex(
                name: "IX_map_tokens_campaign_character_id",
                table: "map_tokens");

            migrationBuilder.DropIndex(
                name: "ix_map_tokens_map_campaign_character",
                table: "map_tokens");

            migrationBuilder.DropIndex(
                name: "IX_characters_token_id",
                table: "characters");

            migrationBuilder.DropColumn(
                name: "campaign_character_id",
                table: "map_tokens");

            migrationBuilder.DropColumn(
                name: "token_id",
                table: "characters");

            migrationBuilder.CreateIndex(
                name: "IX_map_tokens_map_id",
                table: "map_tokens",
                column: "map_id");
        }
    }
}
