using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MzansiFleet.Repository.Migrations
{
    public partial class FixDailyTaxiQueueSchema : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
ALTER TABLE ""DailyTaxiQueue""
    DROP COLUMN IF EXISTS ""AvailableFrom"",
    DROP COLUMN IF EXISTS ""AvailableUntil"",
    DROP COLUMN IF EXISTS ""Priority"",
    DROP COLUMN IF EXISTS ""AssignedTripId"",
    DROP COLUMN IF EXISTS ""AssignedAt"",
    DROP COLUMN IF EXISTS ""AssignedByUserId"";
");

            migrationBuilder.Sql(@"
ALTER TABLE ""DailyTaxiQueue""
    ADD COLUMN IF NOT EXISTS ""RouteId""             uuid,
    ADD COLUMN IF NOT EXISTS ""QueuePosition""       integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ""JoinedAt""            interval NOT NULL DEFAULT '0',
    ADD COLUMN IF NOT EXISTS ""DepartedAt""          timestamp with time zone,
    ADD COLUMN IF NOT EXISTS ""DispatchedByUserId""  uuid,
    ADD COLUMN IF NOT EXISTS ""PassengerCount""      integer;
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
ALTER TABLE ""DailyTaxiQueue""
    DROP COLUMN IF EXISTS ""RouteId"",
    DROP COLUMN IF EXISTS ""QueuePosition"",
    DROP COLUMN IF EXISTS ""JoinedAt"",
    DROP COLUMN IF EXISTS ""DepartedAt"",
    DROP COLUMN IF EXISTS ""DispatchedByUserId"",
    DROP COLUMN IF EXISTS ""PassengerCount"";
");

            migrationBuilder.Sql(@"
ALTER TABLE ""DailyTaxiQueue""
    ADD COLUMN IF NOT EXISTS ""AvailableFrom""      interval NOT NULL DEFAULT '0',
    ADD COLUMN IF NOT EXISTS ""AvailableUntil""     interval,
    ADD COLUMN IF NOT EXISTS ""Priority""           integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ""AssignedTripId""     uuid,
    ADD COLUMN IF NOT EXISTS ""AssignedAt""         timestamp with time zone,
    ADD COLUMN IF NOT EXISTS ""AssignedByUserId""   uuid;
");
        }
    }
}
