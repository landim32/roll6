using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddNpcs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "map_npc_id",
                table: "map_tokens",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "npcs",
                columns: table => new
                {
                    npc_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    token_id = table.Column<long>(type: "bigint", nullable: false),
                    name = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: false),
                    life = table.Column<int>(type: "integer", nullable: false),
                    energy = table.Column<int>(type: "integer", nullable: false),
                    move = table.Column<int>(type: "integer", nullable: false),
                    sheet = table.Column<string>(type: "character varying(20000)", maxLength: 20000, nullable: true),
                    image = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("npcs_pkey", x => x.npc_id);
                    table.ForeignKey(
                        name: "fk_token_npc",
                        column: x => x.token_id,
                        principalTable: "tokens",
                        principalColumn: "token_id");
                    table.ForeignKey(
                        name: "fk_user_npc",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateTable(
                name: "campaign_npcs",
                columns: table => new
                {
                    campaign_npc_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    campaign_id = table.Column<long>(type: "bigint", nullable: false),
                    npc_id = table.Column<long>(type: "bigint", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("campaign_npcs_pkey", x => x.campaign_npc_id);
                    table.ForeignKey(
                        name: "fk_campaign_campaign_npc",
                        column: x => x.campaign_id,
                        principalTable: "campaigns",
                        principalColumn: "campaign_id");
                    table.ForeignKey(
                        name: "fk_npc_campaign_npc",
                        column: x => x.npc_id,
                        principalTable: "npcs",
                        principalColumn: "npc_id");
                });

            migrationBuilder.CreateTable(
                name: "map_npcs",
                columns: table => new
                {
                    map_npc_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    map_id = table.Column<long>(type: "bigint", nullable: false),
                    npc_id = table.Column<long>(type: "bigint", nullable: false),
                    name = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: false),
                    life = table.Column<int>(type: "integer", nullable: false),
                    energy = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("map_npcs_pkey", x => x.map_npc_id);
                    table.ForeignKey(
                        name: "fk_map_map_npc",
                        column: x => x.map_id,
                        principalTable: "maps",
                        principalColumn: "map_id");
                    table.ForeignKey(
                        name: "fk_npc_map_npc",
                        column: x => x.npc_id,
                        principalTable: "npcs",
                        principalColumn: "npc_id");
                });

            migrationBuilder.CreateIndex(
                name: "ix_map_tokens_map_npc",
                table: "map_tokens",
                column: "map_npc_id",
                unique: true,
                filter: "map_npc_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_campaign_npcs_campaign_npc",
                table: "campaign_npcs",
                columns: new[] { "campaign_id", "npc_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_campaign_npcs_npc_id",
                table: "campaign_npcs",
                column: "npc_id");

            migrationBuilder.CreateIndex(
                name: "IX_map_npcs_map_id",
                table: "map_npcs",
                column: "map_id");

            migrationBuilder.CreateIndex(
                name: "IX_map_npcs_npc_id",
                table: "map_npcs",
                column: "npc_id");

            migrationBuilder.CreateIndex(
                name: "IX_npcs_token_id",
                table: "npcs",
                column: "token_id");

            migrationBuilder.CreateIndex(
                name: "IX_npcs_user_id",
                table: "npcs",
                column: "user_id");

            migrationBuilder.AddForeignKey(
                name: "fk_map_npc_map_token",
                table: "map_tokens",
                column: "map_npc_id",
                principalTable: "map_npcs",
                principalColumn: "map_npc_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_map_npc_map_token",
                table: "map_tokens");

            migrationBuilder.DropTable(
                name: "campaign_npcs");

            migrationBuilder.DropTable(
                name: "map_npcs");

            migrationBuilder.DropTable(
                name: "npcs");

            migrationBuilder.DropIndex(
                name: "ix_map_tokens_map_npc",
                table: "map_tokens");

            migrationBuilder.DropColumn(
                name: "map_npc_id",
                table: "map_tokens");
        }
    }
}
