-- Roll6 — only the changes since the last production release (main = up to 20260926211638_AddApiKeys).
-- 022-character-sheet-file: characters.sheet_file (sheet file name, image or PDF).
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/022-character-sheet-file.sql
-- Regenerate (from backend/): dotnet ef migrations script 20260926211638_AddApiKeys 20260928072746_AddCharacterSheetFile --idempotent --project Roll6.Infra --startup-project Roll6.API

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928072746_AddCharacterSheetFile') THEN
    ALTER TABLE characters ADD sheet_file character varying(260);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928072746_AddCharacterSheetFile') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260928072746_AddCharacterSheetFile', '9.0.20');
    END IF;
END $EF$;
COMMIT;

