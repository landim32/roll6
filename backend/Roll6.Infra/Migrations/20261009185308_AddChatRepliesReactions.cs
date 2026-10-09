using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddChatRepliesReactions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "cancelled_at",
                table: "turns",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "reply_to_turn_id",
                table: "turns",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "chat_reactions",
                columns: table => new
                {
                    chat_reaction_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    turn_id = table.Column<long>(type: "bigint", nullable: false),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    kind = table.Column<short>(type: "smallint", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("chat_reactions_pkey", x => x.chat_reaction_id);
                    table.ForeignKey(
                        name: "fk_turn_chat_reaction",
                        column: x => x.turn_id,
                        principalTable: "turns",
                        principalColumn: "turn_id");
                    table.ForeignKey(
                        name: "fk_user_chat_reaction",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateIndex(
                name: "ix_turns_reply_to",
                table: "turns",
                column: "reply_to_turn_id");

            migrationBuilder.CreateIndex(
                name: "ix_chat_reactions_turn_user",
                table: "chat_reactions",
                columns: new[] { "turn_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_chat_reactions_user_id",
                table: "chat_reactions",
                column: "user_id");

            migrationBuilder.AddForeignKey(
                name: "fk_turn_reply",
                table: "turns",
                column: "reply_to_turn_id",
                principalTable: "turns",
                principalColumn: "turn_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_turn_reply",
                table: "turns");

            migrationBuilder.DropTable(
                name: "chat_reactions");

            migrationBuilder.DropIndex(
                name: "ix_turns_reply_to",
                table: "turns");

            migrationBuilder.DropColumn(
                name: "cancelled_at",
                table: "turns");

            migrationBuilder.DropColumn(
                name: "reply_to_turn_id",
                table: "turns");
        }
    }
}
