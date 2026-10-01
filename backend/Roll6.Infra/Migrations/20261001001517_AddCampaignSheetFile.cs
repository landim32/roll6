using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddCampaignSheetFile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "sheet_file",
                table: "campaign_characters",
                type: "character varying(260)",
                maxLength: 260,
                nullable: true);

            // 032: the campaign sheet becomes a copy of the character's sheet (reverting the campaign notes of 023).
            // Existing notes are kept and appended under a heading, so nothing is lost; the copied text is the one
            // truncated when the two together would not fit the 20000-character column (the outer left() only guards
            // the pathological case of notes that alone already exceed the limit). The sheet file is a shared
            // reference to an immutable stored object, so copying it is just copying the name.
            // Both FROM items are joined in WHERE, not with JOIN ... ON: inside an UPDATE the target table (cc) may
            // only be referenced from WHERE, so "JOIN prepared p ON p... = cc..." fails with
            // "invalid reference to FROM-clause entry for table cc". Same shape as ClearCopiedCampaignNotes.
            migrationBuilder.Sql("""
                WITH prepared AS (
                    SELECT cc.campaign_character_id,
                           CASE WHEN cc.sheet IS NULL OR btrim(cc.sheet) = ''
                                THEN ''
                                ELSE E'\n\n## Anotações anteriores da campanha\n\n' || cc.sheet
                           END AS suffix
                    FROM campaign_characters AS cc
                )
                UPDATE campaign_characters AS cc
                SET sheet_file = c.sheet_file,
                    sheet = left(
                              left(coalesce(c.sheet, ''), greatest(0, 20000 - length(p.suffix))) || p.suffix,
                              20000)
                FROM characters AS c, prepared AS p
                WHERE c.character_id = cc.character_id
                  AND p.campaign_character_id = cc.character_id;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Only the column is reverted: the campaign sheet text cannot go back to the 023 notes, because the
            // copy of the character's sheet replaced them and the original notes are now a section inside it.
            migrationBuilder.DropColumn(
                name: "sheet_file",
                table: "campaign_characters");
        }
    }
}
