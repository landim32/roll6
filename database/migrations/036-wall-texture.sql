-- Roll6 — changes of the wall texture of the 3D view (036), to apply after 035-token-direction-images.sql (i.e. after 20261004234816_AddTokenDirectionImages).
-- map_models: adds wall_texture_image (varchar(260), nullable) — one texture that covers every wall of the 3D view. No backfill: a map without it keeps the walls painted with the map's colors.
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/036-wall-texture.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261004234816_AddTokenDirectionImages 20261005145717_AddWallTextureImage --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261005145717_AddWallTextureImage') THEN
    ALTER TABLE map_models ADD wall_texture_image character varying(260);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261005145717_AddWallTextureImage') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261005145717_AddWallTextureImage', '9.0.20');
    END IF;
END $EF$;
COMMIT;

