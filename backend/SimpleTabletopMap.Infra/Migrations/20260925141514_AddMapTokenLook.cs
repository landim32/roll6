using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SimpleTabletopMap.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddMapTokenLook : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "look",
                table: "map_tokens",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "look",
                table: "map_tokens");
        }
    }
}
