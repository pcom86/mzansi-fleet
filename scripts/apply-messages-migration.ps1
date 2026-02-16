# Apply Messages table migration to PostgreSQL database
# Usage: .\apply-messages-migration.ps1

$scriptPath = ".\add-messages-table.sql"
$server = "localhost"
$port = "5432"
$database = "mzansifleet"
$username = "postgres"

Write-Host "Applying Messages table migration..." -ForegroundColor Cyan
Write-Host "Database: $database" -ForegroundColor Yellow

# Prompt for password
$password = Read-Host "Enter PostgreSQL password" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Set PGPASSWORD environment variable
$env:PGPASSWORD = $plainPassword

try {
    # Execute the SQL script
    Write-Host "Executing SQL script..." -ForegroundColor Green
    psql -h $server -p $port -U $username -d $database -f $scriptPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nMigration completed successfully!" -ForegroundColor Green
        Write-Host "Messages table created with indexes and constraints." -ForegroundColor Green
    } else {
        Write-Host "`nMigration failed! Exit code: $LASTEXITCODE" -ForegroundColor Red
    }
} catch {
    Write-Host "`nError: $_" -ForegroundColor Red
} finally {
    # Clear password from environment
    $env:PGPASSWORD = $null
}
