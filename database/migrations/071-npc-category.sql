-- Roll6 — NPC category and ally master (071), to apply after 070-walk-position.sql (i.e. after 20261015172704_AddMapTokenWalkPosition).
-- campaign_npcs.category: 1 Inimigo, 2 Neutro, 3 Aliado (existing rows become Inimigo); campaign_npcs.master_campaign_character_id: the approved participation whose owner commands an ally (null = none).
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/071-npc-category.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261015172704_AddMapTokenWalkPosition 20261015181236_AddCampaignNpcCategory --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261015181236_AddCampaignNpcCategory') THEN
    ALTER TABLE campaign_npcs ADD category integer NOT NULL DEFAULT 1;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261015181236_AddCampaignNpcCategory') THEN
    ALTER TABLE campaign_npcs ADD master_campaign_character_id bigint;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261015181236_AddCampaignNpcCategory') THEN
    CREATE INDEX ix_campaign_npcs_master ON campaign_npcs (master_campaign_character_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261015181236_AddCampaignNpcCategory') THEN
    ALTER TABLE campaign_npcs ADD CONSTRAINT fk_campaign_npc_master FOREIGN KEY (master_campaign_character_id) REFERENCES campaign_characters (campaign_character_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261015181236_AddCampaignNpcCategory') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261015181236_AddCampaignNpcCategory', '9.0.20');
    END IF;
END $EF$;
COMMIT;

