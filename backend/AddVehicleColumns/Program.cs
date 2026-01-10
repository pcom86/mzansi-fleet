using System;
using Npgsql;

var connectionString = "Host=localhost;Database=MzansiFleetDb;Username=postgres;Password=postgres";

try
{
    using var connection = new NpgsqlConnection(connectionString);
    connection.Open();
    
    // First, check what columns exist
    var checkColumns = @"
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='Vehicles' 
        ORDER BY ordinal_position;";
    
    using var checkCmd = new NpgsqlCommand(checkColumns, connection);
    using var reader = checkCmd.ExecuteReader();
    
    Console.WriteLine("Existing columns in Vehicles table:");
    while (reader.Read())
    {
        Console.WriteLine($"- {reader.GetString(0)}");
    }
    reader.Close();
    
    // Check if Photos column exists
    var checkPhotos = @"
        SELECT COUNT(*) 
        FROM information_schema.columns 
        WHERE table_name='Vehicles' AND column_name='Photos';";
    
    using var photosCmd = new NpgsqlCommand(checkPhotos, connection);
    var hasPhotos = Convert.ToInt32(photosCmd.ExecuteScalar()) > 0;
    
    Console.WriteLine($"\nPhotos column exists: {hasPhotos}");
    
    // Get vehicle count
    var countSql = @"SELECT COUNT(*) FROM ""Vehicles"";";
    using var countCmd = new NpgsqlCommand(countSql, connection);
    var count = countCmd.ExecuteScalar();
    
    Console.WriteLine($"Total vehicles: {count}");
}
catch (Exception ex)
{
    Console.WriteLine($"Error: {ex.Message}");
    Console.WriteLine($"Stack: {ex.StackTrace}");
}
