# List All Users and Their Roles in Mzansi Fleet System
# This script queries the database to show all users with their roles, status, and related profile information

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Mzansi Fleet - User & Role Report" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Database connection details
$dbHost = "localhost"
$dbName = "MzansiFleetDb"
$dbUser = "postgres"
$dbPassword = "postgres"

# Set environment variable for password to avoid prompt
$env:PGPASSWORD = $dbPassword

Write-Host "Connecting to database: $dbName at $dbHost..." -ForegroundColor Yellow
Write-Host ""

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "ERROR: PostgreSQL client (psql) not found in PATH." -ForegroundColor Red
    Write-Host "Please install PostgreSQL client tools or add them to your PATH." -ForegroundColor Red
    exit 1
}

# Query to get all users with their roles and related information
$query = @"
SELECT 
    u."Id" as user_id,
    u."Email",
    u."Phone",
    u."Role",
    u."IsActive" as is_active,
    u."CreatedAt" as created_at,
    t."Name" as tenant_name,
    t."Code" as tenant_code,
    CASE 
        WHEN u."Role" = 'Owner' THEN op."ContactName"
        WHEN u."Role" = 'Driver' THEN dp."Name"
        WHEN u."Role" = 'ServiceProvider' THEN sp."BusinessName"
        WHEN u."Role" = 'TaxiRankAdmin' THEN tra."FullName"
        WHEN u."Role" = 'TaxiMarshal' THEN tmp."FullName"
        ELSE NULL
    END as full_name,
    CASE 
        WHEN u."Role" = 'Owner' THEN op."CompanyName"
        WHEN u."Role" = 'ServiceProvider' THEN sp."BusinessName"
        ELSE NULL
    END as company_name,
    CASE 
        WHEN u."Role" = 'Driver' THEN dp."LicenseNumber"
        WHEN u."Role" = 'TaxiRankAdmin' THEN tra."AdminCode"
        WHEN u."Role" = 'TaxiMarshal' THEN tmp."MarshalCode"
        WHEN u."Role" = 'ServiceProvider' THEN sp."RegistrationNumber"
        ELSE NULL
    END as additional_info
FROM "Users" u
LEFT JOIN "Tenants" t ON u."TenantId" = t."Id"
LEFT JOIN "OwnerProfiles" op ON u."Id" = op."UserId"
LEFT JOIN "DriverProfiles" dp ON u."Id" = dp."UserId"
LEFT JOIN "ServiceProviderProfiles" sp ON u."Id" = sp."UserId"
LEFT JOIN "TaxiRankAdminProfiles" tra ON u."Id" = tra."UserId"
LEFT JOIN "TaxiMarshalProfiles" tmp ON u."Id" = tmp."UserId"
ORDER BY u."Role", u."CreatedAt" DESC;
"@

# Execute query and capture results
$results = psql -h $dbHost -d $dbName -U $dbUser -t -A -F "," -c $query 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to connect to database or execute query." -ForegroundColor Red
    Write-Host $results -ForegroundColor Red
    exit 1
}

# Parse and display results
$userCount = 0
$currentRole = ""
$roleStats = @{}

Write-Host "USERS AND ROLES:" -ForegroundColor Green
Write-Host ("=" * 120) -ForegroundColor Gray
Write-Host ""

foreach ($line in $results) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    
    $fields = $line -split ','
    if ($fields.Count -lt 7) { continue }
    
    $userId = $fields[0]
    $email = $fields[1]
    $phone = $fields[2]
    $role = $fields[3]
    $isActive = $fields[4]
    $createdAt = $fields[5]
    $tenantName = if ($fields.Count -gt 6) { $fields[6] } else { "" }
    $tenantCode = if ($fields.Count -gt 7) { $fields[7] } else { "" }
    $fullName = if ($fields.Count -gt 8) { $fields[8] } else { "" }
    $companyName = if ($fields.Count -gt 9) { $fields[9] } else { "" }
    $additionalInfo = if ($fields.Count -gt 10) { $fields[10] } else { "" }
    
    $userCount++
    
    # Track role statistics
    if (-not $roleStats.ContainsKey($role)) {
        $roleStats[$role] = 0
    }
    $roleStats[$role]++
    
    # Print role header when role changes
    if ($currentRole -ne $role) {
        if ($currentRole -ne "") {
            Write-Host ""
        }
        Write-Host "[$role]" -ForegroundColor Yellow
        Write-Host ("-" * 120) -ForegroundColor Gray
        $currentRole = $role
    }
    
    # Format status
    $statusText = if ($isActive -eq "t") { "Active" } else { "Inactive" }
    $statusColor = if ($isActive -eq "t") { "Green" } else { "Red" }
    
    # Display user information
    Write-Host "  Email:      " -NoNewline -ForegroundColor Cyan
    Write-Host $email -ForegroundColor White
    
    if (![string]::IsNullOrWhiteSpace($fullName)) {
        Write-Host "  Name:       " -NoNewline -ForegroundColor Cyan
        Write-Host $fullName -ForegroundColor White
    }
    
    if (![string]::IsNullOrWhiteSpace($companyName)) {
        Write-Host "  Company:    " -NoNewline -ForegroundColor Cyan
        Write-Host $companyName -ForegroundColor White
    }
    
    if (![string]::IsNullOrWhiteSpace($phone)) {
        Write-Host "  Phone:      " -NoNewline -ForegroundColor Cyan
        Write-Host $phone -ForegroundColor White
    }
    
    Write-Host "  Status:     " -NoNewline -ForegroundColor Cyan
    Write-Host $statusText -ForegroundColor $statusColor
    
    if (![string]::IsNullOrWhiteSpace($tenantName)) {
        Write-Host "  Tenant:     " -NoNewline -ForegroundColor Cyan
        Write-Host "$tenantName ($tenantCode)" -ForegroundColor White
    }
    
    if (![string]::IsNullOrWhiteSpace($additionalInfo)) {
        $infoLabel = switch ($role) {
            "Driver" { "License:    " }
            "TaxiRankAdmin" { "Admin Code: " }
            "TaxiMarshal" { "Marshal Code:" }
            "ServiceProvider" { "Reg Number: " }
            default { "Info:       " }
        }
        Write-Host "  $infoLabel" -NoNewline -ForegroundColor Cyan
        Write-Host $additionalInfo -ForegroundColor White
    }
    
    Write-Host "  User ID:    " -NoNewline -ForegroundColor Cyan
    Write-Host $userId -ForegroundColor Gray
    Write-Host ""
}

# Display summary
Write-Host ""
Write-Host ("=" * 120) -ForegroundColor Gray
Write-Host "SUMMARY" -ForegroundColor Green
Write-Host ("=" * 120) -ForegroundColor Gray
Write-Host ""
Write-Host "Total Users: " -NoNewline -ForegroundColor Cyan
Write-Host $userCount -ForegroundColor White
Write-Host ""
Write-Host "Users by Role:" -ForegroundColor Cyan

foreach ($role in $roleStats.Keys | Sort-Object) {
    $count = $roleStats[$role]
    Write-Host "  $role" -NoNewline -ForegroundColor Yellow
    Write-Host ("`t`t`t: ") -NoNewline
    Write-Host $count -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Display available roles in the system
Write-Host "AVAILABLE ROLES IN SYSTEM:" -ForegroundColor Green
Write-Host ("=" * 120) -ForegroundColor Gray
Write-Host ""

$availableRoles = @(
    @{ Role = "Owner"; Description = "Vehicle owner who manages fleet" },
    @{ Role = "Driver"; Description = "Vehicle driver" },
    @{ Role = "Staff"; Description = "Staff member" },
    @{ Role = "Passenger"; Description = "Passenger/Customer" },
    @{ Role = "Mechanic"; Description = "Mechanic service provider" },
    @{ Role = "Shop"; Description = "Shop/Workshop service provider" },
    @{ Role = "ServiceProvider"; Description = "General service provider" },
    @{ Role = "TaxiRankAdmin"; Description = "Taxi rank administrator" },
    @{ Role = "TaxiMarshal"; Description = "Taxi marshal at rank" },
    @{ Role = "Admin"; Description = "System administrator" }
)

foreach ($roleInfo in $availableRoles) {
    $hasUsers = $roleStats.ContainsKey($roleInfo.Role)
    $userCountForRole = if ($hasUsers) { $roleStats[$roleInfo.Role] } else { 0 }
    
    Write-Host "  " -NoNewline
    Write-Host $roleInfo.Role.PadRight(20) -NoNewline -ForegroundColor Yellow
    Write-Host " - " -NoNewline
    Write-Host $roleInfo.Description.PadRight(40) -NoNewline -ForegroundColor White
    Write-Host " [Users: " -NoNewline -ForegroundColor Gray
    if ($userCountForRole -gt 0) {
        Write-Host $userCountForRole -NoNewline -ForegroundColor Green
    } else {
        Write-Host $userCountForRole -NoNewline -ForegroundColor DarkGray
    }
    Write-Host "]" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Clean up environment variable
Remove-Item env:PGPASSWORD -ErrorAction SilentlyContinue
