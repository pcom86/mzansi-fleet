<#
.SYNOPSIS
    Check the structure of the Trips table

.DESCRIPTION
    This script checks if the Trips table has a TenantId column
#>

$ErrorActionPreference = "Stop"

# Database configuration
$DatabaseName = "MzansiFleet"
$ServerHost = "localhost"
$Port = 5432
$Username = "postgres"
$password = $env:PGPASSWORD
if (-not $password) {
    $password = "postgres"
}

$connectionString = "Host=$ServerHost;Port=$Port;Database=$DatabaseName;Username=$Username;Password=$password"

# Find and load Npgsql assembly
Write-Host "Locating Npgsql assembly..." -ForegroundColor Cyan
$npgsqlPath = Get-ChildItem -Path "$env:USERPROFILE\.nuget\packages\npgsql" -Filter "Npgsql.dll" -Recurse -ErrorAction SilentlyContinue | 
    Where-Object { $_.DirectoryName -like "*\lib\net8.0" -or $_.DirectoryName -like "*\lib\net6.0" -or $_.DirectoryName -like "*\lib\netstandard2.1" } | 
    Sort-Object -Property DirectoryName -Descending |
    Select-Object -First 1

if (-not $npgsqlPath) {
    Write-Host "ERROR: Npgsql.dll not found." -ForegroundColor Red
    exit 1
}

Write-Host "Loading Npgsql from: $($npgsqlPath.FullName)" -ForegroundColor Cyan
try {
    Add-Type -Path $npgsqlPath.FullName -ErrorAction Stop
}
catch {
    Write-Host "Failed to load Npgsql. Trying alternative approach..." -ForegroundColor Yellow
    # Load System.Runtime.CompilerServices.Unsafe if needed
    $unsafePath = Get-ChildItem -Path "$env:USERPROFILE\.nuget\packages\system.runtime.compilerservices.unsafe" -Filter "System.Runtime.CompilerServices.Unsafe.dll" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($unsafePath) {
        Add-Type -Path $unsafePath.FullName -ErrorAction SilentlyContinue
    }
    Add-Type -Path $npgsqlPath.FullName -ErrorAction Stop
}

# Connect and query
$connection = $null
try {
    $connection = [Npgsql.NpgsqlConnection]::new($connectionString)
    $connection.Open()
    
    Write-Host "Checking Trips table structure..." -ForegroundColor Cyan
    Write-Host ""
    
    $command = $connection.CreateCommand()
    $command.CommandText = @"
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Trips'
ORDER BY ordinal_position;
"@
    
    $reader = $command.ExecuteReader()
    
    $hasTenantId = $false
    Write-Host "Columns in Trips table:" -ForegroundColor Green
    Write-Host "----------------------------------------" -ForegroundColor Green
    
    while ($reader.Read()) {
        $columnName = $reader.GetString(0)
        $dataType = $reader.GetString(1)
        $isNullable = $reader.GetString(2)
        
        Write-Host "$columnName - $dataType (Nullable: $isNullable)"
        
        if ($columnName -eq "TenantId") {
            $hasTenantId = $true
        }
    }
    
    $reader.Close()
    
    Write-Host ""
    Write-Host "----------------------------------------" -ForegroundColor Yellow
    if ($hasTenantId) {
        Write-Host "TenantId column EXISTS in Trips table" -ForegroundColor Green
    } else {
        Write-Host "TenantId column DOES NOT EXIST in Trips table" -ForegroundColor Red
        Write-Host ""
        Write-Host "The Trips table is missing a TenantId column!" -ForegroundColor Red
        Write-Host "This means trips cannot be filtered by tenant." -ForegroundColor Red
        Write-Host ""
        Write-Host "Solution: Add a TenantId column to the Trips table" -ForegroundColor Yellow
        Write-Host "or ensure trips are filtered through the Vehicle TenantId" -ForegroundColor Yellow
    }
    Write-Host "----------------------------------------" -ForegroundColor Yellow
    
    $connection.Close()
}
catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($connection -and $connection.State -eq "Open") {
        $connection.Close()
    }
    exit 1
}
