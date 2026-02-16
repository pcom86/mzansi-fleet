# Script to create default tenant using Npgsql directly
Add-Type -Path "C:\Users\pmaseko\.nuget\packages\npgsql\8.0.5\lib\net8.0\Npgsql.dll"

$connectionString = "Host=localhost;Database=MzansiFleetDb;Username=postgres;Password=postgres"

try {
    $conn = [Npgsql.NpgsqlConnection]::new($connectionString)
    $conn.Open()
    
    $sql = @"
INSERT INTO "Tenants" ("Id", "Name", "ContactEmail", "ContactPhone")
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'Default Tenant', 'admin@mzansifleet.com', '+27 11 000 0000')
ON CONFLICT ("Id") DO NOTHING;
"@
    
    $cmd = [Npgsql.NpgsqlCommand]::new($sql, $conn)
    $rowsAffected = $cmd.ExecuteNonQuery()
    
    if ($rowsAffected -gt 0) {
        Write-Host "✓ Default tenant created successfully!" -ForegroundColor Green
    } else {
        Write-Host "✓ Tenant already exists" -ForegroundColor Yellow
    }
    
    $conn.Close()
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
