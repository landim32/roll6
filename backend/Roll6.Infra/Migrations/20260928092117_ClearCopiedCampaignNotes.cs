using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class ClearCopiedCampaignNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // The participation sheet became the campaign notes (only what changed in the campaign): drop the
            // untouched copies of the character's sheet taken on joining. Edited sheets are kept as they are.
            migrationBuilder.Sql("""
                UPDATE campaign_characters AS cc
                SET sheet = NULL
                FROM characters AS c
                WHERE c.character_id = cc.character_id
                  AND cc.sheet IS NOT NULL
                  AND cc.sheet = c.sheet;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Data only: the cleared copies equal the character's sheet and are not restored.
        }
    }
}
