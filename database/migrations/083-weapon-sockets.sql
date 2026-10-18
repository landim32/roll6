-- Roll6 — weapon sockets (083), to apply after 082-weapons.sql (i.e. after 20261017225940_AddWeapons).
-- weapons: + grip_x/grip_y/grip_z (the grip point, fractions of the bounding box, default 0.5) and pose_rx/pose_ry/pose_rz (the standard pose in 90° steps, default 0).
-- token_weapons: the weapons in the sockets of a token's 3D model (socket 1 right hand, 2 left hand, 3 back, 4 right holster, 5 left holster; grip jsonb = size + fine adjustment).
-- The 082 hands (tokens.right_/left_weapon_id + _grip) are copied into sockets 1/2 keeping the weapon and the size, then dropped.
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/083-weapon-sockets.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261017225940_AddWeapons 20261018134011_AddWeaponSockets --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261018134011_AddWeaponSockets') THEN
    ALTER TABLE weapons ADD grip_x double precision NOT NULL DEFAULT 0.5;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261018134011_AddWeaponSockets') THEN
    ALTER TABLE weapons ADD grip_y double precision NOT NULL DEFAULT 0.5;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261018134011_AddWeaponSockets') THEN
    ALTER TABLE weapons ADD grip_z double precision NOT NULL DEFAULT 0.5;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261018134011_AddWeaponSockets') THEN
    ALTER TABLE weapons ADD pose_rx integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261018134011_AddWeaponSockets') THEN
    ALTER TABLE weapons ADD pose_ry integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261018134011_AddWeaponSockets') THEN
    ALTER TABLE weapons ADD pose_rz integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261018134011_AddWeaponSockets') THEN
    CREATE TABLE token_weapons (
        token_weapon_id bigint GENERATED ALWAYS AS IDENTITY,
        token_id bigint NOT NULL,
        socket integer NOT NULL,
        weapon_id bigint NOT NULL,
        grip jsonb,
        CONSTRAINT token_weapons_pkey PRIMARY KEY (token_weapon_id),
        CONSTRAINT fk_token_token_weapon FOREIGN KEY (token_id) REFERENCES tokens (token_id),
        CONSTRAINT fk_weapon_token_weapon FOREIGN KEY (weapon_id) REFERENCES weapons (weapon_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261018134011_AddWeaponSockets') THEN
    CREATE UNIQUE INDEX ix_token_weapons_token_socket ON token_weapons (token_id, socket);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261018134011_AddWeaponSockets') THEN
    CREATE INDEX ix_token_weapons_weapon ON token_weapons (weapon_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261018134011_AddWeaponSockets') THEN
    INSERT INTO token_weapons (token_id, socket, weapon_id, grip)
    SELECT token_id, 1, right_weapon_id, jsonb_build_object('scale', COALESCE((right_weapon_grip->>'scale')::int, 100))
      FROM tokens WHERE right_weapon_id IS NOT NULL
    UNION ALL
    SELECT token_id, 2, left_weapon_id, jsonb_build_object('scale', COALESCE((left_weapon_grip->>'scale')::int, 100))
      FROM tokens WHERE left_weapon_id IS NOT NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261018134011_AddWeaponSockets') THEN
    ALTER TABLE tokens DROP CONSTRAINT fk_token_left_weapon;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261018134011_AddWeaponSockets') THEN
    ALTER TABLE tokens DROP CONSTRAINT fk_token_right_weapon;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261018134011_AddWeaponSockets') THEN
    DROP INDEX ix_tokens_left_weapon;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261018134011_AddWeaponSockets') THEN
    DROP INDEX ix_tokens_right_weapon;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261018134011_AddWeaponSockets') THEN
    ALTER TABLE tokens DROP COLUMN left_weapon_grip;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261018134011_AddWeaponSockets') THEN
    ALTER TABLE tokens DROP COLUMN left_weapon_id;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261018134011_AddWeaponSockets') THEN
    ALTER TABLE tokens DROP COLUMN right_weapon_grip;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261018134011_AddWeaponSockets') THEN
    ALTER TABLE tokens DROP COLUMN right_weapon_id;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261018134011_AddWeaponSockets') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261018134011_AddWeaponSockets', '9.0.20');
    END IF;
END $EF$;
COMMIT;

