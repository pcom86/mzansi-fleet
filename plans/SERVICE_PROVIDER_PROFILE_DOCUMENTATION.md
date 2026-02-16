# Service Provider Profile Feature Documentation

## Overview
The Service Provider Profile system allows service providers (mechanics, repair shops, etc.) to create accounts, login to the system, and receive maintenance job requests from fleet owners.

## Components Created

### Backend

#### 1. Entities (MzansiFleet.Domain/Entities/Profiles.cs)
- **ServiceProviderProfile**: User-linked entity for authenticated service providers
  - Links to User entity via UserId for authentication
  - Contains business information (name, contact, services, etc.)
  - `IsAvailable` flag for job assignment management
  - `IsActive` flag for account status

#### 2. DTOs (MzansiFleet.Domain/DTOs/ProfileDtos.cs)
- **ServiceProviderProfileDto**: Full profile data transfer object
- **CreateServiceProviderProfileDto**: DTO for profile creation

#### 3. Repository (MzansiFleet.Domain/Interfaces/IRepositories/IProfileRepositories.cs)
- **IServiceProviderProfileRepository**: Interface with methods:
  - `GetById(Guid id)`
  - `GetAll()`
  - `GetByUserId(Guid userId)` - Get profile by user ID
  - `GetAvailableProviders()` - Get providers available for jobs
  - `Create(ServiceProviderProfile profile)`
  - `Update(ServiceProviderProfile profile)`
  - `Delete(Guid id)`
  - `ToggleAvailability(Guid id)`

#### 4. Repository Implementation (MzansiFleet.Repository/Repositories/ProfileRepositories.cs)
- **ServiceProviderProfileRepository**: Implements all repository methods
  - Uses LINQ queries to filter by IsActive and IsAvailable
  - Includes User navigation property loading

#### 5. Controller (MzansiFleet.Api/Controllers/ServiceProviderProfilesController.cs)
API Endpoints:
- `GET /api/ServiceProviderProfiles` - Get all profiles
- `GET /api/ServiceProviderProfiles/{id}` - Get profile by ID
- `GET /api/ServiceProviderProfiles/user/{userId}` - Get profile by user ID
- `GET /api/ServiceProviderProfiles/available` - Get available providers for job assignment
- `POST /api/ServiceProviderProfiles` - Create new profile
- `PUT /api/ServiceProviderProfiles/{id}` - Update profile
- `PATCH /api/ServiceProviderProfiles/{id}/toggle-availability` - Toggle availability status
- `DELETE /api/ServiceProviderProfiles/{id}` - Delete profile

#### 6. Database
- **Migration**: `20260105154736_AddServiceProviderProfiles`
- **Table**: ServiceProviderProfiles
  - Primary Key: Id (Guid)
  - Foreign Key: UserId (links to Users table)
  - Business fields: BusinessName, ContactPerson, Phone, Email, etc.
  - Status fields: IsActive, IsAvailable
  - Service fields: ServiceTypes, VehicleCategories, OperatingHours
  - Financial fields: HourlyRate, CallOutFee, BankAccount, TaxNumber

### Frontend

#### 1. Profile Creation Component
**File**: `frontend/src/app/components/service-providers/create-service-provider-profile.component.ts`

**Features**:
- Multi-step registration form
- Creates User account first (with email/password)
- Then creates ServiceProviderProfile linked to that user
- Auto-login after successful registration
- Redirects to service provider dashboard

**Form Sections**:
1. Login Credentials (email, password, phone)
2. Business Information (name, registration, tax number, address)
3. Contact Information (contact person, phone, email)
4. Service Details (service types, vehicle categories, operating hours, rates)
5. Banking & Certifications (bank account, certifications, notes)

#### 2. Service Provider Dashboard
**File**: `frontend/src/app/components/service-providers/service-provider-dashboard.component.ts`

**Features**:
- Profile summary card with rating, total jobs, completed jobs
- Availability toggle (to start/stop receiving job requests)
- Pending Jobs section (jobs awaiting acceptance)
- In Progress section (actively working on)
- Recently Completed section (last 5 completed jobs)
- Job actions: View Details, Accept, Decline, Mark as Complete

**Dashboard Sections**:
- Profile Stats Display
- Availability Toggle
- Pending Jobs List
- In Progress Jobs List
- Completed Jobs List
- Logout Button

#### 3. Routes (frontend/src/app/app.routes.ts)
- `/service-provider-profile/create` - Registration page
- `/service-provider-dashboard` - Dashboard after login

#### 4. Profile Selection Update
Added "Service Provider" option to profile selection screen:
- Icon: engineering
- Route: `/service-provider-profile/create`
- Description: "Create an account to receive and manage maintenance job requests from fleet owners"

## Registration Flow

1. User clicks "Service Provider" on profile selection screen
2. Navigates to `/service-provider-profile/create`
3. Fills out multi-section form:
   - Login credentials
   - Business information
   - Contact details
   - Service offerings
   - Banking & certifications
4. System creates User account in Identity system
5. System creates ServiceProviderProfile linked to User
6. Auto-login with JWT token
7. Redirect to `/service-provider-dashboard`

## Authentication Flow

1. Service provider registers (creates User + ServiceProviderProfile)
2. System generates JWT token
3. Token stored in localStorage with role "ServiceProvider"
4. Dashboard loads profile by userId
5. Dashboard displays pending maintenance jobs
6. Service provider can toggle availability on/off

## Job Assignment Flow (Future Implementation)

1. Fleet owner creates maintenance request
2. System finds available service providers:
   - Calls `GET /api/ServiceProviderProfiles/available`
   - Filters by IsActive = true AND IsAvailable = true
3. System notifies service providers of new job
4. Service providers see job in "Pending" section
5. Service provider accepts job
6. Job moves to "In Progress"
7. Service provider completes work
8. Marks job as complete
9. Job moves to "Completed" section

## API Integration

### Registration Endpoint
```
POST /api/Identity/register
Body: {
  "email": "string",
  "password": "string",
  "phone": "string",
  "role": "ServiceProvider"
}
Response: {
  "userId": "guid"
}
```

### Create Profile Endpoint
```
POST /api/ServiceProviderProfiles
Body: CreateServiceProviderProfileDto
Response: ServiceProviderProfileDto
```

### Login Endpoint
```
POST /api/Identity/login
Body: {
  "email": "string",
  "password": "string"
}
Response: {
  "token": "string",
  "role": "string",
  "userId": "guid"
}
```

### Get Profile by User ID
```
GET /api/ServiceProviderProfiles/user/{userId}
Response: ServiceProviderProfileDto
```

### Toggle Availability
```
PATCH /api/ServiceProviderProfiles/{id}/toggle-availability
Response: 200 OK
```

## Database Schema

```sql
CREATE TABLE ServiceProviderProfiles (
    Id UUID PRIMARY KEY,
    UserId UUID NOT NULL REFERENCES Users(Id),
    BusinessName VARCHAR(255) NOT NULL,
    RegistrationNumber VARCHAR(100),
    ContactPerson VARCHAR(255) NOT NULL,
    Phone VARCHAR(50) NOT NULL,
    Email VARCHAR(255) NOT NULL,
    Address TEXT,
    ServiceTypes TEXT NOT NULL,
    VehicleCategories TEXT NOT NULL,
    OperatingHours VARCHAR(255),
    IsActive BOOLEAN NOT NULL DEFAULT true,
    IsAvailable BOOLEAN NOT NULL DEFAULT true,
    HourlyRate DECIMAL(18,2),
    CallOutFee DECIMAL(18,2),
    ServiceRadiusKm FLOAT,
    BankAccount TEXT,
    TaxNumber VARCHAR(100),
    CertificationsLicenses TEXT,
    Rating FLOAT,
    TotalReviews INT,
    Notes TEXT,
    CreatedAt TIMESTAMP NOT NULL,
    UpdatedAt TIMESTAMP
);
```

## Security Considerations

1. **Authentication**: All profile endpoints should require JWT authentication
2. **Authorization**: Service providers can only view/edit their own profile
3. **Password Security**: Passwords hashed using PasswordHash in Identity system
4. **Role-Based Access**: Only users with "ServiceProvider" role can access dashboard

## Future Enhancements

1. **Job Assignment System**:
   - Add ServiceProviderProfileId to MaintenanceHistory
   - Implement job notification system
   - Add job acceptance/decline workflow

2. **Rating System**:
   - Allow fleet owners to rate service providers
   - Update Rating and TotalReviews fields
   - Display rating on profile

3. **Geolocation**:
   - Add GPS coordinates to profile
   - Filter available providers by distance
   - Show providers on map

4. **Certification Uploads**:
   - Allow file uploads for certificates
   - Store URLs in database
   - Display certificates on profile

5. **Earnings Tracking**:
   - Track completed job revenue
   - Generate earnings reports
   - Payment history

6. **Real-time Notifications**:
   - Push notifications for new jobs
   - WebSocket connections
   - Job status updates

## Testing

### Manual Testing Steps

1. **Registration Test**:
   - Navigate to profile selection
   - Click "Service Provider"
   - Fill out all form fields
   - Submit and verify auto-login
   - Check dashboard loads correctly

2. **Dashboard Test**:
   - Verify profile stats display
   - Toggle availability on/off
   - Check API call succeeds
   - Verify UI updates

3. **API Test**:
   ```powershell
   # Get all profiles
   Invoke-RestMethod -Uri "http://localhost:5000/api/ServiceProviderProfiles" -Method Get

   # Get available providers
   Invoke-RestMethod -Uri "http://localhost:5000/api/ServiceProviderProfiles/available" -Method Get

   # Toggle availability
   Invoke-RestMethod -Uri "http://localhost:5000/api/ServiceProviderProfiles/{id}/toggle-availability" -Method Patch
   ```

## Troubleshooting

### Common Issues

1. **Build Error: CreateServiceProviderDto not found**
   - Solution: Renamed CreateServiceProvider to CreateServiceProviderDto in ProfileDtos.cs

2. **Database Migration Failed**
   - Solution: Stop running API process before migration
   - Run: `Get-Process -Name "MzansiFleet.Api" | Stop-Process -Force`

3. **Profile Not Loading in Dashboard**
   - Check localStorage has userId
   - Verify API endpoint returns profile
   - Check browser console for errors

4. **Availability Toggle Not Working**
   - Verify profile ID is correct
   - Check API endpoint responds
   - Verify IsAvailable field updates in database

## Deployment Checklist

- [ ] Run database migration in production
- [ ] Configure environment.apiUrl in frontend
- [ ] Set up JWT secret in backend
- [ ] Configure CORS for production domain
- [ ] Test registration flow end-to-end
- [ ] Test dashboard loads correctly
- [ ] Test availability toggle works
- [ ] Verify authentication persists across sessions
- [ ] Test logout clears localStorage
- [ ] Configure email verification (optional)

## Conclusion

The Service Provider Profile system is now fully implemented with:
- ✅ Backend API with full CRUD operations
- ✅ Database table created via migration
- ✅ Frontend registration component
- ✅ Frontend dashboard with availability management
- ✅ User authentication integration
- ✅ Profile selection updated

Next steps involve implementing the job assignment system to connect maintenance requests with available service providers.
