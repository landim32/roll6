using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddCampaignChat : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "audio",
                table: "turns",
                type: "character varying(260)",
                maxLength: 260,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "audio_seconds",
                table: "turns",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "turns",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "display_image",
                table: "turns",
                type: "character varying(260)",
                maxLength: 260,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "display_name",
                table: "turns",
                type: "character varying(260)",
                maxLength: 260,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "image",
                table: "turns",
                type: "character varying(260)",
                maxLength: 260,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "chat_reads",
                columns: table => new
                {
                    chat_read_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    campaign_id = table.Column<long>(type: "bigint", nullable: false),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    last_read_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("chat_reads_pkey", x => x.chat_read_id);
                    table.ForeignKey(
                        name: "fk_campaign_chat_read",
                        column: x => x.campaign_id,
                        principalTable: "campaigns",
                        principalColumn: "campaign_id");
                    table.ForeignKey(
                        name: "fk_user_chat_read",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateIndex(
                name: "ix_turns_campaign_created",
                table: "turns",
                columns: new[] { "campaign_id", "created_at", "turn_id" });

            migrationBuilder.CreateIndex(
                name: "ix_chat_reads_campaign_user",
                table: "chat_reads",
                columns: new[] { "campaign_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_chat_reads_user_id",
                table: "chat_reads",
                column: "user_id");

            // The turn log becomes the chat (041): every turn that already ended gets its "Turno N finalizado"
            // divider right after its last entry. Turns that never had an entry have nowhere to put one.
            migrationBuilder.Sql(@"
INSERT INTO turns (campaign_id, map_id, turn_no, turn_type, user_id, created_at)
SELECT t.campaign_id, NULL, t.turn_no, 9, c.user_id, MAX(t.created_at) + INTERVAL '1 millisecond'
FROM turns t
JOIN campaigns c ON c.campaign_id = t.campaign_id
WHERE t.turn_no < c.current_turn AND t.turn_type <> 9
GROUP BY t.campaign_id, t.turn_no, c.user_id;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "chat_reads");

            migrationBuilder.DropIndex(
                name: "ix_turns_campaign_created",
                table: "turns");

            migrationBuilder.DropColumn(
                name: "audio",
                table: "turns");

            migrationBuilder.DropColumn(
                name: "audio_seconds",
                table: "turns");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "turns");

            migrationBuilder.DropColumn(
                name: "display_image",
                table: "turns");

            migrationBuilder.DropColumn(
                name: "display_name",
                table: "turns");

            migrationBuilder.DropColumn(
                name: "image",
                table: "turns");
        }
    }
}
