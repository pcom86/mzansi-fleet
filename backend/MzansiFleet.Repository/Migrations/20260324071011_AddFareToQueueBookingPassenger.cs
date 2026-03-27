using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MzansiFleet.Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddFareToQueueBookingPassenger : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    ALTER TABLE ""QueueBookingPassengers"" ADD COLUMN ""Fare"" numeric NOT NULL DEFAULT 0;
                EXCEPTION WHEN duplicate_column THEN NULL;
                END $$;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE ""QueueBookingPassengers"" DROP COLUMN IF EXISTS ""Fare"";
            ");
        }
    }
}
