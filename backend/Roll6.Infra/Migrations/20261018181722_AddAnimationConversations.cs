using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddAnimationConversations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "animation_conversations",
                columns: table => new
                {
                    animation_conversation_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    animation_id = table.Column<long>(type: "bigint", nullable: false),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    claude_session_id = table.Column<Guid>(type: "uuid", nullable: false),
                    started = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()"),
                    closed_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("animation_conversations_pkey", x => x.animation_conversation_id);
                    table.ForeignKey(
                        name: "fk_animation_animation_conversation",
                        column: x => x.animation_id,
                        principalTable: "animations",
                        principalColumn: "animation_id");
                    table.ForeignKey(
                        name: "fk_user_animation_conversation",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateTable(
                name: "animation_messages",
                columns: table => new
                {
                    animation_message_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    animation_conversation_id = table.Column<long>(type: "bigint", nullable: false),
                    role = table.Column<int>(type: "integer", nullable: false),
                    text = table.Column<string>(type: "character varying(20000)", maxLength: 20000, nullable: false),
                    image_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("animation_messages_pkey", x => x.animation_message_id);
                    table.ForeignKey(
                        name: "fk_animation_conversation_message",
                        column: x => x.animation_conversation_id,
                        principalTable: "animation_conversations",
                        principalColumn: "animation_conversation_id");
                });

            migrationBuilder.CreateIndex(
                name: "ix_animation_conversations_open",
                table: "animation_conversations",
                column: "animation_id",
                unique: true,
                filter: "closed_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "ix_animation_conversations_user",
                table: "animation_conversations",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_animation_messages_conversation",
                table: "animation_messages",
                column: "animation_conversation_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "animation_messages");

            migrationBuilder.DropTable(
                name: "animation_conversations");
        }
    }
}
