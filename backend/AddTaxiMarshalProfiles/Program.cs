using System;
using Npgsql;

var connectionString = "Host=localhost;Port=5432;Database=MzansiFleetDb;Username=postgres;Password=postgres";

using var connection = new NpgsqlConnection(connectionString);
connection.Open();

Console.WriteLine("Creating TaxiMarshalProfiles table...");

var createTableSql = @"
CREATE TABLE IF NOT EXISTS ""TaxiMarshalProfiles"" (
    ""Id"" UUID PRIMARY KEY,
    ""UserId"" UUID NOT NULL,
    ""TenantId"" UUID NOT NULL,
    ""TaxiRankId"" UUID NOT NULL,
    ""MarshalCode"" VARCHAR(50) NOT NULL UNIQUE,
    ""FullName"" VARCHAR(200) NOT NULL,
    ""PhoneNumber"" VARCHAR(20) NOT NULL,
    ""Email"" VARCHAR(255),
    ""HireDate"" TIMESTAMP NOT NULL,
    ""Status"" VARCHAR(50) NOT NULL DEFAULT 'Active',
    ""IdNumber"" VARCHAR(50),
    ""Address"" TEXT,
    ""CreatedAt"" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ""UpdatedAt"" TIMESTAMP,
    
    CONSTRAINT ""FK_TaxiMarshalProfiles_Users"" FOREIGN KEY (""UserId"") 
        REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
    CONSTRAINT ""FK_TaxiMarshalProfiles_Tenants"" FOREIGN KEY (""TenantId"") 
        REFERENCES ""Tenants""(""Id"") ON DELETE CASCADE,
    CONSTRAINT ""FK_TaxiMarshalProfiles_TaxiRanks"" FOREIGN KEY (""TaxiRankId"") 
        REFERENCES ""TaxiRanks""(""Id"") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ""IX_TaxiMarshalProfiles_UserId"" ON ""TaxiMarshalProfiles""(""UserId"");
CREATE INDEX IF NOT EXISTS ""IX_TaxiMarshalProfiles_TenantId"" ON ""TaxiMarshalProfiles""(""TenantId"");
CREATE INDEX IF NOT EXISTS ""IX_TaxiMarshalProfiles_TaxiRankId"" ON ""TaxiMarshalProfiles""(""TaxiRankId"");
CREATE INDEX IF NOT EXISTS ""IX_TaxiMarshalProfiles_MarshalCode"" ON ""TaxiMarshalProfiles""(""MarshalCode"");
";

using (var cmd = new NpgsqlCommand(createTableSql, connection))
{
    cmd.ExecuteNonQuery();
}

Console.WriteLine("✓ TaxiMarshalProfiles table created successfully!");

// Verify table exists
var verifySql = @"
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'TaxiMarshalProfiles'";

using (var cmd = new NpgsqlCommand(verifySql, connection))
using (var reader = cmd.ExecuteReader())
{
    if (reader.Read())
    {
        Console.WriteLine($"✓ Verified: Table '{reader.GetString(0)}' exists");
    }
}

Console.WriteLine("\nMigration completed successfully!");
