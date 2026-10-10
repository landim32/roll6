-- Roll6 — chat whispers (047), to apply after 045-chat-polls.sql (i.e. after 20261009225546_AddChatPolls).
-- turns.is_whisper: a message, photo, audio, roll or action seen whole only by its author, the master and the owners of its targets;
-- turn_whisper_targets: one row per target (character_id null = the master).
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/047-chat-whispers.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261009225546_AddChatPolls 20261010003326_AddChatWhispers --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261010003326_AddChatWhispers') THEN
    ALTER TABLE turns ADD is_whisper boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261010003326_AddChatWhispers') THEN
    CREATE TABLE turn_whisper_targets (
        turn_whisper_target_id bigint GENERATED ALWAYS AS IDENTITY,
        turn_id bigint NOT NULL,
        character_id bigint,
        CONSTRAINT turn_whisper_targets_pkey PRIMARY KEY (turn_whisper_target_id),
        CONSTRAINT fk_character_whisper_target FOREIGN KEY (character_id) REFERENCES characters (character_id),
        CONSTRAINT fk_turn_whisper_target FOREIGN KEY (turn_id) REFERENCES turns (turn_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261010003326_AddChatWhispers') THEN
    CREATE INDEX ix_turn_whisper_targets_character ON turn_whisper_targets (character_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261010003326_AddChatWhispers') THEN
    CREATE INDEX ix_turn_whisper_targets_turn ON turn_whisper_targets (turn_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261010003326_AddChatWhispers') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261010003326_AddChatWhispers', '9.0.20');
    END IF;
END $EF$;
COMMIT;

