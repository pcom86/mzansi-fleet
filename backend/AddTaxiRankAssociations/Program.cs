using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace AddTaxiRankAssociations
{
    class Program
    {
        static async Task Main(string[] args)
        {
            Console.WriteLine("=== Add TaxiRankAssociations Table Migration ===\n");

            var configuration = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: false)
                .Build();

            var connectionString = configuration.GetConnectionString("DefaultConnection");

            try
            {
                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                Console.WriteLine("Connected to database successfully.\n");

                // Step 1: Create TaxiRankAssociations table
                Console.WriteLine("Step 1: Creating TaxiRankAssociations table...");
                await CreateTaxiRankAssociationsTable(connection);
                Console.WriteLine("✓ TaxiRankAssociations table created successfully.\n");

                // Step 2: Migrate existing TenantId relationships from TaxiRanks
                Console.WriteLine("Step 2: Migrating existing TaxiRank-Tenant relationships...");
                var migratedCount = await MigrateExistingRelationships(connection);
                Console.WriteLine($"✓ Migrated {migratedCount} existing relationships.\n");

                // Step 3: Display summary
                Console.WriteLine("Step 3: Verifying migration...");
                await DisplayMigrationSummary(connection);

                Console.WriteLine("\n=== Migration completed successfully! ===");
                Console.WriteLine("\nNOTE: The TenantId column in TaxiRanks table is kept for backward compatibility.");
                Console.WriteLine("Consider removing it after updating all application code to use TaxiRankAssociations.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"\n❌ ERROR: {ex.Message}");
                Console.WriteLine($"\nStack Trace: {ex.StackTrace}");
                Environment.Exit(1);
            }
        }

        static async Task CreateTaxiRankAssociationsTable(NpgsqlConnection connection)
        {
            var createTableSql = @"
                CREATE TABLE IF NOT EXISTS ""TaxiRankAssociations"" (
                    ""Id"" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    ""TaxiRankId"" UUID NOT NULL,
                    ""TenantId"" UUID NOT NULL,
                    ""IsPrimary"" BOOLEAN NOT NULL DEFAULT FALSE,
                    ""AssignedAt"" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    ""Notes"" VARCHAR(500),
                    
                    CONSTRAINT ""FK_TaxiRankAssociations_TaxiRanks"" 
                        FOREIGN KEY (""TaxiRankId"") 
                        REFERENCES ""TaxiRanks""(""Id"") 
                        ON DELETE CASCADE,
                    
                    CONSTRAINT ""FK_TaxiRankAssociations_Tenants"" 
                        FOREIGN KEY (""TenantId"") 
                        REFERENCES ""Tenants""(""Id"") 
                        ON DELETE CASCADE,
                    
                    -- Ensure no duplicate associations
                    CONSTRAINT ""UQ_TaxiRankAssociations_TaxiRank_Tenant"" 
                        UNIQUE (""TaxiRankId"", ""TenantId"")
                );

                -- Create indexes for performance
                CREATE INDEX IF NOT EXISTS ""IX_TaxiRankAssociations_TaxiRankId"" 
                    ON ""TaxiRankAssociations""(""TaxiRankId"");
                
                CREATE INDEX IF NOT EXISTS ""IX_TaxiRankAssociations_TenantId"" 
                    ON ""TaxiRankAssociations""(""TenantId"");
                
                CREATE INDEX IF NOT EXISTS ""IX_TaxiRankAssociations_IsPrimary"" 
                    ON ""TaxiRankAssociations""(""IsPrimary"");
            ";

            await using var command = new NpgsqlCommand(createTableSql, connection);
            await command.ExecuteNonQueryAsync();
        }

        static async Task<int> MigrateExistingRelationships(NpgsqlConnection connection)
        {
            // Insert existing TaxiRank-Tenant relationships into TaxiRankAssociations
            // Mark these as primary associations since they were the original assignments
            var migrateSql = @"
                INSERT INTO ""TaxiRankAssociations"" (""TaxiRankId"", ""TenantId"", ""IsPrimary"", ""AssignedAt"", ""Notes"")
                SELECT 
                    ""Id"" as ""TaxiRankId"",
                    ""TenantId"",
                    TRUE as ""IsPrimary"",
                    ""CreatedAt"" as ""AssignedAt"",
                    'Migrated from original TaxiRank.TenantId' as ""Notes""
                FROM ""TaxiRanks""
                WHERE ""TenantId"" IS NOT NULL
                ON CONFLICT (""TaxiRankId"", ""TenantId"") DO NOTHING;
                
                SELECT COUNT(*) FROM ""TaxiRankAssociations"";
            ";

            await using var command = new NpgsqlCommand(migrateSql, connection);
            var count = await command.ExecuteScalarAsync();
            return Convert.ToInt32(count);
        }

        static async Task DisplayMigrationSummary(NpgsqlConnection connection)
        {
            var summarySql = @"
                SELECT 
                    COUNT(DISTINCT ""TaxiRankId"") as total_ranks,
                    COUNT(*) as total_associations,
                    SUM(CASE WHEN ""IsPrimary"" = TRUE THEN 1 ELSE 0 END) as primary_associations
                FROM ""TaxiRankAssociations"";
            ";

            await using var command = new NpgsqlCommand(summarySql, connection);
            await using var reader = await command.ExecuteReaderAsync();

            if (await reader.ReadAsync())
            {
                Console.WriteLine($"  - Total Taxi Ranks with associations: {reader.GetInt32(0)}");
                Console.WriteLine($"  - Total associations created: {reader.GetInt32(1)}");
                Console.WriteLine($"  - Primary associations: {reader.GetInt32(2)}");
            }
        }
    }
}
