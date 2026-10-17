using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddWeapons : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "left_weapon_grip",
                table: "tokens",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "left_weapon_id",
                table: "tokens",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "right_weapon_grip",
                table: "tokens",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "right_weapon_id",
                table: "tokens",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "weapons",
                columns: table => new
                {
                    weapon_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    model_file = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("weapons_pkey", x => x.weapon_id);
                    table.ForeignKey(
                        name: "fk_weapon_user",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateIndex(
                name: "ix_tokens_left_weapon",
                table: "tokens",
                column: "left_weapon_id");

            migrationBuilder.CreateIndex(
                name: "ix_tokens_right_weapon",
                table: "tokens",
                column: "right_weapon_id");

            migrationBuilder.CreateIndex(
                name: "ix_weapons_user",
                table: "weapons",
                column: "user_id");

            migrationBuilder.AddForeignKey(
                name: "fk_token_left_weapon",
                table: "tokens",
                column: "left_weapon_id",
                principalTable: "weapons",
                principalColumn: "weapon_id");

            migrationBuilder.AddForeignKey(
                name: "fk_token_right_weapon",
                table: "tokens",
                column: "right_weapon_id",
                principalTable: "weapons",
                principalColumn: "weapon_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_token_left_weapon",
                table: "tokens");

            migrationBuilder.DropForeignKey(
                name: "fk_token_right_weapon",
                table: "tokens");

            migrationBuilder.DropTable(
                name: "weapons");

            migrationBuilder.DropIndex(
                name: "ix_tokens_left_weapon",
                table: "tokens");

            migrationBuilder.DropIndex(
                name: "ix_tokens_right_weapon",
                table: "tokens");

            migrationBuilder.DropColumn(
                name: "left_weapon_grip",
                table: "tokens");

            migrationBuilder.DropColumn(
                name: "left_weapon_id",
                table: "tokens");

            migrationBuilder.DropColumn(
                name: "right_weapon_grip",
                table: "tokens");

            migrationBuilder.DropColumn(
                name: "right_weapon_id",
                table: "tokens");
        }
    }
}
