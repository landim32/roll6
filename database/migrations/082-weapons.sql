-- Roll6 — weapon library (082), to apply after 078-map-current-status.sql (i.e. after 20261016174851_AddCurrentMapStatus).
-- weapons: library weapons (name, owner, .glb from POST /api/model). tokens.right_weapon_id/left_weapon_id (FK, ClientSetNull) and right_weapon_grip/left_weapon_grip (jsonb, null = default grip): the weapon in each hand of the token's 3D model.
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/082-weapons.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261016174851_AddCurrentMapStatus 20261017225940_AddWeapons --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017225940_AddWeapons') THEN
    ALTER TABLE tokens ADD left_weapon_grip jsonb;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017225940_AddWeapons') THEN
    ALTER TABLE tokens ADD left_weapon_id bigint;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017225940_AddWeapons') THEN
    ALTER TABLE tokens ADD right_weapon_grip jsonb;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017225940_AddWeapons') THEN
    ALTER TABLE tokens ADD right_weapon_id bigint;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017225940_AddWeapons') THEN
    CREATE TABLE weapons (
        weapon_id bigint GENERATED ALWAYS AS IDENTITY,
        user_id bigint NOT NULL,
        name character varying(100) NOT NULL,
        model_file character varying(260) NOT NULL,
        created_at timestamp without time zone NOT NULL DEFAULT (now()),
        updated_at timestamp without time zone NOT NULL DEFAULT (now()),
        CONSTRAINT weapons_pkey PRIMARY KEY (weapon_id),
        CONSTRAINT fk_weapon_user FOREIGN KEY (user_id) REFERENCES users (user_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017225940_AddWeapons') THEN
    CREATE INDEX ix_tokens_left_weapon ON tokens (left_weapon_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017225940_AddWeapons') THEN
    CREATE INDEX ix_tokens_right_weapon ON tokens (right_weapon_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017225940_AddWeapons') THEN
    CREATE INDEX ix_weapons_user ON weapons (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017225940_AddWeapons') THEN
    ALTER TABLE tokens ADD CONSTRAINT fk_token_left_weapon FOREIGN KEY (left_weapon_id) REFERENCES weapons (weapon_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017225940_AddWeapons') THEN
    ALTER TABLE tokens ADD CONSTRAINT fk_token_right_weapon FOREIGN KEY (right_weapon_id) REFERENCES weapons (weapon_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017225940_AddWeapons') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261017225940_AddWeapons', '9.0.20');
    END IF;
END $EF$;
COMMIT;

