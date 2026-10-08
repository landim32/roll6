-- Roll6 — movement limit per campaign (037, issue #29), to apply after 036-npc-posture.sql (i.e. after 20261005180820_AddNpcPosture).
-- campaign_characters: adds current_move (integer not null) — the "Deslocamento", how far a player moves the character per turn on this campaign's maps. Existing participations get the character's current move, so nobody moves differently.
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/037-campaign-move.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261005180820_AddNpcPosture 20261008215633_AddCampaignCharacterMove --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261008215633_AddCampaignCharacterMove') THEN
    ALTER TABLE campaign_characters ADD current_move integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261008215633_AddCampaignCharacterMove') THEN
    UPDATE campaign_characters cc SET current_move = c.move FROM characters c WHERE c.character_id = cc.character_id;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261008215633_AddCampaignCharacterMove') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261008215633_AddCampaignCharacterMove', '9.0.20');
    END IF;
END $EF$;
COMMIT;

