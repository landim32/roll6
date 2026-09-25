using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SimpleTabletopMap.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddMapModelGridLayout : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "grid_height",
                table: "map_models",
                type: "integer",
                nullable: false,
                defaultValue: 20);

            migrationBuilder.AddColumn<int>(
                name: "grid_width",
                table: "map_models",
                type: "integer",
                nullable: false,
                defaultValue: 20);

            migrationBuilder.AddColumn<int>(
                name: "image_height",
                table: "map_models",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "image_left",
                table: "map_models",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "image_top",
                table: "map_models",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "image_width",
                table: "map_models",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "grid_height",
                table: "map_models");

            migrationBuilder.DropColumn(
                name: "grid_width",
                table: "map_models");

            migrationBuilder.DropColumn(
                name: "image_height",
                table: "map_models");

            migrationBuilder.DropColumn(
                name: "image_left",
                table: "map_models");

            migrationBuilder.DropColumn(
                name: "image_top",
                table: "map_models");

            migrationBuilder.DropColumn(
                name: "image_width",
                table: "map_models");
        }
    }
}
