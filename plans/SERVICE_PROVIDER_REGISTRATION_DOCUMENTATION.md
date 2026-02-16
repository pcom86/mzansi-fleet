# Service Provider Registration Feature

## Overview
This feature allows new service providers to register themselves in the Mzansi Fleet system. The registration process creates both a User account and a ServiceProviderProfile in a single transaction.

## Implementation Date
January 8, 2026

## Backend Components

### 1. DTO: RegisterServiceProviderDto
**Location:** `backend/MzansiFleet.Domain/DTOs/ProfileDtos.cs`

This DTO combines user account credentials with service provider profile information.

**Properties:**
```csharp
public class RegisterServiceProviderDto
{
    // User Account Details
    public Guid TenantId { get; set; }
    public string Email { get; set; }
    public string Password { get; set; }
    public string Phone { get; set; }
    
    // Service Provider Profile Details
    public string BusinessName { get; set; }
    public string RegistrationNumber { get; set; }
    public string ContactPerson { get; set; }
    public string Address { get; set; }
    public string ServiceTypes { get; set; }
    public string VehicleCategories { get; set; }
    public string OperatingHours { get; set; }
    public decimal? HourlyRate { get; set; }
    public decimal? CallOutFee { get; set; }
    public double? ServiceRadiusKm { get; set; }
    public string BankAccount { get; set; }
    public string TaxNumber { get; set; }
    public string CertificationsLicenses { get; set; }
    public string Notes { get; set; }
}
```

### 2. Command: RegisterServiceProviderCommand
**Location:** `backend/MzansiFleet.Application/Commands/RegisterServiceProviderCommand.cs`

This command implements the MediatR `IRequest<ServiceProviderProfile>` pattern and contains the same properties as the DTO.

### 3. Handler: RegisterServiceProviderCommandHandler
**Location:** `backend/MzansiFleet.Application/Handlers/RegisterServiceProviderCommandHandler.cs`

**Responsibilities:**
- Validates that the email address is not already registered
- Hashes the password using BCrypt
- Creates a new User entity with role "ServiceProvider"
- Creates a new ServiceProviderProfile entity linked to the user
- Returns the created ServiceProviderProfile

**Dependencies:**
- `IUserRepository` - for user management
- `IServiceProviderProfileRepository` - for service provider profile management
- `BCrypt.Net.BCrypt` - for secure password hashing

**Business Logic:**
1. Checks for existing users with the same email (case-insensitive)
2. Throws `InvalidOperationException` if email already exists
3. Uses BCrypt for password hashing (aligned with existing authentication)
4. Sets default values:
   - User Role: "ServiceProvider"
   - IsActive: true (both User and ServiceProviderProfile)
   - IsAvailable: true (ServiceProviderProfile)
   - Rating: 0.0
   - TotalReviews: 0
   - CreatedAt: DateTime.UtcNow

### 4. API Endpoint
**Location:** `backend/MzansiFleet.Api/Controllers/IdentityController.cs`

**Endpoint:** `POST /api/Identity/register-service-provider`

**Request Body:** RegisterServiceProviderDto (JSON)

**Example Request:**
```json
{
  "tenantId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "email": "provider@example.com",
  "password": "SecurePassword123!",
  "phone": "+27 11 123 4567",
  "businessName": "Ace Auto Repairs",
  "registrationNumber": "REG123456",
  "contactPerson": "John Smith",
  "address": "123 Main Street, Johannesburg, 2001",
  "serviceTypes": "Mechanical, Electrical, Routine Service",
  "vehicleCategories": "Sedan, SUV, Van, Truck",
  "operatingHours": "Mon-Fri: 8AM-5PM, Sat: 9AM-1PM",
  "hourlyRate": 350.00,
  "callOutFee": 500.00,
  "serviceRadiusKm": 50.0,
  "bankAccount": "FNB: 62123456789",
  "taxNumber": "TAX987654",
  "certificationsLicenses": "ASE Master Technician, ISO 9001",
  "notes": "Specializing in fleet maintenance"
}
```

**Success Response (200 OK):**
```json
{
  "message": "Service provider registered successfully",
  "profileId": "a1b2c3d4-e5f6-7890-ab12-cd34ef567890",
  "userId": "f1e2d3c4-b5a6-7890-1234-567890abcdef",
  "businessName": "Ace Auto Repairs",
  "email": "provider@example.com"
}
```

**Error Responses:**

- **400 Bad Request** - Missing required fields
```json
{
  "error": "Email and password are required"
}
```

- **409 Conflict** - Email already exists
```json
{
  "error": "A user with email 'provider@example.com' already exists."
}
```

- **500 Internal Server Error** - Unexpected error
```json
{
  "error": "An error occurred during registration",
  "details": "Error message"
}
```

**Validation:**
- Email and Password must not be empty
- BusinessName is required
- TenantId must be a valid GUID

## Dependency Injection Configuration

**Location:** `backend/MzansiFleet.Api/Program.cs`

The following services have been registered:
```csharp
// Repository
builder.Services.AddScoped<IServiceProviderProfileRepository, ServiceProviderProfileRepository>();

// Handler
builder.Services.AddScoped<RegisterServiceProviderCommandHandler>();
```

## Security Features

1. **Password Hashing:** Uses BCrypt with automatic salt generation
2. **Email Uniqueness:** Validates that email addresses are unique (case-insensitive)
3. **Role Assignment:** Automatically assigns "ServiceProvider" role
4. **Initial Status:** All new providers start with IsActive=true, IsAvailable=true

## Database Schema

The registration creates entries in two tables:

**Users Table:**
- Id (UUID)
- TenantId (UUID)
- Email (string)
- Phone (string)
- PasswordHash (string) - BCrypt hashed
- Role (string) - Set to "ServiceProvider"
- IsActive (boolean) - Set to true

**ServiceProviderProfiles Table:**
- Id (UUID)
- UserId (UUID) - Foreign key to Users
- BusinessName, ContactPerson, Phone, Email, Address
- ServiceTypes, VehicleCategories, OperatingHours
- HourlyRate, CallOutFee, ServiceRadiusKm
- BankAccount, TaxNumber, CertificationsLicenses
- Rating (0.0), TotalReviews (0)
- IsActive (true), IsAvailable (true)
- Notes, CreatedAt

## Testing the Feature

### Using curl:
```bash
curl -X POST "http://localhost:5000/api/Identity/register-service-provider" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "email": "newprovider@example.com",
    "password": "SecurePass123!",
    "phone": "+27 11 123 4567",
    "businessName": "Test Auto Shop",
    "contactPerson": "John Doe",
    "serviceTypes": "Mechanical, Electrical",
    "vehicleCategories": "Sedan, SUV"
  }'
```

### Using PowerShell:
```powershell
$body = @{
    tenantId = "3fa85f64-5717-4562-b3fc-2c963f66afa6"
    email = "newprovider@example.com"
    password = "SecurePass123!"
    phone = "+27 11 123 4567"
    businessName = "Test Auto Shop"
    contactPerson = "John Doe"
    serviceTypes = "Mechanical, Electrical"
    vehicleCategories = "Sedan, SUV"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/Identity/register-service-provider" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"
```

## Frontend Integration

After registering, the service provider can log in using the `/api/Identity/login` endpoint with their email and password. The login will return a JWT token that should be used for subsequent authenticated requests.

## Future Enhancements

1. **Email Verification:** Add email verification step before activation
2. **Document Upload:** Allow providers to upload certifications and licenses during registration
3. **Admin Approval:** Require admin approval before setting IsActive to true
4. **Two-Factor Authentication:** Add 2FA option for service provider accounts
5. **Business Verification:** Integrate with business registration databases to verify registration numbers
6. **Profile Completion Wizard:** Multi-step registration form with progress tracking

## Related Features

- Login: `POST /api/Identity/login`
- Service Provider Profile Management: See `SERVICE_PROVIDER_PROFILE_DOCUMENTATION.md`
- Password Change: `POST /api/Identity/users/{id}/password`

## Notes

- The registration endpoint is publicly accessible (no authentication required)
- Service providers can start with minimal information and complete their profile later
- The TenantId must be obtained from the tenant registration process first
- All service providers are automatically marked as active upon registration
