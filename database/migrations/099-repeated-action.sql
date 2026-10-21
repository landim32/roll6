-- Roll6 — repeated action (099), to apply after 098-turn-target.sql (i.e. after 20261021010517_AddTurnTarget).
-- campaign_characters/map_npcs.repeated_action (+ repeated_action_user_id): the actor's standing order applied as its action at every turn start; turns.repeated: 1 declared when set, 2 applied at a turn start.
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/099-repeated-action.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261021010517_AddTurnTarget 20261021184235_AddRepeatedAction --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261021184235_AddRepeatedAction') THEN
    ALTER TABLE turns ADD repeated integer;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261021184235_AddRepeatedAction') THEN
    ALTER TABLE map_npcs ADD repeated_action character varying(2000);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261021184235_AddRepeatedAction') THEN
    ALTER TABLE map_npcs ADD repeated_action_user_id bigint;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261021184235_AddRepeatedAction') THEN
    ALTER TABLE campaign_characters ADD repeated_action character varying(2000);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261021184235_AddRepeatedAction') THEN
    ALTER TABLE campaign_characters ADD repeated_action_user_id bigint;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261021184235_AddRepeatedAction') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261021184235_AddRepeatedAction', '9.0.20');
    END IF;
END $EF$;
COMMIT;

