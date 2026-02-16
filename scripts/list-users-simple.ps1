# Simple User List Script - Uses the backend API instead of direct database access
# This script queries the Identity API to list all users and their roles
# Can be run from anywhere in the project

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Mzansi Fleet - User & Role Report" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# API URLs to try
$apiUrls = @(
    "http://localhost:5000/api/Identity",
    "https://localhost:5001/api/Identity"
)

$apiUrl = $null

Write-Host "Checking if backend API is running..." -ForegroundColor Yellow

# Try each URL until one works
foreach ($url in $apiUrls) {
    try {
        Write-Host "  Trying $url..." -ForegroundColor Gray
        $testResponse = Invoke-RestMethod -Uri "$url/users" -Method GET -TimeoutSec 3 -ErrorAction Stop
        $apiUrl = $url
        Write-Host "  Connected to API successfully!" -ForegroundColor Green
        break
    }
    catch {
        Write-Host "  Not available" -ForegroundColor DarkGray
    }
}

if (-not $apiUrl) {
    Write-Host ""
    Write-Host "ERROR: Cannot connect to backend API" -ForegroundColor Red
    Write-Host ""
    Write-Host "Tried the following URLs:" -ForegroundColor Yellow
    foreach ($url in $apiUrls) {
        Write-Host "  - $url" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "Please make sure the backend server is running:" -ForegroundColor Yellow
    Write-Host "  1. Open a terminal" -ForegroundColor White
    Write-Host "  2. cd backend\MzansiFleet.Api" -ForegroundColor White
    Write-Host "  3. dotnet run" -ForegroundColor White
    Write-Host ""
    Write-Host "Or use the start-dev.ps1 script from the project root" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

try {
    # Fetch all users
    Write-Host "Fetching users from API..." -ForegroundColor Yellow
    $users = Invoke-RestMethod -Uri "$apiUrl/users" -Method GET
    
    # Fetch all tenants for reference
    $tenants = Invoke-RestMethod -Uri "$apiUrl/tenants" -Method GET
    
    # Create a hashtable for tenant lookup
    $tenantLookup = @{}
    foreach ($tenant in $tenants) {
        $tenantLookup[$tenant.id] = $tenant
    }
    
    Write-Host ""
    Write-Host "USERS AND ROLES:" -ForegroundColor Green
    Write-Host ("=" * 120) -ForegroundColor Gray
    Write-Host ""
    
    # Group users by role
    $usersByRole = $users | Group-Object -Property role | Sort-Object Name
    $roleStats = @{}
    
    foreach ($roleGroup in $usersByRole) {
        $role = $roleGroup.Name
        $roleUsers = $roleGroup.Group | Sort-Object createdAt -Descending
        
        $roleStats[$role] = $roleUsers.Count
        
        Write-Host "[$role]" -ForegroundColor Yellow
        Write-Host ("-" * 120) -ForegroundColor Gray
        
        foreach ($user in $roleUsers) {
            Write-Host "  Email:      " -NoNewline -ForegroundColor Cyan
            Write-Host $user.email -ForegroundColor White
            
            if ($user.phone) {
                Write-Host "  Phone:      " -NoNewline -ForegroundColor Cyan
                Write-Host $user.phone -ForegroundColor White
            }
            
            Write-Host "  Status:     " -NoNewline -ForegroundColor Cyan
            if ($user.isActive) {
                Write-Host "Active" -ForegroundColor Green
            } else {
                Write-Host "Inactive" -ForegroundColor Red
            }
            
            if ($user.tenantId -and $tenantLookup.ContainsKey($user.tenantId)) {
                $tenant = $tenantLookup[$user.tenantId]
                Write-Host "  Tenant:     " -NoNewline -ForegroundColor Cyan
                Write-Host "$($tenant.name) ($($tenant.code))" -ForegroundColor White
            }
            
            Write-Host "  User ID:    " -NoNewline -ForegroundColor Cyan
            Write-Host $user.id -ForegroundColor Gray
            
            Write-Host ""
        }
    }
    
    # Display summary
    Write-Host ""
    Write-Host ("=" * 120) -ForegroundColor Gray
    Write-Host "SUMMARY" -ForegroundColor Green
    Write-Host ("=" * 120) -ForegroundColor Gray
    Write-Host ""
    Write-Host "Total Users: " -NoNewline -ForegroundColor Cyan
    Write-Host $users.Count -ForegroundColor White
    Write-Host ""
    Write-Host "Users by Role:" -ForegroundColor Cyan
    
    foreach ($role in $roleStats.Keys | Sort-Object) {
        $count = $roleStats[$role]
        $paddedRole = $role.PadRight(25)
        Write-Host "  $paddedRole" -NoNewline -ForegroundColor Yellow
        Write-Host ": " -NoNewline
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
    Write-Host "TIP: To see profile details for each user, start the backend server and frontend." -ForegroundColor Gray
    Write-Host "     Then navigate to the Identity Management section in the web interface." -ForegroundColor Gray
    Write-Host ""
}
catch {
    Write-Host ""
    Write-Host "ERROR: Failed to fetch data from API" -ForegroundColor Red
    Write-Host "Error details: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "HTTP Status Code: $statusCode" -ForegroundColor Yellow
    }
    
    exit 1
}
