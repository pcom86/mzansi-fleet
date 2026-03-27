using Microsoft.EntityFrameworkCore.Migrations;

namespace MzansiFleet.Repository.Migrations
{
    public partial class AddQueueMarshalPermissionsColumns : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE ""QueueMarshals"" ADD COLUMN IF NOT EXISTS ""Permissions_CanCaptureTrips"" boolean NOT NULL DEFAULT true;
                ALTER TABLE ""QueueMarshals"" ADD COLUMN IF NOT EXISTS ""Permissions_CanViewSchedules"" boolean NOT NULL DEFAULT true;
                ALTER TABLE ""QueueMarshals"" ADD COLUMN IF NOT EXISTS ""Permissions_CanReceiveMessages"" boolean NOT NULL DEFAULT true;
                ALTER TABLE ""QueueMarshals"" ADD COLUMN IF NOT EXISTS ""Permissions_CanSendMessages"" boolean NOT NULL DEFAULT true;
                ALTER TABLE ""QueueMarshals"" ADD COLUMN IF NOT EXISTS ""Permissions_CanManageVehicles"" boolean NOT NULL DEFAULT false;
                ALTER TABLE ""QueueMarshals"" ADD COLUMN IF NOT EXISTS ""Permissions_CanManageDrivers"" boolean NOT NULL DEFAULT false;
                ALTER TABLE ""QueueMarshals"" ADD COLUMN IF NOT EXISTS ""Permissions_CanManageSchedules"" boolean NOT NULL DEFAULT false;
                ALTER TABLE ""QueueMarshals"" ADD COLUMN IF NOT EXISTS ""Permissions_CanViewReports"" boolean NOT NULL DEFAULT false;
                ALTER TABLE ""QueueMarshals"" ADD COLUMN IF NOT EXISTS ""Permissions_CanDeleteData"" boolean NOT NULL DEFAULT false;
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE ""QueueMarshals"" DROP COLUMN IF EXISTS ""Permissions_CanCaptureTrips"";
                ALTER TABLE ""QueueMarshals"" DROP COLUMN IF EXISTS ""Permissions_CanViewSchedules"";
                ALTER TABLE ""QueueMarshals"" DROP COLUMN IF EXISTS ""Permissions_CanReceiveMessages"";
                ALTER TABLE ""QueueMarshals"" DROP COLUMN IF EXISTS ""Permissions_CanSendMessages"";
                ALTER TABLE ""QueueMarshals"" DROP COLUMN IF EXISTS ""Permissions_CanManageVehicles"";
                ALTER TABLE ""QueueMarshals"" DROP COLUMN IF EXISTS ""Permissions_CanManageDrivers"";
                ALTER TABLE ""QueueMarshals"" DROP COLUMN IF EXISTS ""Permissions_CanManageSchedules"";
                ALTER TABLE ""QueueMarshals"" DROP COLUMN IF EXISTS ""Permissions_CanViewReports"";
                ALTER TABLE ""QueueMarshals"" DROP COLUMN IF EXISTS ""Permissions_CanDeleteData"";
            ");
        }
    }
}
