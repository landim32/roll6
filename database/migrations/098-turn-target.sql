-- Roll6 — action target (098), to apply after 096-gm-mode.sql (i.e. after 20261020031658_AddCampaignGmMode).
-- turns.target: what an action is about ("Ação sobre…") as a JSON snapshot taken when it was declared — the hex, the distance from the actor's piece and the piece under it (kind, side, name, posture, status, PV/Fadiga, facing); null on actions without a target.
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/098-turn-target.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261020031658_AddCampaignGmMode 20261021010517_AddTurnTarget --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261021010517_AddTurnTarget') THEN
    ALTER TABLE turns ADD target jsonb;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261021010517_AddTurnTarget') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261021010517_AddTurnTarget', '9.0.20');
    END IF;
END $EF$;
COMMIT;

