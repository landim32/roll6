using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddMapNpcInstances : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "current_move",
                table: "map_npcs",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            // Every existing instance starts with the NPC's move as its Deslocamento (051).
            migrationBuilder.Sql("UPDATE map_npcs m SET current_move = n.move FROM npcs n WHERE n.npc_id = m.npc_id;");

            migrationBuilder.AddColumn<DateTime>(
                name: "removed_at",
                table: "map_npcs",
                type: "timestamp without time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "current_move",
                table: "map_npcs");

            migrationBuilder.DropColumn(
                name: "removed_at",
                table: "map_npcs");
        }
    }
}
