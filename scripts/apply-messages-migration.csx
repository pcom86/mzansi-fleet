using System;
using Npgsql;
using System.IO;

var connectionString = "Host=localhost;Port=5432;Database=mzansi_fleet;Username=postgres;Password=Maseko@1988";
var sqlScript = File.ReadAllText("add-messages-table.sql");

Console.WriteLine("Applying Messages table migration...");

try
{
    using var connection = new NpgsqlConnection(connectionString);
    connection.Open();
    
    using var command = new NpgsqlCommand(sqlScript, connection);
    command.ExecuteNonQuery();
    
    Console.WriteLine("\nMigration completed successfully!");
    Console.WriteLine("Messages table created with indexes and constraints.");
}
catch (Exception ex)
{
    Console.WriteLine($"\nMigration failed! Error: {ex.Message}");
    Environment.Exit(1);
}
