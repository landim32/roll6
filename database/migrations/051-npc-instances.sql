-- Roll6 — NPC instances (051), to apply after 047-chat-whispers.sql (i.e. after 20261010003326_AddChatWhispers; independent of 050).
-- map_npcs.current_move: the Deslocamento of each instance (backfilled from npcs.move; a changed NPC move follows the untouched ones);
-- map_npcs.removed_at: the instance left the map (its piece is gone) but the row stays so the turn entries keep its name.
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/051-npc-instances.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261010003326_AddChatWhispers 20261011054136_AddMapNpcInstances --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261011054136_AddMapNpcInstances') THEN
    ALTER TABLE map_npcs ADD current_move integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261011054136_AddMapNpcInstances') THEN
    UPDATE map_npcs m SET current_move = n.move FROM npcs n WHERE n.npc_id = m.npc_id;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261011054136_AddMapNpcInstances') THEN
    ALTER TABLE map_npcs ADD removed_at timestamp without time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261011054136_AddMapNpcInstances') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261011054136_AddMapNpcInstances', '9.0.20');
    END IF;
END $EF$;
COMMIT;

