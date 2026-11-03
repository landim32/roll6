using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddMapPaint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "map_drawings",
                columns: table => new
                {
                    map_drawing_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    map_id = table.Column<long>(type: "bigint", nullable: false),
                    kind = table.Column<int>(type: "integer", nullable: false),
                    points = table.Column<string>(type: "jsonb", nullable: false),
                    color = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: false),
                    width = table.Column<int>(type: "integer", nullable: false),
                    opacity = table.Column<float>(type: "real", nullable: false),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("map_drawings_pkey", x => x.map_drawing_id);
                    table.ForeignKey(
                        name: "fk_map_drawing",
                        column: x => x.map_id,
                        principalTable: "maps",
                        principalColumn: "map_id");
                    table.ForeignKey(
                        name: "fk_user_map_drawing",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateTable(
                name: "map_hex_marks",
                columns: table => new
                {
                    map_hex_mark_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    map_id = table.Column<long>(type: "bigint", nullable: false),
                    x = table.Column<int>(type: "integer", nullable: false),
                    y = table.Column<int>(type: "integer", nullable: false),
                    kind = table.Column<int>(type: "integer", nullable: false),
                    text = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("map_hex_marks_pkey", x => x.map_hex_mark_id);
                    table.ForeignKey(
                        name: "fk_map_hex_mark",
                        column: x => x.map_id,
                        principalTable: "maps",
                        principalColumn: "map_id");
                    table.ForeignKey(
                        name: "fk_user_map_hex_mark",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateIndex(
                name: "ix_map_drawings_map",
                table: "map_drawings",
                columns: new[] { "map_id", "map_drawing_id" });

            migrationBuilder.CreateIndex(
                name: "IX_map_drawings_user_id",
                table: "map_drawings",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_map_hex_marks_map_hex",
                table: "map_hex_marks",
                columns: new[] { "map_id", "x", "y" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_map_hex_marks_user_id",
                table: "map_hex_marks",
                column: "user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "map_drawings");

            migrationBuilder.DropTable(
                name: "map_hex_marks");
        }
    }
}
