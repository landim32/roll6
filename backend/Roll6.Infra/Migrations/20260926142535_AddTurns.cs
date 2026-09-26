using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddTurns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "current_turn",
                table: "campaigns",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.CreateTable(
                name: "turns",
                columns: table => new
                {
                    turn_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    campaign_id = table.Column<long>(type: "bigint", nullable: false),
                    map_id = table.Column<long>(type: "bigint", nullable: true),
                    character_id = table.Column<long>(type: "bigint", nullable: true),
                    npc_id = table.Column<long>(type: "bigint", nullable: true),
                    map_npc_id = table.Column<long>(type: "bigint", nullable: true),
                    turn_no = table.Column<int>(type: "integer", nullable: false),
                    turn_type = table.Column<int>(type: "integer", nullable: false),
                    before_x = table.Column<int>(type: "integer", nullable: true),
                    before_y = table.Column<int>(type: "integer", nullable: true),
                    before_look = table.Column<int>(type: "integer", nullable: true),
                    x = table.Column<int>(type: "integer", nullable: true),
                    y = table.Column<int>(type: "integer", nullable: true),
                    look = table.Column<int>(type: "integer", nullable: true),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("turns_pkey", x => x.turn_id);
                    table.ForeignKey(
                        name: "fk_campaign_turn",
                        column: x => x.campaign_id,
                        principalTable: "campaigns",
                        principalColumn: "campaign_id");
                    table.ForeignKey(
                        name: "fk_character_turn",
                        column: x => x.character_id,
                        principalTable: "characters",
                        principalColumn: "character_id");
                    table.ForeignKey(
                        name: "fk_map_npc_turn",
                        column: x => x.map_npc_id,
                        principalTable: "map_npcs",
                        principalColumn: "map_npc_id");
                    table.ForeignKey(
                        name: "fk_map_turn",
                        column: x => x.map_id,
                        principalTable: "maps",
                        principalColumn: "map_id");
                    table.ForeignKey(
                        name: "fk_npc_turn",
                        column: x => x.npc_id,
                        principalTable: "npcs",
                        principalColumn: "npc_id");
                });

            migrationBuilder.CreateIndex(
                name: "ix_turns_campaign_turn",
                table: "turns",
                columns: new[] { "campaign_id", "turn_no" });

            migrationBuilder.CreateIndex(
                name: "IX_turns_character_id",
                table: "turns",
                column: "character_id");

            migrationBuilder.CreateIndex(
                name: "IX_turns_map_id",
                table: "turns",
                column: "map_id");

            migrationBuilder.CreateIndex(
                name: "IX_turns_map_npc_id",
                table: "turns",
                column: "map_npc_id");

            migrationBuilder.CreateIndex(
                name: "IX_turns_npc_id",
                table: "turns",
                column: "npc_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "turns");

            migrationBuilder.DropColumn(
                name: "current_turn",
                table: "campaigns");
        }
    }
}
