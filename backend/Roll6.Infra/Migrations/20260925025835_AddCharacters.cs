using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddCharacters : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "characters",
                columns: table => new
                {
                    character_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    name = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: false),
                    sheet = table.Column<string>(type: "character varying(20000)", maxLength: 20000, nullable: true),
                    life = table.Column<int>(type: "integer", nullable: false),
                    energy = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: true),
                    move = table.Column<int>(type: "integer", nullable: false),
                    image = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("characters_pkey", x => x.character_id);
                    table.ForeignKey(
                        name: "fk_user_character",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_characters_user_id",
                table: "characters",
                column: "user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "characters");
        }
    }
}
