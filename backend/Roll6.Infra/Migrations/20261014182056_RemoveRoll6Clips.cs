using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class RemoveRoll6Clips : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Roll6 ships no animation of its own any more (061): tokens that chose "roll6" or "roll6-guard" go back
            // to automatic (the file's clip named for the state, else none).
            migrationBuilder.Sql("UPDATE tokens SET model_idle_clip = NULL WHERE model_idle_clip IN ('roll6', 'roll6-guard');");
            migrationBuilder.Sql("UPDATE tokens SET model_walk_clip = NULL WHERE model_walk_clip IN ('roll6', 'roll6-guard');");
            migrationBuilder.Sql("UPDATE tokens SET model_down_clip = NULL WHERE model_down_clip IN ('roll6', 'roll6-guard');");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Nothing to restore: the former choices are not kept.
        }
    }
}
