using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddChatAsk : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ask_state",
                table: "turns",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "edited_at",
                table: "turns",
                type: "timestamp without time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ask_state",
                table: "turns");

            migrationBuilder.DropColumn(
                name: "edited_at",
                table: "turns");
        }
    }
}
