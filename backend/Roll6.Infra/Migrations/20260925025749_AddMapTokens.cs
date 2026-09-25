using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddMapTokens : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "map_tokens",
                columns: table => new
                {
                    map_token_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    map_id = table.Column<long>(type: "bigint", nullable: false),
                    token_id = table.Column<long>(type: "bigint", nullable: false),
                    name = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: false),
                    token_type = table.Column<int>(type: "integer", nullable: false),
                    sheet = table.Column<string>(type: "character varying(20000)", maxLength: 20000, nullable: true),
                    life = table.Column<int>(type: "integer", nullable: false),
                    energy = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: true),
                    move = table.Column<int>(type: "integer", nullable: false),
                    q = table.Column<int>(type: "integer", nullable: false),
                    r = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("map_tokens_pkey", x => x.map_token_id);
                    table.ForeignKey(
                        name: "fk_map_map_token",
                        column: x => x.map_id,
                        principalTable: "maps",
                        principalColumn: "map_id");
                    table.ForeignKey(
                        name: "fk_token_map_token",
                        column: x => x.token_id,
                        principalTable: "tokens",
                        principalColumn: "token_id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_map_tokens_map_id",
                table: "map_tokens",
                column: "map_id");

            migrationBuilder.CreateIndex(
                name: "IX_map_tokens_token_id",
                table: "map_tokens",
                column: "token_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "map_tokens");
        }
    }
}
