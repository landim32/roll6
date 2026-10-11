using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddTurnChatAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "chat_at",
                table: "turns",
                type: "timestamp without time zone",
                nullable: false,
                defaultValueSql: "now()");

            // Every existing entry keeps its place: the chat time is the creation time (polls move only on new votes).
            migrationBuilder.Sql("UPDATE turns SET chat_at = created_at;");

            migrationBuilder.CreateIndex(
                name: "ix_turns_campaign_chat",
                table: "turns",
                columns: new[] { "campaign_id", "chat_at", "turn_id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_turns_campaign_chat",
                table: "turns");

            migrationBuilder.DropColumn(
                name: "chat_at",
                table: "turns");
        }
    }
}
