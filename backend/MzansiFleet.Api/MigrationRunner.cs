using System;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace MzansiFleet.Api
{
    public class MigrationRunner
    {
        public static void ApplyServiceProviderRatingMigration(string connectionString)
        {
            try
            {
                using var connection = new NpgsqlConnection(connectionString);
                connection.Open();

                using var command = connection.CreateCommand();
                
                // Add column to MechanicalRequests
                command.CommandText = @"
                    DO $$ 
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 
                            FROM information_schema.columns 
                            WHERE table_name = 'MechanicalRequests' 
                            AND column_name = 'ServiceProviderRating'
                        ) THEN
                            ALTER TABLE ""MechanicalRequests"" 
                            ADD COLUMN ""ServiceProviderRating"" INTEGER NULL;
                            
                            ALTER TABLE ""MechanicalRequests""
                            ADD CONSTRAINT ""CK_MechanicalRequests_ServiceProviderRating"" 
                            CHECK (""ServiceProviderRating"" IS NULL OR (""ServiceProviderRating"" >= 1 AND ""ServiceProviderRating"" <= 5));
                            
                            RAISE NOTICE 'ServiceProviderRating column added to MechanicalRequests';
                        ELSE
                            RAISE NOTICE 'ServiceProviderRating column already exists in MechanicalRequests';
                        END IF;
                    END $$;
                ";
                
                command.ExecuteNonQuery();
                Console.WriteLine("Migration applied successfully!");
                
                connection.Close();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error applying migration: {ex.Message}");
                throw;
            }
        }

        public static void InsertTestScheduledJobs(string connectionString)
        {
            try
            {
                using var connection = new NpgsqlConnection(connectionString);
                connection.Open();

                using var command = connection.CreateCommand();
                
                command.CommandText = @"
                    INSERT INTO ""MechanicalRequests"" (
                        ""Id"",
                        ""OwnerId"",
                        ""VehicleId"",
                        ""Location"",
                        ""Category"",
                        ""Description"",
                        ""MediaUrls"",
                        ""PreferredTime"",
                        ""CallOutRequired"",
                        ""State"",
                        ""Priority"",
                        ""RequestedBy"",
                        ""RequestedByType"",
                        ""CreatedAt"",
                        ""ServiceProvider"",
                        ""ScheduledDate"",
                        ""ScheduledBy""
                    ) VALUES
                    (
                        gen_random_uuid(),
                        '0c1bde7c-cb9c-4ec3-b932-1d1105673a23'::uuid,
                        '45bcf3ca-5a96-4c10-a2b5-1ae720a851ad'::uuid,
                        'Johannesburg',
                        'Maintenance',
                        'Oil change and filter replacement',
                        '[]',
                        NULL,
                        false,
                        'Scheduled',
                        'Medium',
                        '0c1bde7c-cb9c-4ec3-b932-1d1105673a23'::uuid,
                        'Owner',
                        NOW(),
                        'LNM Mechanics',
                        NOW() + INTERVAL '2 days',
                        'Service Provider'
                    ),
                    (
                        gen_random_uuid(),
                        '0c1bde7c-cb9c-4ec3-b932-1d1105673a23'::uuid,
                        '5ceda7cf-9b4f-4401-9e98-751a27d18ca7'::uuid,
                        'Pretoria',
                        'Repair',
                        'Brake pad replacement',
                        '[]',
                        NULL,
                        true,
                        'Scheduled',
                        'High',
                        '0c1bde7c-cb9c-4ec3-b932-1d1105673a23'::uuid,
                        'Owner',
                        NOW(),
                        'LNM Mechanics',
                        NOW() + INTERVAL '3 days',
                        'Service Provider'
                    );
                ";
                
                command.ExecuteNonQuery();
                Console.WriteLine("Test scheduled jobs inserted successfully!");
                
                connection.Close();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error inserting test data: {ex.Message}");
                throw;
            }
        }

        public static void CreateTaxiRankTables(string connectionString)
        {
            try
            {
                using var connection = new NpgsqlConnection(connectionString);
                connection.Open();

                using var command = connection.CreateCommand();
                
                // Create TaxiRanks table
                command.CommandText = @"
                    CREATE TABLE IF NOT EXISTS ""TaxiRanks"" (
                        ""Id"" uuid NOT NULL,
                        ""TenantId"" uuid NOT NULL,
                        ""Name"" text NOT NULL,
                        ""Code"" text NOT NULL,
                        ""Address"" text NOT NULL,
                        ""City"" text NOT NULL,
                        ""Province"" text NOT NULL,
                        ""Latitude"" numeric NULL,
                        ""Longitude"" numeric NULL,
                        ""Capacity"" integer NULL,
                        ""OperatingHours"" text NULL,
                        ""Status"" text NOT NULL,
                        ""Notes"" text NULL,
                        ""CreatedAt"" timestamp with time zone NOT NULL,
                        ""UpdatedAt"" timestamp with time zone NULL,
                        CONSTRAINT ""PK_TaxiRanks"" PRIMARY KEY (""Id"")
                    );
                ";
                command.ExecuteNonQuery();

                // Create TaxiMarshalProfiles table
                command.CommandText = @"
                    CREATE TABLE IF NOT EXISTS ""TaxiMarshalProfiles"" (
                        ""Id"" uuid NOT NULL,
                        ""UserId"" uuid NOT NULL,
                        ""TenantId"" uuid NOT NULL,
                        ""TaxiRankId"" uuid NOT NULL,
                        ""MarshalCode"" text NOT NULL,
                        ""FullName"" text NOT NULL,
                        ""PhoneNumber"" text NOT NULL,
                        ""Email"" text NULL,
                        ""HireDate"" timestamp with time zone NOT NULL,
                        ""Status"" text NOT NULL,
                        ""IdNumber"" text NULL,
                        ""Address"" text NULL,
                        ""CreatedAt"" timestamp with time zone NOT NULL,
                        ""UpdatedAt"" timestamp with time zone NULL,
                        CONSTRAINT ""PK_TaxiMarshalProfiles"" PRIMARY KEY (""Id"")
                    );
                ";
                command.ExecuteNonQuery();

                // Create TaxiRankTrips table
                command.CommandText = @"
                    CREATE TABLE IF NOT EXISTS ""TaxiRankTrips"" (
                        ""Id"" uuid NOT NULL,
                        ""TenantId"" uuid NOT NULL,
                        ""VehicleId"" uuid NOT NULL,
                        ""DriverId"" uuid NULL,
                        ""MarshalId"" uuid NULL,
                        ""TaxiRankId"" uuid NOT NULL,
                        ""DepartureStation"" text NOT NULL,
                        ""DestinationStation"" text NOT NULL,
                        ""DepartureTime"" timestamp with time zone NOT NULL,
                        ""ArrivalTime"" timestamp with time zone NULL,
                        ""TotalAmount"" numeric NOT NULL,
                        ""TotalCosts"" numeric NOT NULL,
                        ""NetAmount"" numeric NOT NULL,
                        ""Status"" text NOT NULL,
                        ""PassengerCount"" integer NOT NULL,
                        ""Notes"" text NULL,
                        ""CompletedAt"" timestamp with time zone NULL,
                        ""Latitude"" numeric NULL,
                        ""Longitude"" numeric NULL,
                        ""CreatedAt"" timestamp with time zone NOT NULL,
                        ""UpdatedAt"" timestamp with time zone NULL,
                        CONSTRAINT ""PK_TaxiRankTrips"" PRIMARY KEY (""Id"")
                    );
                ";
                command.ExecuteNonQuery();

                // Create TripPassengers table
                command.CommandText = @"
                    CREATE TABLE IF NOT EXISTS ""TripPassengers"" (
                        ""Id"" uuid NOT NULL,
                        ""TaxiRankTripId"" uuid NOT NULL,
                        ""PassengerName"" text NULL,
                        ""PassengerPhone"" text NULL,
                        ""DepartureStation"" text NOT NULL,
                        ""ArrivalStation"" text NOT NULL,
                        ""Amount"" numeric NOT NULL,
                        ""SeatNumber"" integer NULL,
                        ""BoardedAt"" timestamp with time zone NULL,
                        ""Notes"" text NULL,
                        CONSTRAINT ""PK_TripPassengers"" PRIMARY KEY (""Id""),
                        CONSTRAINT ""FK_TripPassengers_TaxiRankTrips_TaxiRankTripId"" FOREIGN KEY (""TaxiRankTripId"") REFERENCES ""TaxiRankTrips"" (""Id"") ON DELETE CASCADE
                    );
                ";
                command.ExecuteNonQuery();

                // Create TripCosts table
                command.CommandText = @"
                    CREATE TABLE IF NOT EXISTS ""TripCosts"" (
                        ""Id"" uuid NOT NULL,
                        ""TaxiRankTripId"" uuid NOT NULL,
                        ""AddedByDriverId"" uuid NOT NULL,
                        ""Category"" text NOT NULL,
                        ""Amount"" numeric NOT NULL,
                        ""Description"" text NOT NULL,
                        ""ReceiptNumber"" text NULL,
                        ""CreatedAt"" timestamp with time zone NOT NULL,
                        CONSTRAINT ""PK_TripCosts"" PRIMARY KEY (""Id""),
                        CONSTRAINT ""FK_TripCosts_TaxiRankTrips_TaxiRankTripId"" FOREIGN KEY (""TaxiRankTripId"") REFERENCES ""TaxiRankTrips"" (""Id"") ON DELETE CASCADE
                    );
                ";
                command.ExecuteNonQuery();

                // Create TaxiRankAssociations table (many-to-many between TaxiRank and Tenant)
                command.CommandText = @"
                    CREATE TABLE IF NOT EXISTS ""TaxiRankAssociations"" (
                        ""Id"" uuid NOT NULL,
                        ""TaxiRankId"" uuid NOT NULL,
                        ""TenantId"" uuid NOT NULL,
                        ""IsPrimary"" boolean NOT NULL DEFAULT false,
                        ""AssignedAt"" timestamp with time zone NOT NULL DEFAULT NOW(),
                        ""Notes"" text NULL,
                        CONSTRAINT ""PK_TaxiRankAssociations"" PRIMARY KEY (""Id""),
                        CONSTRAINT ""FK_TaxiRankAssociations_TaxiRanks"" FOREIGN KEY (""TaxiRankId"") REFERENCES ""TaxiRanks"" (""Id"") ON DELETE CASCADE,
                        CONSTRAINT ""FK_TaxiRankAssociations_Tenants"" FOREIGN KEY (""TenantId"") REFERENCES ""Tenants"" (""Id"") ON DELETE CASCADE
                    );
                ";
                command.ExecuteNonQuery();

                // Drop legacy table name if it exists, then create TaxiRankAdmins
                command.CommandText = @"DROP TABLE IF EXISTS ""TaxiRankAdminProfiles"";";
                command.ExecuteNonQuery();

                command.CommandText = @"
                    CREATE TABLE IF NOT EXISTS ""TaxiRankAdmins"" (
                        ""Id"" uuid NOT NULL,
                        ""UserId"" uuid NOT NULL,
                        ""TenantId"" uuid NOT NULL,
                        ""TaxiRankId"" uuid NOT NULL,
                        ""AdminCode"" text NOT NULL,
                        ""FullName"" text NOT NULL,
                        ""PhoneNumber"" text NOT NULL,
                        ""Email"" text NULL,
                        ""HireDate"" timestamp with time zone NOT NULL,
                        ""Status"" text NOT NULL DEFAULT 'Active',
                        ""IdNumber"" text NULL,
                        ""Address"" text NULL,
                        ""CanManageMarshals"" boolean NOT NULL DEFAULT true,
                        ""CanManageVehicles"" boolean NOT NULL DEFAULT true,
                        ""CanManageSchedules"" boolean NOT NULL DEFAULT true,
                        ""CanViewReports"" boolean NOT NULL DEFAULT true,
                        ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT NOW(),
                        ""UpdatedAt"" timestamp with time zone NULL,
                        CONSTRAINT ""PK_TaxiRankAdmins"" PRIMARY KEY (""Id"")
                    );
                ";
                command.ExecuteNonQuery();

                // Create VehicleTaxiRanks table
                command.CommandText = @"
                    CREATE TABLE IF NOT EXISTS ""VehicleTaxiRanks"" (
                        ""Id"" uuid NOT NULL,
                        ""VehicleId"" uuid NOT NULL,
                        ""TaxiRankId"" uuid NOT NULL,
                        ""AssignedDate"" timestamp with time zone NOT NULL DEFAULT NOW(),
                        ""RemovedDate"" timestamp with time zone NULL,
                        ""IsActive"" boolean NOT NULL DEFAULT true,
                        ""Notes"" text NULL,
                        CONSTRAINT ""PK_VehicleTaxiRanks"" PRIMARY KEY (""Id"")
                    );
                ";
                command.ExecuteNonQuery();

                // Create TripSchedules table (preserving existing data)
                command.CommandText = @"
                    CREATE TABLE IF NOT EXISTS ""TripSchedules"" (
                        ""Id"" uuid NOT NULL,
                        ""TaxiRankId"" uuid NOT NULL,
                        ""TenantId"" uuid NOT NULL,
                        ""RouteName"" text NOT NULL,
                        ""DepartureStation"" text NOT NULL,
                        ""DestinationStation"" text NOT NULL,
                        ""DepartureTime"" interval NOT NULL,
                        ""FrequencyMinutes"" integer NOT NULL,
                        ""DaysOfWeek"" text NOT NULL,
                        ""StandardFare"" numeric NOT NULL,
                        ""ExpectedDurationMinutes"" integer NULL,
                        ""MaxPassengers"" integer NULL,
                        ""IsActive"" boolean NOT NULL DEFAULT true,
                        ""Notes"" text NULL,
                        ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT NOW(),
                        ""UpdatedAt"" timestamp with time zone NULL,
                        CONSTRAINT ""PK_TripSchedules"" PRIMARY KEY (""Id"")
                    );
                ";
                command.ExecuteNonQuery();

                // Create ScheduledTrips table (for specific trip instances)
                command.CommandText = @"
                    CREATE TABLE IF NOT EXISTS ""ScheduledTrips"" (
                        ""Id"" uuid NOT NULL,
                        ""TripScheduleId"" uuid NOT NULL,
                        ""TaxiRankId"" uuid NOT NULL,
                        ""TenantId"" uuid NOT NULL,
                        ""ScheduledDate"" date NOT NULL,
                        ""ScheduledTime"" interval NOT NULL,
                        ""VehicleId"" uuid NULL,
                        ""DriverId"" uuid NULL,
                        ""MarshalId"" uuid NULL,
                        ""Status"" text NOT NULL DEFAULT 'Scheduled',
                        ""ActualDepartureTime"" timestamp with time zone NULL,
                        ""ActualArrivalTime"" timestamp with time zone NULL,
                        ""ActualPassengerCount"" integer NULL,
                        ""ActualFareCollected"" numeric(18,2) NULL,
                        ""CancelledAt"" timestamp with time zone NULL,
                        ""CancellationReason"" text NULL,
                        ""CancelledBy"" uuid NULL,
                        ""Notes"" text NULL,
                        ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT NOW(),
                        ""UpdatedAt"" timestamp with time zone NULL,
                        CONSTRAINT ""PK_ScheduledTrips"" PRIMARY KEY (""Id""),
                        CONSTRAINT ""FK_ScheduledTrips_TripSchedules"" FOREIGN KEY (""TripScheduleId"") REFERENCES ""TripSchedules"" (""Id"") ON DELETE CASCADE,
                        CONSTRAINT ""FK_ScheduledTrips_TaxiRanks"" FOREIGN KEY (""TaxiRankId"") REFERENCES ""TaxiRanks"" (""Id"") ON DELETE CASCADE,
                        CONSTRAINT ""FK_ScheduledTrips_Vehicles"" FOREIGN KEY (""VehicleId"") REFERENCES ""Vehicles"" (""Id"") ON DELETE SET NULL,
                        CONSTRAINT ""FK_ScheduledTrips_Drivers"" FOREIGN KEY (""DriverId"") REFERENCES ""DriverProfiles"" (""Id"") ON DELETE SET NULL,
                        CONSTRAINT ""FK_ScheduledTrips_Marshals"" FOREIGN KEY (""MarshalId"") REFERENCES ""TaxiMarshalProfiles"" (""Id"") ON DELETE SET NULL
                    );
                ";
                command.ExecuteNonQuery();

                // Create indexes for ScheduledTrips table
                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_ScheduledTrips_TripScheduleId"" ON ""ScheduledTrips"" (""TripScheduleId"");";
                command.ExecuteNonQuery();

                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_ScheduledTrips_TaxiRankId"" ON ""ScheduledTrips"" (""TaxiRankId"");";
                command.ExecuteNonQuery();

                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_ScheduledTrips_TenantId"" ON ""ScheduledTrips"" (""TenantId"");";
                command.ExecuteNonQuery();

                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_ScheduledTrips_ScheduledDate"" ON ""ScheduledTrips"" (""ScheduledDate"");";
                command.ExecuteNonQuery();

                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_ScheduledTrips_Status"" ON ""ScheduledTrips"" (""Status"");";
                command.ExecuteNonQuery();

                // Add missing UserId column to TripPassengers if it doesn't exist
                command.CommandText = @"
                    DO $$ BEGIN
                        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='TripPassengers' AND column_name='UserId') THEN
                            ALTER TABLE ""TripPassengers"" ADD COLUMN ""UserId"" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
                        END IF;
                    END $$;
                ";
                command.ExecuteNonQuery();

                // Create indexes
                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_TripPassengers_TaxiRankTripId"" ON ""TripPassengers"" (""TaxiRankTripId"");";
                command.ExecuteNonQuery();

                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_TripCosts_TaxiRankTripId"" ON ""TripCosts"" (""TaxiRankTripId"");";
                command.ExecuteNonQuery();

                // Create QueueMarshals table
                command.CommandText = @"
                    CREATE TABLE IF NOT EXISTS ""QueueMarshals"" (
                        ""Id"" uuid NOT NULL,
                        ""FullName"" text NOT NULL,
                        ""IdNumber"" text NOT NULL,
                        ""PhoneNumber"" text NOT NULL,
                        ""Email"" text NULL,
                        ""MarshalCode"" text NOT NULL,
                        ""EmergencyContact"" text NOT NULL,
                        ""Experience"" text NULL,
                        ""TaxiRankId"" uuid NOT NULL,
                        ""Permissions"" jsonb NOT NULL DEFAULT '{}',
                        ""Status"" text NOT NULL DEFAULT 'Active',
                        ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT NOW(),
                        ""UpdatedAt"" timestamp with time zone NULL,
                        ""CreatedBy"" uuid NULL,
                        CONSTRAINT ""PK_QueueMarshals"" PRIMARY KEY (""Id""),
                        CONSTRAINT ""FK_QueueMarshals_TaxiRanks"" FOREIGN KEY (""TaxiRankId"") REFERENCES ""TaxiRanks"" (""Id"") ON DELETE CASCADE
                    );
                ";
                command.ExecuteNonQuery();

                // Create indexes for QueueMarshals table
                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_QueueMarshals_TaxiRankId"" ON ""QueueMarshals"" (""TaxiRankId"");";
                command.ExecuteNonQuery();

                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_QueueMarshals_MarshalCode"" ON ""QueueMarshals"" (""MarshalCode"");";
                command.ExecuteNonQuery();

                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_QueueMarshals_PhoneNumber"" ON ""QueueMarshals"" (""PhoneNumber"");";
                command.ExecuteNonQuery();

                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_QueueMarshals_Status"" ON ""QueueMarshals"" (""Status"");";
                command.ExecuteNonQuery();

                // Create TripCaptures table
                command.CommandText = @"
                    CREATE TABLE IF NOT EXISTS ""TripCaptures"" (
                        ""Id"" uuid NOT NULL,
                        ""MarshalId"" uuid NOT NULL,
                        ""ScheduleId"" uuid NOT NULL,
                        ""VehicleId"" uuid NOT NULL,
                        ""TaxiRankId"" uuid NOT NULL,
                        ""PassengerCount"" integer NOT NULL,
                        ""FareCollected"" numeric(18,2) NOT NULL,
                        ""CapturedAt"" timestamp with time zone NOT NULL,
                        ""Notes"" text NULL,
                        ""PhotoUri"" text NULL,
                        ""Status"" text NOT NULL DEFAULT 'Completed',
                        ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT NOW(),
                        ""UpdatedAt"" timestamp with time zone NULL,
                        CONSTRAINT ""PK_TripCaptures"" PRIMARY KEY (""Id""),
                        CONSTRAINT ""FK_TripCaptures_QueueMarshals"" FOREIGN KEY (""MarshalId"") REFERENCES ""QueueMarshals"" (""Id"") ON DELETE CASCADE,
                        CONSTRAINT ""FK_TripCaptures_TripSchedules"" FOREIGN KEY (""ScheduleId"") REFERENCES ""TripSchedules"" (""Id"") ON DELETE CASCADE,
                        CONSTRAINT ""FK_TripCaptures_Vehicles"" FOREIGN KEY (""VehicleId"") REFERENCES ""Vehicles"" (""Id"") ON DELETE CASCADE,
                        CONSTRAINT ""FK_TripCaptures_TaxiRanks"" FOREIGN KEY (""TaxiRankId"") REFERENCES ""TaxiRanks"" (""Id"") ON DELETE CASCADE
                    );
                ";
                command.ExecuteNonQuery();

                // Create indexes for TripCaptures table
                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_TripCaptures_MarshalId"" ON ""TripCaptures"" (""MarshalId"");";
                command.ExecuteNonQuery();

                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_TripCaptures_ScheduleId"" ON ""TripCaptures"" (""ScheduleId"");";
                command.ExecuteNonQuery();

                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_TripCaptures_VehicleId"" ON ""TripCaptures"" (""VehicleId"");";
                command.ExecuteNonQuery();

                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_TripCaptures_TaxiRankId"" ON ""TripCaptures"" (""TaxiRankId"");";
                command.ExecuteNonQuery();

                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_TripCaptures_CapturedAt"" ON ""TripCaptures"" (""CapturedAt"");";
                command.ExecuteNonQuery();

                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_TripCaptures_Status"" ON ""TripCaptures"" (""Status"");";
                command.ExecuteNonQuery();

                // Update Messages table to support Queue Marshals
                command.CommandText = @"
                    DO $$ BEGIN
                        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Messages' AND column_name='RecipientMarshalId') THEN
                            ALTER TABLE ""Messages"" ADD COLUMN ""RecipientMarshalId"" uuid NULL;
                        END IF;
                    END $$;
                ";
                command.ExecuteNonQuery();

                command.CommandText = @"
                    DO $$ BEGIN
                        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Messages' AND column_name='RecipientDriverId') THEN
                            ALTER TABLE ""Messages"" ADD COLUMN ""RecipientDriverId"" uuid NULL;
                        END IF;
                    END $$;
                ";
                command.ExecuteNonQuery();

                // Create indexes for Messages table
                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_Messages_RecipientMarshalId"" ON ""Messages"" (""RecipientMarshalId"");";
                command.ExecuteNonQuery();

                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_Messages_RecipientDriverId"" ON ""Messages"" (""RecipientDriverId"");";
                command.ExecuteNonQuery();

                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_TaxiRankAssociations_TaxiRankId"" ON ""TaxiRankAssociations"" (""TaxiRankId"");";
                command.ExecuteNonQuery();

                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_TaxiRankAssociations_TenantId"" ON ""TaxiRankAssociations"" (""TenantId"");";
                command.ExecuteNonQuery();

                // RouteStops table (preserving existing data)
                command.CommandText = @"
                    CREATE TABLE IF NOT EXISTS ""RouteStops"" (
                        ""Id"" UUID NOT NULL CONSTRAINT ""PK_RouteStops"" PRIMARY KEY,
                        ""TripScheduleId"" UUID NOT NULL,
                        ""StopName"" TEXT NOT NULL,
                        ""StopOrder"" INT NOT NULL DEFAULT 1,
                        ""FareFromOrigin"" NUMERIC(18,2) NOT NULL DEFAULT 0,
                        ""EstimatedMinutesFromDeparture"" INT NULL,
                        ""StopNotes"" TEXT NULL,
                        ""CreatedAt"" TIMESTAMP NOT NULL DEFAULT NOW(),
                        CONSTRAINT ""FK_RouteStops_TripSchedules"" FOREIGN KEY (""TripScheduleId"") REFERENCES ""TripSchedules"" (""Id"") ON DELETE CASCADE
                    );
                ";
                command.ExecuteNonQuery();

                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_RouteStops_TripScheduleId"" ON ""RouteStops"" (""TripScheduleId"");";
                command.ExecuteNonQuery();

                // RouteVehicles table (many-to-many junction)
                command.CommandText = @"
                    CREATE TABLE IF NOT EXISTS ""RouteVehicles"" (
                        ""Id"" UUID NOT NULL CONSTRAINT ""PK_RouteVehicles"" PRIMARY KEY,
                        ""TripScheduleId"" UUID NOT NULL,
                        ""VehicleId"" UUID NOT NULL,
                        ""AssignedAt"" TIMESTAMP NOT NULL DEFAULT NOW(),
                        ""IsActive"" BOOLEAN NOT NULL DEFAULT true,
                        ""Notes"" TEXT NULL,
                        CONSTRAINT ""FK_RouteVehicles_TripSchedules"" FOREIGN KEY (""TripScheduleId"") REFERENCES ""TripSchedules"" (""Id"") ON DELETE CASCADE,
                        CONSTRAINT ""FK_RouteVehicles_Vehicles"" FOREIGN KEY (""VehicleId"") REFERENCES ""Vehicles"" (""Id"") ON DELETE CASCADE
                    );
                ";
                command.ExecuteNonQuery();

                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_RouteVehicles_TripScheduleId"" ON ""RouteVehicles"" (""TripScheduleId"");";
                command.ExecuteNonQuery();

                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_RouteVehicles_VehicleId"" ON ""RouteVehicles"" (""VehicleId"");";
                command.ExecuteNonQuery();

                // ScheduledTripBookings table
                command.CommandText = @"
                    CREATE TABLE IF NOT EXISTS ""ScheduledTripBookings"" (
                        ""Id"" UUID NOT NULL CONSTRAINT ""PK_ScheduledTripBookings"" PRIMARY KEY,
                        ""UserId"" UUID NOT NULL,
                        ""TripScheduleId"" UUID NOT NULL,
                        ""TaxiRankId"" UUID NOT NULL,
                        ""TravelDate"" TIMESTAMP NOT NULL,
                        ""SeatsBooked"" INTEGER NOT NULL DEFAULT 1,
                        ""TotalFare"" NUMERIC NOT NULL DEFAULT 0,
                        ""PassengerName"" TEXT NOT NULL DEFAULT '',
                        ""PassengerPhone"" TEXT NOT NULL DEFAULT '',
                        ""Status"" TEXT NOT NULL DEFAULT 'Pending',
                        ""Notes"" TEXT,
                        ""CancellationReason"" TEXT,
                        ""CreatedAt"" TIMESTAMP NOT NULL DEFAULT NOW(),
                        ""UpdatedAt"" TIMESTAMP,
                        ""ConfirmedAt"" TIMESTAMP,
                        ""CancelledAt"" TIMESTAMP,
                        CONSTRAINT ""FK_ScheduledTripBookings_TripSchedules"" FOREIGN KEY (""TripScheduleId"") REFERENCES ""TripSchedules"" (""Id"") ON DELETE CASCADE,
                        CONSTRAINT ""FK_ScheduledTripBookings_TaxiRanks"" FOREIGN KEY (""TaxiRankId"") REFERENCES ""TaxiRanks"" (""Id"") ON DELETE CASCADE
                    );
                ";
                command.ExecuteNonQuery();

                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_ScheduledTripBookings_UserId"" ON ""ScheduledTripBookings"" (""UserId"");";
                command.ExecuteNonQuery();

                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_ScheduledTripBookings_TripScheduleId"" ON ""ScheduledTripBookings"" (""TripScheduleId"");";
                command.ExecuteNonQuery();

                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_ScheduledTripBookings_TaxiRankId"" ON ""ScheduledTripBookings"" (""TaxiRankId"");";
                command.ExecuteNonQuery();

                // Add TaxiRankId column to Vehicles table
                command.CommandText = @"
                    DO $$ 
                    BEGIN 
                        IF NOT EXISTS (
                            SELECT 1 FROM information_schema.columns 
                            WHERE table_name = 'Vehicles' AND column_name = 'TaxiRankId'
                        ) THEN
                            ALTER TABLE ""Vehicles"" ADD COLUMN ""TaxiRankId"" UUID NULL;
                            CREATE INDEX IF NOT EXISTS ""IX_Vehicles_TaxiRankId"" ON ""Vehicles"" (""TaxiRankId"");
                        END IF;
                    END $$;
                ";
                command.ExecuteNonQuery();

                // Create VehicleTaxiRankRequests table
                command.CommandText = @"
                    CREATE TABLE IF NOT EXISTS ""VehicleTaxiRankRequests"" (
                        ""Id"" UUID NOT NULL CONSTRAINT ""PK_VehicleTaxiRankRequests"" PRIMARY KEY,
                        ""VehicleId"" UUID NOT NULL,
                        ""TaxiRankId"" UUID NOT NULL,
                        ""RequestedByUserId"" UUID NOT NULL,
                        ""RequestedByName"" TEXT NOT NULL,
                        ""VehicleRegistration"" TEXT NOT NULL,
                        ""TaxiRankName"" TEXT NOT NULL,
                        ""Status"" TEXT NOT NULL DEFAULT 'Pending',
                        ""Notes"" TEXT,
                        ""RequestedAt"" TIMESTAMP NOT NULL DEFAULT NOW(),
                        ""ReviewedAt"" TIMESTAMP,
                        ""ReviewedByUserId"" UUID,
                        ""ReviewedByName"" TEXT,
                        ""RejectionReason"" TEXT
                    );
                ";
                command.ExecuteNonQuery();

                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_VehicleTaxiRankRequests_VehicleId"" ON ""VehicleTaxiRankRequests"" (""VehicleId"");";
                command.ExecuteNonQuery();

                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_VehicleTaxiRankRequests_TaxiRankId"" ON ""VehicleTaxiRankRequests"" (""TaxiRankId"");";
                command.ExecuteNonQuery();

                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_VehicleTaxiRankRequests_Status"" ON ""VehicleTaxiRankRequests"" (""Status"");";
                command.ExecuteNonQuery();

                // Create Trips table for TripDetails module
                command.CommandText = @"
                    CREATE TABLE IF NOT EXISTS ""Trips"" (
                        ""Id"" uuid NOT NULL,
                        ""VehicleId"" uuid NOT NULL,
                        ""RouteId"" uuid NULL,
                        ""DriverId"" uuid NULL,
                        ""TripDate"" timestamp with time zone NOT NULL,
                        ""DepartureTime"" text NOT NULL,
                        ""ArrivalTime"" text NULL,
                        ""PassengerCount"" integer NOT NULL DEFAULT 0,
                        ""TotalFare"" numeric NOT NULL DEFAULT 0,
                        ""Notes"" text NULL,
                        ""Status"" text NOT NULL DEFAULT 'Completed',
                        ""PassengerListFileName"" text NULL,
                        ""PassengerListFileData"" text NULL,
                        ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT NOW(),
                        CONSTRAINT ""PK_Trips"" PRIMARY KEY (""Id"")
                    );
                ";
                command.ExecuteNonQuery();

                // Create Passengers table for TripDetails module
                command.CommandText = @"
                    CREATE TABLE IF NOT EXISTS ""Passengers"" (
                        ""Id"" uuid NOT NULL,
                        ""TripId"" uuid NOT NULL,
                        ""Name"" text NOT NULL,
                        ""ContactNumber"" text NULL,
                        ""NextOfKin"" text NULL,
                        ""NextOfKinContact"" text NULL,
                        ""Address"" text NULL,
                        ""Destination"" text NULL,
                        ""FareAmount"" numeric NOT NULL DEFAULT 0,
                        CONSTRAINT ""PK_Passengers"" PRIMARY KEY (""Id""),
                        CONSTRAINT ""FK_Passengers_Trips_TripId"" FOREIGN KEY (""TripId"") REFERENCES ""Trips"" (""Id"") ON DELETE CASCADE
                    );
                ";
                command.ExecuteNonQuery();

                // Create indexes for Trips and Passengers
                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_Trips_VehicleId"" ON ""Trips"" (""VehicleId"");";
                command.ExecuteNonQuery();

                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_Trips_RouteId"" ON ""Trips"" (""RouteId"");";
                command.ExecuteNonQuery();

                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_Trips_DriverId"" ON ""Trips"" (""DriverId"");";
                command.ExecuteNonQuery();

                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_Passengers_TripId"" ON ""Passengers"" (""TripId"");";
                command.ExecuteNonQuery();

                // Create BookingPassengers table for enhanced booking system
                command.CommandText = @"
                    CREATE TABLE IF NOT EXISTS ""BookingPassengers"" (
                        ""Id"" uuid NOT NULL,
                        ""BookingId"" uuid NOT NULL,
                        ""Name"" text NOT NULL,
                        ""ContactNumber"" text NOT NULL,
                        ""Email"" text NULL,
                        ""IdNumber"" text NULL,
                        ""Address"" text NULL,
                        ""Destination"" text NOT NULL,
                        ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT NOW(),
                        CONSTRAINT ""PK_BookingPassengers"" PRIMARY KEY (""Id""),
                        CONSTRAINT ""FK_BookingPassengers_ScheduledTripBookings_BookingId"" FOREIGN KEY (""BookingId"") REFERENCES ""ScheduledTripBookings"" (""Id"") ON DELETE CASCADE
                    );
                ";
                command.ExecuteNonQuery();

                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_BookingPassengers_BookingId"" ON ""BookingPassengers"" (""BookingId"");";
                command.ExecuteNonQuery();

                Console.WriteLine("Taxi rank tables created successfully!");
                connection.Close();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating taxi rank tables: {ex.Message}");
                throw;
            }
        }
    }
}
