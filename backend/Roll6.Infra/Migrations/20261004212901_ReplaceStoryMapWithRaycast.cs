using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class ReplaceStoryMapWithRaycast : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "kind",
                table: "map_models");

            migrationBuilder.DropColumn(
                name: "walls",
                table: "map_models");

            // The sky image of the 033 becomes the background of the 3D view (034): rename, keeping the data.
            migrationBuilder.RenameColumn(
                name: "sky_image",
                table: "map_models",
                newName: "background_image");

            migrationBuilder.AddColumn<string>(
                name: "mask_image",
                table: "map_models",
                type: "character varying(260)",
                maxLength: 260,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "front_image",
                table: "tokens",
                type: "character varying(260)",
                maxLength: 260,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "front_image",
                table: "tokens");

            migrationBuilder.DropColumn(
                name: "mask_image",
                table: "map_models");

            migrationBuilder.RenameColumn(
                name: "background_image",
                table: "map_models",
                newName: "sky_image");

            migrationBuilder.AddColumn<int>(
                name: "kind",
                table: "map_models",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<string>(
                name: "walls",
                table: "map_models",
                type: "jsonb",
                nullable: true);
        }
    }
}
