-- Roll6 — changes of 024-turn-log-summary, to apply after 023-campaign-notes.sql (i.e. after 20260928092117_ClearCopiedCampaignNotes).
-- turns: user_id (author, required — existing entries get the character owner for moves/actions, the campaign master
-- otherwise), moved (movement points spent) and changes (jsonb, fields changed by a CharacterUpdate).
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/024-turn-log-summary.sql
-- Regenerate (from backend/): dotnet ef migrations script 20260928092117_ClearCopiedCampaignNotes 20260928122310_AddTurnAuthorMovedChanges --idempotent --project Roll6.Infra --startup-project Roll6.API

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928122310_AddTurnAuthorMovedChanges') THEN
    ALTER TABLE turns ADD changes jsonb;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928122310_AddTurnAuthorMovedChanges') THEN
    ALTER TABLE turns ADD moved integer;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928122310_AddTurnAuthorMovedChanges') THEN
    ALTER TABLE turns ADD user_id bigint;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928122310_AddTurnAuthorMovedChanges') THEN
    UPDATE turns AS t
    SET user_id = c.user_id
    FROM characters AS c
    WHERE t.user_id IS NULL
      AND t.character_id = c.character_id
      AND t.turn_type IN (1, 2);

    UPDATE turns AS t
    SET user_id = cp.user_id
    FROM campaigns AS cp
    WHERE t.user_id IS NULL
      AND t.campaign_id = cp.campaign_id;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928122310_AddTurnAuthorMovedChanges') THEN
    ALTER TABLE turns ALTER COLUMN user_id SET NOT NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928122310_AddTurnAuthorMovedChanges') THEN
    CREATE INDEX ix_turns_user ON turns (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928122310_AddTurnAuthorMovedChanges') THEN
    ALTER TABLE turns ADD CONSTRAINT fk_user_turn FOREIGN KEY (user_id) REFERENCES users (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928122310_AddTurnAuthorMovedChanges') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260928122310_AddTurnAuthorMovedChanges', '9.0.20');
    END IF;
END $EF$;
COMMIT;

