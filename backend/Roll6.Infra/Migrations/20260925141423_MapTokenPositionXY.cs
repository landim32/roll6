using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class MapTokenPositionXY : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "r",
                table: "map_tokens",
                newName: "y");

            migrationBuilder.RenameColumn(
                name: "q",
                table: "map_tokens",
                newName: "x");

            // Axial (q, r) → "odd-q" column/row, keeping every token on the same cell:
            // x = q; y = r + (q - (q & 1)) / 2 (Red Blob Games, "Offset coordinates").
            migrationBuilder.Sql("UPDATE map_tokens SET y = y + (x - (x & 1)) / 2;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // "odd-q" column/row → axial: r = y - (x - (x & 1)) / 2.
            migrationBuilder.Sql("UPDATE map_tokens SET y = y - (x - (x & 1)) / 2;");

            migrationBuilder.RenameColumn(
                name: "y",
                table: "map_tokens",
                newName: "r");

            migrationBuilder.RenameColumn(
                name: "x",
                table: "map_tokens",
                newName: "q");
        }
    }
}
