using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SimpleTabletopMap.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddCampaignOpenAndCharacters : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "open",
                table: "campaigns",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "campaign_characters",
                columns: table => new
                {
                    campaign_character_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    campaign_id = table.Column<long>(type: "bigint", nullable: false),
                    character_id = table.Column<long>(type: "bigint", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("campaign_characters_pkey", x => x.campaign_character_id);
                    table.ForeignKey(
                        name: "fk_campaign_campaign_character",
                        column: x => x.campaign_id,
                        principalTable: "campaigns",
                        principalColumn: "campaign_id");
                    table.ForeignKey(
                        name: "fk_character_campaign_character",
                        column: x => x.character_id,
                        principalTable: "characters",
                        principalColumn: "character_id");
                });

            migrationBuilder.CreateIndex(
                name: "ix_campaign_characters_campaign_character",
                table: "campaign_characters",
                columns: new[] { "campaign_id", "character_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_campaign_characters_character_id",
                table: "campaign_characters",
                column: "character_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "campaign_characters");

            migrationBuilder.DropColumn(
                name: "open",
                table: "campaigns");
        }
    }
}
