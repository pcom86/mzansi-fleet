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

                // Create indexes
                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_TripPassengers_TaxiRankTripId"" ON ""TripPassengers"" (""TaxiRankTripId"");";
                command.ExecuteNonQuery();

                command.CommandText = @"CREATE INDEX IF NOT EXISTS ""IX_TripCosts_TaxiRankTripId"" ON ""TripCosts"" (""TaxiRankTripId"");";
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
