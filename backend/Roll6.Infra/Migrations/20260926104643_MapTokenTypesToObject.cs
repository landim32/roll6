using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class MapTokenTypesToObject : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Only Character (1), Npc (2, linked to a map NPC) and Object (4) remain: Enemy (3) and NPC pieces
            // placed from the hex menu (no map NPC) become objects.
            migrationBuilder.Sql(
                "UPDATE map_tokens SET token_type = 4 WHERE token_type = 3 OR (token_type = 2 AND map_npc_id IS NULL);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Data-only change: the former type of converted pieces is not kept.
        }
    }
}
