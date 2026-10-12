-- Roll6 — campaign free mode (054), to apply after 051-npc-instances.sql (i.e. after 20261011054136_AddMapNpcInstances).
-- campaigns.free_mode: while true, every action of an actor stays valid, character/NPC pieces move without limit and without a
-- Movement entry, the turn finishes without a pending list and no majority notice goes out (default false = turn mode).
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/054-campaign-free-mode.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261011054136_AddMapNpcInstances 20261012190747_AddCampaignFreeMode --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012190747_AddCampaignFreeMode') THEN
    ALTER TABLE campaigns ADD free_mode boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012190747_AddCampaignFreeMode') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261012190747_AddCampaignFreeMode', '9.0.20');
    END IF;
END $EF$;
COMMIT;

