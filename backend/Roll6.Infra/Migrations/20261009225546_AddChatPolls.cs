using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddChatPolls : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "chat_poll_options",
                columns: table => new
                {
                    chat_poll_option_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    turn_id = table.Column<long>(type: "bigint", nullable: false),
                    position = table.Column<int>(type: "integer", nullable: false),
                    text = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("chat_poll_options_pkey", x => x.chat_poll_option_id);
                    table.ForeignKey(
                        name: "fk_turn_chat_poll_option",
                        column: x => x.turn_id,
                        principalTable: "turns",
                        principalColumn: "turn_id");
                });

            migrationBuilder.CreateTable(
                name: "chat_poll_votes",
                columns: table => new
                {
                    chat_poll_vote_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    turn_id = table.Column<long>(type: "bigint", nullable: false),
                    chat_poll_option_id = table.Column<long>(type: "bigint", nullable: false),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    character_id = table.Column<long>(type: "bigint", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("chat_poll_votes_pkey", x => x.chat_poll_vote_id);
                    table.ForeignKey(
                        name: "fk_character_chat_poll_vote",
                        column: x => x.character_id,
                        principalTable: "characters",
                        principalColumn: "character_id");
                    table.ForeignKey(
                        name: "fk_chat_poll_option_vote",
                        column: x => x.chat_poll_option_id,
                        principalTable: "chat_poll_options",
                        principalColumn: "chat_poll_option_id");
                    table.ForeignKey(
                        name: "fk_turn_chat_poll_vote",
                        column: x => x.turn_id,
                        principalTable: "turns",
                        principalColumn: "turn_id");
                    table.ForeignKey(
                        name: "fk_user_chat_poll_vote",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateIndex(
                name: "ix_chat_poll_options_turn_position",
                table: "chat_poll_options",
                columns: new[] { "turn_id", "position" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_chat_poll_votes_character",
                table: "chat_poll_votes",
                columns: new[] { "turn_id", "character_id" },
                unique: true,
                filter: "character_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_chat_poll_votes_character_id",
                table: "chat_poll_votes",
                column: "character_id");

            migrationBuilder.CreateIndex(
                name: "ix_chat_poll_votes_master",
                table: "chat_poll_votes",
                column: "turn_id",
                unique: true,
                filter: "character_id IS NULL");

            migrationBuilder.CreateIndex(
                name: "ix_chat_poll_votes_option",
                table: "chat_poll_votes",
                column: "chat_poll_option_id");

            migrationBuilder.CreateIndex(
                name: "IX_chat_poll_votes_user_id",
                table: "chat_poll_votes",
                column: "user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "chat_poll_votes");

            migrationBuilder.DropTable(
                name: "chat_poll_options");
        }
    }
}
