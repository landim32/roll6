-- Roll6 — changes of 029-slug-routes-map-share, to apply after 027-turn-narration.sql (i.e. after 20260928184156_TurnNarration).
-- campaigns.slug and maps.slug (varchar(100), unique, immutable): nullable column, backfill from the name, then NOT NULL and the unique indexes.
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/029-slugs.sql
-- Regenerate (from backend/): dotnet ef migrations script 20260928184156_TurnNarration 20260929114755_AddSlugs --idempotent --project Roll6.Infra --startup-project Roll6.API

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260929114755_AddSlugs') THEN
    ALTER TABLE campaigns ADD slug character varying(100);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260929114755_AddSlugs') THEN
    ALTER TABLE maps ADD slug character varying(100);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260929114755_AddSlugs') THEN
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
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260929114755_AddSlugs') THEN
    ALTER TABLE campaigns ALTER COLUMN slug SET NOT NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260929114755_AddSlugs') THEN
    ALTER TABLE maps ALTER COLUMN slug SET NOT NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260929114755_AddSlugs') THEN
    CREATE UNIQUE INDEX ix_campaigns_slug ON campaigns (slug);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260929114755_AddSlugs') THEN
    CREATE UNIQUE INDEX ix_maps_slug ON maps (slug);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260929114755_AddSlugs') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260929114755_AddSlugs', '9.0.20');
    END IF;
END $EF$;
COMMIT;

