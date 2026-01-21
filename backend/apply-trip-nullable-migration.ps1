<#
.SYNOPSIS
    Applies database migration to make Trip fields nullable.

.DESCRIPTION
    This migration makes the RouteId and DriverId columns nullable in the Trips table
    to support rental trips where a route or driver may not be assigned initially.

.PARAMETER DatabaseName
    The name of the PostgreSQL database. Default: MzansiFleet

.PARAMETER ServerHost
    The PostgreSQL server host. Default: localhost

.PARAMETER Port
    The PostgreSQL server port. Default: 5432

.PARAMETER Username
    The PostgreSQL username. Default: postgres

.PARAMETER SqlFilePath
    Path to the SQL migration file. Default: make-trip-fields-nullable.sql

.EXAMPLE
    .\apply-trip-nullable-migration.ps1
    .\apply-trip-nullable-migration.ps1 -DatabaseName "MzansiFleetDb" -ServerHost "localhost"
#>

param(
    [string]$DatabaseName = "MzansiFleet",
    [string]$ServerHost = "localhost",
    [int]$Port = 5432,
    [string]$Username = "postgres",
    [string]$SqlFilePath = "make-trip-fields-nullable.sql"
)

# Configuration
$ErrorActionPreference = "Stop"
$password = $env:PGPASSWORD
if (-not $password) {
    $password = "postgres"  # Fallback for development
    Write-Host "Warning: Using default password. Set PGPASSWORD environment variable for production." -ForegroundColor Yellow
}

$connectionString = "Host=$ServerHost;Port=$Port;Database=$DatabaseName;Username=$Username;Password=$password"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Trip Nullable Fields Migration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Database: $DatabaseName" -ForegroundColor Cyan
Write-Host "Host: $ServerHost" -ForegroundColor Cyan
Write-Host ""

# Validate SQL file exists
if (-not (Test-Path $SqlFilePath)) {
    Write-Host "ERROR: SQL file not found: $SqlFilePath" -ForegroundColor Red
    Write-Host "Please ensure the SQL file exists in the current directory." -ForegroundColor Red
    exit 1
}

Write-Host "Reading SQL migration file..." -ForegroundColor Cyan
$sqlContent = Get-Content $SqlFilePath -Raw

# Find and load Npgsql assembly
Write-Host "Locating Npgsql assembly..." -ForegroundColor Cyan
$npgsqlPath = Get-ChildItem -Path "$env:USERPROFILE\.nuget\packages\npgsql" -Filter "Npgsql.dll" -Recurse -ErrorAction SilentlyContinue | 
    Where-Object { $_.DirectoryName -like "*\lib\net8.0" -or $_.DirectoryName -like "*\lib\net6.0" } | 
    Select-Object -First 1

if (-not $npgsqlPath) {
    Write-Host "ERROR: Npgsql.dll not found in NuGet packages." -ForegroundColor Red
    Write-Host "Please install Npgsql package: dotnet add package Npgsql" -ForegroundColor Red
    exit 1
}

Write-Host "Loading Npgsql from: $($npgsqlPath.FullName)" -ForegroundColor Cyan
try {
    Add-Type -Path $npgsqlPath.FullName -ErrorAction Stop
}
catch {
    Write-Host "ERROR: Failed to load Npgsql assembly." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Execute migration
Write-Host "Connecting to database..." -ForegroundColor Cyan
$connection = $null
try {
    $connection = [Npgsql.NpgsqlConnection]::new($connectionString)
    $connection.Open()
    Write-Host "Connection established successfully." -ForegroundColor Green
    
    Write-Host "Executing migration..." -ForegroundColor Cyan
    $command = $connection.CreateCommand()
    $command.CommandText = $sqlContent
    $rowsAffected = $command.ExecuteNonQuery()
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Migration completed successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Rows affected: $rowsAffected" -ForegroundColor Green
    Write-Host ""
    
    $connection.Close()
    exit 0
}
catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Migration FAILED" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.InnerException) {
        Write-Host "Inner Exception: $($_.Exception.InnerException.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Stack Trace:" -ForegroundColor Yellow
    Write-Host $_.ScriptStackTrace -ForegroundColor Yellow
    
    if ($connection -and $connection.State -eq 'Open') {
        $connection.Close()
    }
    
    exit 1
}
