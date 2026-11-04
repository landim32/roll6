-- Roll6 — one map per character, no current map (108), to apply after 107-map-paint.sql (i.e. after 20261103033731_AddMapPaint).
-- DESTRUCTIVE: runs the data cleanup first and it can't be undone (take a copy of the database). Character pieces on archived
-- or deleted maps are deleted; each character keeps one piece, the one on the current map, else the one positioned last;
-- maps with status 4 become 1. Then: drops campaigns.current_map_id (fk_map_campaign_current, IX_campaigns_current_map_id) and
-- ix_maps_campaign_current, and replaces ix_map_tokens_map_campaign_character with ix_map_tokens_campaign_character (unique).
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/108-character-single-map.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261103033731_AddMapPaint 20261103235214_RemoveCurrentMap --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261103235214_RemoveCurrentMap') THEN
    DELETE FROM map_tokens AS piece
    USING maps AS map
    WHERE map.map_id = piece.map_id
      AND piece.campaign_character_id IS NOT NULL
      AND map.status IN (2, 3);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261103235214_RemoveCurrentMap') THEN
    DELETE FROM map_tokens AS piece
    USING (
        SELECT candidate.map_token_id,
               row_number() OVER (
                   PARTITION BY candidate.campaign_character_id
                   ORDER BY CASE WHEN campaign.current_map_id = candidate.map_id THEN 0 ELSE 1 END,
                            COALESCE(candidate.updated_at, candidate.created_at) DESC,
                            candidate.map_token_id DESC) AS place
        FROM map_tokens AS candidate
        JOIN maps AS map ON map.map_id = candidate.map_id
        JOIN campaigns AS campaign ON campaign.campaign_id = map.campaign_id
        WHERE candidate.campaign_character_id IS NOT NULL
    ) AS ranked
    WHERE piece.map_token_id = ranked.map_token_id
      AND ranked.place > 1;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261103235214_RemoveCurrentMap') THEN
    UPDATE maps SET status = 1 WHERE status = 4;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261103235214_RemoveCurrentMap') THEN
    ALTER TABLE campaigns DROP CONSTRAINT fk_map_campaign_current;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261103235214_RemoveCurrentMap') THEN
    DROP INDEX ix_maps_campaign_current;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261103235214_RemoveCurrentMap') THEN
    DROP INDEX "IX_map_tokens_campaign_character_id";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261103235214_RemoveCurrentMap') THEN
    DROP INDEX ix_map_tokens_map_campaign_character;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261103235214_RemoveCurrentMap') THEN
    DROP INDEX "IX_campaigns_current_map_id";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261103235214_RemoveCurrentMap') THEN
    ALTER TABLE campaigns DROP COLUMN current_map_id;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261103235214_RemoveCurrentMap') THEN
    CREATE UNIQUE INDEX ix_map_tokens_campaign_character ON map_tokens (campaign_character_id) WHERE campaign_character_id IS NOT NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261103235214_RemoveCurrentMap') THEN
    CREATE INDEX "IX_map_tokens_map_id" ON map_tokens (map_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261103235214_RemoveCurrentMap') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261103235214_RemoveCurrentMap', '9.0.20');
    END IF;
END $EF$;
COMMIT;

