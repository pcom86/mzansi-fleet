using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MzansiFleet.Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddTripPassengerNextOfKinFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='TripPassengers' AND column_name='NextOfKinName') THEN
                        ALTER TABLE ""TripPassengers"" ADD COLUMN ""NextOfKinName"" text;
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='TripPassengers' AND column_name='NextOfKinContact') THEN
                        ALTER TABLE ""TripPassengers"" ADD COLUMN ""NextOfKinContact"" text;
                    END IF;
                END $$;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
