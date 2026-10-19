-- Roll6 — "Perguntar" (093), to apply after 090-library-images.sql (i.e. after 20261018225650_AddLibraryImages).
-- turns.ask_state: a question to the master's Claude (turn_type 13) — 1 waiting, 2 answered, 3 failed.
-- turns.edited_at: when the master corrected an answer (turn_type 14).
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/093-chat-ask.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261018225650_AddLibraryImages 20261019021709_AddChatAsk --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261019021709_AddChatAsk') THEN
    ALTER TABLE turns ADD ask_state integer;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261019021709_AddChatAsk') THEN
    ALTER TABLE turns ADD edited_at timestamp without time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261019021709_AddChatAsk') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261019021709_AddChatAsk', '9.0.20');
    END IF;
END $EF$;
COMMIT;

