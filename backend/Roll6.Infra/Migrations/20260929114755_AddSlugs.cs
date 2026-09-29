using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddSlugs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Nullable first so existing rows can be filled before the unique indexes exist.
            migrationBuilder.AddColumn<string>(
                name: "slug",
                table: "campaigns",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "slug",
                table: "maps",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            // pt-BR accents via translate (no unaccent extension). Duplicates get -n; a second pass
            // appends -{id} when "Teste" ×2 and "Teste 2" still collide.
            migrationBuilder.Sql("""
                UPDATE campaigns AS c
                SET slug = s.slug
                FROM (
                    SELECT campaign_id,
                           CASE WHEN n = 1 THEN base ELSE base || '-' || n::text END AS slug
                    FROM (
                        SELECT campaign_id,
                               base,
                               row_number() OVER (PARTITION BY base ORDER BY campaign_id) AS n
                        FROM (
                            SELECT campaign_id,
                                   CASE WHEN base = '' THEN 'campanha' ELSE base END AS base
                            FROM (
                                SELECT campaign_id,
                                       rtrim(left(btrim(regexp_replace(lower(translate(name,
                                           'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñÝý',
                                           'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNnYy')),
                                           '[^a-z0-9]+', '-', 'g'), '-'), 80), '-') AS base
                                FROM campaigns
                            ) raw
                        ) normalized
                    ) numbered
                ) s
                WHERE c.campaign_id = s.campaign_id;

                UPDATE campaigns AS c
                SET slug = c.slug || '-' || c.campaign_id::text
                WHERE c.campaign_id IN (
                    SELECT campaign_id
                    FROM (
                        SELECT campaign_id,
                               row_number() OVER (PARTITION BY slug ORDER BY campaign_id) AS n
                        FROM campaigns
                    ) d
                    WHERE d.n > 1
                );

                UPDATE maps AS m
                SET slug = s.slug
                FROM (
                    SELECT map_id,
                           CASE WHEN n = 1 THEN base ELSE base || '-' || n::text END AS slug
                    FROM (
                        SELECT map_id,
                               base,
                               row_number() OVER (PARTITION BY base ORDER BY map_id) AS n
                        FROM (
                            SELECT map_id,
                                   CASE WHEN base = '' THEN 'mapa' ELSE base END AS base
                            FROM (
                                SELECT map_id,
                                       rtrim(left(btrim(regexp_replace(lower(translate(name,
                                           'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñÝý',
                                           'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNnYy')),
                                           '[^a-z0-9]+', '-', 'g'), '-'), 80), '-') AS base
                                FROM maps
                            ) raw
                        ) normalized
                    ) numbered
                ) s
                WHERE m.map_id = s.map_id;

                UPDATE maps AS m
                SET slug = m.slug || '-' || m.map_id::text
                WHERE m.map_id IN (
                    SELECT map_id
                    FROM (
                        SELECT map_id,
                               row_number() OVER (PARTITION BY slug ORDER BY map_id) AS n
                        FROM maps
                    ) d
                    WHERE d.n > 1
                );
                """);

            migrationBuilder.AlterColumn<string>(
                name: "slug",
                table: "campaigns",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "slug",
                table: "maps",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_campaigns_slug",
                table: "campaigns",
                column: "slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_maps_slug",
                table: "maps",
                column: "slug",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_maps_slug",
                table: "maps");

            migrationBuilder.DropIndex(
                name: "ix_campaigns_slug",
                table: "campaigns");

            migrationBuilder.DropColumn(
                name: "slug",
                table: "maps");

            migrationBuilder.DropColumn(
                name: "slug",
                table: "campaigns");
        }
    }
}
