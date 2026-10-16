-- Roll6 — map status "Atual" (078), to apply after 077-poll-closed.sql (i.e. after 20261016113812_AddPollClosedAt).
-- maps.status 4 = the campaign's current map (backfilled from campaigns.current_map_id, which stays as the pointer); unique partial index ix_maps_campaign_current keeps at most one per campaign.
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/078-map-current-status.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261016113812_AddPollClosedAt 20261016174851_AddCurrentMapStatus --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261016174851_AddCurrentMapStatus') THEN
    UPDATE maps m SET status = 4 FROM campaigns c WHERE c.current_map_id = m.map_id AND m.status = 1;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261016174851_AddCurrentMapStatus') THEN
    UPDATE campaigns SET current_map_id = NULL WHERE current_map_id IS NOT NULL AND current_map_id NOT IN (SELECT map_id FROM maps WHERE status = 4);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261016174851_AddCurrentMapStatus') THEN
    CREATE UNIQUE INDEX ix_maps_campaign_current ON maps (campaign_id) WHERE status = 4;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261016174851_AddCurrentMapStatus') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261016174851_AddCurrentMapStatus', '9.0.20');
    END IF;
END $EF$;
COMMIT;

