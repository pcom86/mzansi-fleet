using System;
using Npgsql;
using System.IO;

var connectionString = "Host=localhost;Database=MzansiFleet Database;Username=postgres;Password=passy123";
var sqlFilePath = "./Migrations/20260115_AddTenderTables.sql";

try
{
    var sqlScript = File.ReadAllText(sqlFilePath);
    
    using var connection = new NpgsqlConnection(connectionString);
    connection.Open();
    
    using var command = connection.CreateCommand();
    command.CommandText = sqlScript;
    var result = command.ExecuteNonQuery();
    
    Console.WriteLine("✓ Tender tables migration applied successfully!");
    Console.WriteLine($"Migration completed: {result} operations executed");
}
catch (Exception ex)
{
    Console.WriteLine($"✗ Error applying migration: {ex.Message}");
    Console.WriteLine(ex.StackTrace);
    Environment.Exit(1);
}
