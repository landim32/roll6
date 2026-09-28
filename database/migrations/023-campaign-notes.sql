-- Roll6 — only the changes since the last production release (main = up to 20260928072746_AddCharacterSheetFile).
-- 023-campaign-notes: the participation sheet became the campaign notes ("Anotações da Campanha", only what changed
-- in the campaign); clears the untouched copies of the character's sheet taken on joining.
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/023-campaign-notes.sql
-- Regenerate (from backend/): dotnet ef migrations script 20260928072746_AddCharacterSheetFile 20260928092117_ClearCopiedCampaignNotes --idempotent --project Roll6.Infra --startup-project Roll6.API

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928092117_ClearCopiedCampaignNotes') THEN
    UPDATE campaign_characters AS cc
    SET sheet = NULL
    FROM characters AS c
    WHERE c.character_id = cc.character_id
      AND cc.sheet IS NOT NULL
      AND cc.sheet = c.sheet;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928092117_ClearCopiedCampaignNotes') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260928092117_ClearCopiedCampaignNotes', '9.0.20');
    END IF;
END $EF$;
COMMIT;

