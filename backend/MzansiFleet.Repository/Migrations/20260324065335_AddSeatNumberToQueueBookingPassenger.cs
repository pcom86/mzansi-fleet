using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MzansiFleet.Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddSeatNumberToQueueBookingPassenger : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Create QueueBookings table if it doesn't exist
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""QueueBookings"" (
                    ""Id"" uuid NOT NULL,
                    ""UserId"" uuid NOT NULL,
                    ""QueueEntryId"" uuid NOT NULL,
                    ""TaxiRankId"" uuid NOT NULL,
                    ""RouteId"" uuid,
                    ""VehicleId"" uuid NOT NULL,
                    ""SeatsBooked"" integer NOT NULL DEFAULT 1,
                    ""TotalFare"" numeric NOT NULL DEFAULT 0,
                    ""PaymentMethod"" text NOT NULL DEFAULT 'EFT',
                    ""PaymentStatus"" text NOT NULL DEFAULT 'Pending',
                    ""PaymentReference"" text,
                    ""BankReference"" text,
                    ""PaidAt"" timestamp with time zone,
                    ""EftAccountName"" text,
                    ""EftBank"" text,
                    ""EftAccountNumber"" text,
                    ""EftBranchCode"" text,
                    ""Status"" text NOT NULL DEFAULT 'Pending',
                    ""Notes"" text,
                    ""CancellationReason"" text,
                    ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT now(),
                    ""UpdatedAt"" timestamp with time zone,
                    ""ConfirmedAt"" timestamp with time zone,
                    ""CancelledAt"" timestamp with time zone,
                    CONSTRAINT ""PK_QueueBookings"" PRIMARY KEY (""Id"")
                );
            ");

            // Create QueueBookingPassengers table if it doesn't exist
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""QueueBookingPassengers"" (
                    ""Id"" uuid NOT NULL,
                    ""QueueBookingId"" uuid NOT NULL,
                    ""Name"" text NOT NULL DEFAULT '',
                    ""ContactNumber"" text NOT NULL DEFAULT '',
                    ""Email"" text,
                    ""Destination"" text,
                    ""SeatNumber"" integer,
                    ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT now(),
                    CONSTRAINT ""PK_QueueBookingPassengers"" PRIMARY KEY (""Id""),
                    CONSTRAINT ""FK_QueueBookingPassengers_QueueBookings_QueueBookingId""
                        FOREIGN KEY (""QueueBookingId"") REFERENCES ""QueueBookings""(""Id"") ON DELETE CASCADE
                );
            ");

            // Add SeatNumber column if it doesn't exist (idempotent)
            migrationBuilder.Sql(@"
                DO $$ BEGIN
                    ALTER TABLE ""QueueBookingPassengers"" ADD COLUMN ""SeatNumber"" integer;
                EXCEPTION WHEN duplicate_column THEN NULL;
                END $$;
            ");

            // Create indexes if they don't exist
            migrationBuilder.Sql(@"CREATE INDEX IF NOT EXISTS ""IX_QueueBookingPassengers_QueueBookingId"" ON ""QueueBookingPassengers""(""QueueBookingId"");");
            migrationBuilder.Sql(@"CREATE INDEX IF NOT EXISTS ""IX_QueueBookings_QueueEntryId"" ON ""QueueBookings""(""QueueEntryId"");");
            migrationBuilder.Sql(@"CREATE INDEX IF NOT EXISTS ""IX_QueueBookings_RouteId"" ON ""QueueBookings""(""RouteId"");");
            migrationBuilder.Sql(@"CREATE INDEX IF NOT EXISTS ""IX_QueueBookings_TaxiRankId"" ON ""QueueBookings""(""TaxiRankId"");");
            migrationBuilder.Sql(@"CREATE INDEX IF NOT EXISTS ""IX_QueueBookings_UserId"" ON ""QueueBookings""(""UserId"");");
            migrationBuilder.Sql(@"CREATE INDEX IF NOT EXISTS ""IX_QueueBookings_VehicleId"" ON ""QueueBookings""(""VehicleId"");");

            // Add FKs if they don't exist (idempotent)
            migrationBuilder.Sql(@"
                DO $$ BEGIN
                    ALTER TABLE ""QueueBookings"" ADD CONSTRAINT ""FK_QueueBookings_DailyTaxiQueues_QueueEntryId""
                        FOREIGN KEY (""QueueEntryId"") REFERENCES ""DailyTaxiQueues""(""Id"") ON DELETE CASCADE;
                EXCEPTION WHEN duplicate_object THEN NULL;
                END $$;
            ");
            migrationBuilder.Sql(@"
                DO $$ BEGIN
                    ALTER TABLE ""QueueBookings"" ADD CONSTRAINT ""FK_QueueBookings_Routes_RouteId""
                        FOREIGN KEY (""RouteId"") REFERENCES ""Routes""(""Id"");
                EXCEPTION WHEN duplicate_object THEN NULL;
                END $$;
            ");
            migrationBuilder.Sql(@"
                DO $$ BEGIN
                    ALTER TABLE ""QueueBookings"" ADD CONSTRAINT ""FK_QueueBookings_TaxiRanks_TaxiRankId""
                        FOREIGN KEY (""TaxiRankId"") REFERENCES ""TaxiRanks""(""Id"") ON DELETE CASCADE;
                EXCEPTION WHEN duplicate_object THEN NULL;
                END $$;
            ");
            migrationBuilder.Sql(@"
                DO $$ BEGIN
                    ALTER TABLE ""QueueBookings"" ADD CONSTRAINT ""FK_QueueBookings_Users_UserId""
                        FOREIGN KEY (""UserId"") REFERENCES ""Users""(""Id"") ON DELETE CASCADE;
                EXCEPTION WHEN duplicate_object THEN NULL;
                END $$;
            ");
            migrationBuilder.Sql(@"
                DO $$ BEGIN
                    ALTER TABLE ""QueueBookings"" ADD CONSTRAINT ""FK_QueueBookings_Vehicles_VehicleId""
                        FOREIGN KEY (""VehicleId"") REFERENCES ""Vehicles""(""Id"") ON DELETE CASCADE;
                EXCEPTION WHEN duplicate_object THEN NULL;
                END $$;
            ");

            // Make Messages.TaxiRankId nullable and fix FK (idempotent)
            migrationBuilder.Sql(@"ALTER TABLE ""Messages"" ALTER COLUMN ""TaxiRankId"" DROP NOT NULL;");
            // Clean up orphaned Messages referencing non-existent TaxiRanks before adding FK
            migrationBuilder.Sql(@"UPDATE ""Messages"" SET ""TaxiRankId"" = NULL WHERE ""TaxiRankId"" IS NOT NULL AND ""TaxiRankId"" NOT IN (SELECT ""Id"" FROM ""TaxiRanks"");");
            migrationBuilder.Sql(@"
                DO $$ BEGIN
                    ALTER TABLE ""Messages"" ADD CONSTRAINT ""FK_Messages_TaxiRanks_TaxiRankId""
                        FOREIGN KEY (""TaxiRankId"") REFERENCES ""TaxiRanks""(""Id"") ON DELETE SET NULL;
                EXCEPTION WHEN duplicate_object THEN NULL;
                END $$;
            ");

            // Make Messages string columns nullable
            migrationBuilder.Sql(@"ALTER TABLE ""Messages"" ALTER COLUMN ""Subject"" DROP NOT NULL;");
            migrationBuilder.Sql(@"ALTER TABLE ""Messages"" ALTER COLUMN ""SenderType"" DROP NOT NULL;");
            migrationBuilder.Sql(@"ALTER TABLE ""Messages"" ALTER COLUMN ""SenderName"" DROP NOT NULL;");
            migrationBuilder.Sql(@"ALTER TABLE ""Messages"" ALTER COLUMN ""RecipientType"" DROP NOT NULL;");
            migrationBuilder.Sql(@"ALTER TABLE ""Messages"" ALTER COLUMN ""MessageType"" DROP NOT NULL;");
            migrationBuilder.Sql(@"ALTER TABLE ""Messages"" ALTER COLUMN ""Content"" DROP NOT NULL;");

            // Make DriverProfiles string columns nullable
            migrationBuilder.Sql(@"ALTER TABLE ""DriverProfiles"" ALTER COLUMN ""PhotoUrl"" DROP NOT NULL;");
            migrationBuilder.Sql(@"ALTER TABLE ""DriverProfiles"" ALTER COLUMN ""Phone"" DROP NOT NULL;");
            migrationBuilder.Sql(@"ALTER TABLE ""DriverProfiles"" ALTER COLUMN ""PdpCopy"" DROP NOT NULL;");
            migrationBuilder.Sql(@"ALTER TABLE ""DriverProfiles"" ALTER COLUMN ""Name"" DROP NOT NULL;");
            migrationBuilder.Sql(@"ALTER TABLE ""DriverProfiles"" ALTER COLUMN ""LicenseNumber"" DROP NOT NULL;");
            migrationBuilder.Sql(@"ALTER TABLE ""DriverProfiles"" ALTER COLUMN ""LicenseCopy"" DROP NOT NULL;");
            migrationBuilder.Sql(@"ALTER TABLE ""DriverProfiles"" ALTER COLUMN ""IdNumber"" DROP NOT NULL;");
            migrationBuilder.Sql(@"ALTER TABLE ""DriverProfiles"" ALTER COLUMN ""Experience"" DROP NOT NULL;");
            migrationBuilder.Sql(@"ALTER TABLE ""DriverProfiles"" ALTER COLUMN ""Email"" DROP NOT NULL;");
            migrationBuilder.Sql(@"ALTER TABLE ""DriverProfiles"" ALTER COLUMN ""Category"" DROP NOT NULL;");

            // Add CompletedAt, Latitude, Longitude to TaxiRankTrips and ScheduledTrips
            migrationBuilder.Sql(@"DO $$ BEGIN ALTER TABLE ""TaxiRankTrips"" ADD COLUMN ""CompletedAt"" timestamp with time zone; EXCEPTION WHEN duplicate_column THEN NULL; END $$;");
            migrationBuilder.Sql(@"DO $$ BEGIN ALTER TABLE ""TaxiRankTrips"" ADD COLUMN ""Latitude"" numeric; EXCEPTION WHEN duplicate_column THEN NULL; END $$;");
            migrationBuilder.Sql(@"DO $$ BEGIN ALTER TABLE ""TaxiRankTrips"" ADD COLUMN ""Longitude"" numeric; EXCEPTION WHEN duplicate_column THEN NULL; END $$;");
            migrationBuilder.Sql(@"DO $$ BEGIN ALTER TABLE ""ScheduledTrips"" ADD COLUMN ""CompletedAt"" timestamp with time zone; EXCEPTION WHEN duplicate_column THEN NULL; END $$;");
            migrationBuilder.Sql(@"DO $$ BEGIN ALTER TABLE ""ScheduledTrips"" ADD COLUMN ""Latitude"" numeric; EXCEPTION WHEN duplicate_column THEN NULL; END $$;");
            migrationBuilder.Sql(@"DO $$ BEGIN ALTER TABLE ""ScheduledTrips"" ADD COLUMN ""Longitude"" numeric; EXCEPTION WHEN duplicate_column THEN NULL; END $$;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"ALTER TABLE ""QueueBookingPassengers"" DROP COLUMN IF EXISTS ""SeatNumber"";");
        }
    }
}
