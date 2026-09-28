using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class RenameMapNpcCurrentVitals : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "life",
                table: "map_npcs",
                newName: "current_life");

            migrationBuilder.RenameColumn(
                name: "energy",
                table: "map_npcs",
                newName: "current_energy");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "current_life",
                table: "map_npcs",
                newName: "life");

            migrationBuilder.RenameColumn(
                name: "current_energy",
                table: "map_npcs",
                newName: "energy");
        }
    }
}
