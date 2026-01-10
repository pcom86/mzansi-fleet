using Npgsql;

var connectionString = "Host=localhost;Database=mzansi_fleet;Username=postgres;Password=postgres";

using var connection = new NpgsqlConnection(connectionString);
await connection.OpenAsync();

var sql = @"
ALTER TABLE ""Trips"" ADD COLUMN IF NOT EXISTS ""PassengerListFileName"" text NULL;
ALTER TABLE ""Trips"" ADD COLUMN IF NOT EXISTS ""PassengerListFileData"" text NULL;
";

using var command = new NpgsqlCommand(sql, connection);
await command.ExecuteNonQueryAsync();

Console.WriteLine("Migration applied successfully!");
