using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddChatWhispers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_whisper",
                table: "turns",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "turn_whisper_targets",
                columns: table => new
                {
                    turn_whisper_target_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    turn_id = table.Column<long>(type: "bigint", nullable: false),
                    character_id = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("turn_whisper_targets_pkey", x => x.turn_whisper_target_id);
                    table.ForeignKey(
                        name: "fk_character_whisper_target",
                        column: x => x.character_id,
                        principalTable: "characters",
                        principalColumn: "character_id");
                    table.ForeignKey(
                        name: "fk_turn_whisper_target",
                        column: x => x.turn_id,
                        principalTable: "turns",
                        principalColumn: "turn_id");
                });

            migrationBuilder.CreateIndex(
                name: "ix_turn_whisper_targets_character",
                table: "turn_whisper_targets",
                column: "character_id");

            migrationBuilder.CreateIndex(
                name: "ix_turn_whisper_targets_turn",
                table: "turn_whisper_targets",
                column: "turn_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "turn_whisper_targets");

            migrationBuilder.DropColumn(
                name: "is_whisper",
                table: "turns");
        }
    }
}
