using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddMapTokenWalkPosition : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "walk_x",
                table: "map_tokens",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "walk_y",
                table: "map_tokens",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "walk_yaw",
                table: "map_tokens",
                type: "double precision",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "walk_x",
                table: "map_tokens");

            migrationBuilder.DropColumn(
                name: "walk_y",
                table: "map_tokens");

            migrationBuilder.DropColumn(
                name: "walk_yaw",
                table: "map_tokens");
        }
    }
}
