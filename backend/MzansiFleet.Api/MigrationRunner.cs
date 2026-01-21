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
    }
}
