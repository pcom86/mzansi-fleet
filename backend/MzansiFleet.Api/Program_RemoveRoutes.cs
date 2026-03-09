using Microsoft.EntityFrameworkCore;
using Npgsql;
using System;

namespace MzansiFleet.Api
{
    public static class Program_RemoveRoutes
    {
        public static void RemoveRoutesTable(string connectionString)
        {
            try
            {
                using var connection = new NpgsqlConnection(connectionString);
                connection.Open();

                using var command = connection.CreateCommand();
                
                // Only drop Routes table if it exists
                command.CommandText = @"
                    DO $$ 
                    BEGIN 
                        IF EXISTS (
                            SELECT 1 FROM information_schema.tables 
                            WHERE table_name = 'Routes'
                        ) THEN
                            DROP TABLE ""Routes"";
                            RAISE NOTICE 'Routes table dropped successfully';
                        ELSE
                            RAISE NOTICE 'Routes table does not exist';
                        END IF;
                    END $$;
                ";
                
                command.ExecuteNonQuery();
                Console.WriteLine("Routes table removal completed successfully!");
                
                connection.Close();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error removing Routes table: {ex.Message}");
                throw;
            }
        }
    }
}
