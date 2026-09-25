using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddCampaignsAndMaps : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "campaigns",
                columns: table => new
                {
                    campaign_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    name = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("campaigns_pkey", x => x.campaign_id);
                    table.ForeignKey(
                        name: "fk_user_campaign",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateTable(
                name: "maps",
                columns: table => new
                {
                    map_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    campaign_id = table.Column<long>(type: "bigint", nullable: false),
                    map_model_id = table.Column<long>(type: "bigint", nullable: false),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    sequence = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("maps_pkey", x => x.map_id);
                    table.ForeignKey(
                        name: "fk_campaign_map",
                        column: x => x.campaign_id,
                        principalTable: "campaigns",
                        principalColumn: "campaign_id");
                    table.ForeignKey(
                        name: "fk_map_model_map",
                        column: x => x.map_model_id,
                        principalTable: "map_models",
                        principalColumn: "map_model_id");
                    table.ForeignKey(
                        name: "fk_user_map",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_campaigns_user_id",
                table: "campaigns",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_maps_campaign_model_sequence",
                table: "maps",
                columns: new[] { "campaign_id", "map_model_id", "sequence" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_maps_map_model_id",
                table: "maps",
                column: "map_model_id");

            migrationBuilder.CreateIndex(
                name: "IX_maps_user_id",
                table: "maps",
                column: "user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "maps");

            migrationBuilder.DropTable(
                name: "campaigns");
        }
    }
}
