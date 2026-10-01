-- Roll6 — changes of 032-campaign-sheet-copy, to apply after 031-posture-footprint.sql (i.e. after 20260929215843_AddPostureAndTokenSpaces).
-- campaign_characters.sheet_file (varchar(260), nullable); campaign sheet becomes a copy of the character's sheet, with the existing notes kept and appended under a heading.
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/032-campaign-sheet.sql
-- Regenerate (from backend/): dotnet ef migrations script 20260929215843_AddPostureAndTokenSpaces 20261001001517_AddCampaignSheetFile --idempotent --project Roll6.Infra --startup-project Roll6.API

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261001001517_AddCampaignSheetFile') THEN
    ALTER TABLE campaign_characters ADD sheet_file character varying(260);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261001001517_AddCampaignSheetFile') THEN
    WITH prepared AS (
        SELECT cc.campaign_character_id,
               CASE WHEN cc.sheet IS NULL OR btrim(cc.sheet) = ''
                    THEN ''
                    ELSE E'\n\n## Anotações anteriores da campanha\n\n' || cc.sheet
               END AS suffix
        FROM campaign_characters AS cc
    )
    UPDATE campaign_characters AS cc
    SET sheet_file = c.sheet_file,
        sheet = left(
                  left(coalesce(c.sheet, ''), greatest(0, 20000 - length(p.suffix))) || p.suffix,
                  20000)
    FROM characters AS c, prepared AS p
    WHERE c.character_id = cc.character_id
      AND p.campaign_character_id = cc.character_id;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261001001517_AddCampaignSheetFile') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261001001517_AddCampaignSheetFile', '9.0.20');
    END IF;
END $EF$;
COMMIT;

