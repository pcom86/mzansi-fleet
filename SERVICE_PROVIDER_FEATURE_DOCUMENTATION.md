# Service Provider Management Feature

## Overview
This feature enables fleet managers to add, maintain, and manage service provider profiles for vehicle service and maintenance operations. Service providers can include mechanics, bodywork specialists, electricians, towing services, and other automotive service businesses.

## Features

### Backend Components

#### 1. Entity: ServiceProvider
Located: `backend/MzansiFleet.Domain/Entities/Profiles.cs`

Properties:
- **Business Information**: BusinessName, RegistrationNumber, TaxNumber
- **Contact Details**: ContactPerson, Phone, Email, Address
- **Service Details**: ServiceTypes, VehicleCategories, OperatingHours
- **Pricing**: HourlyRate, CallOutFee, ServiceRadiusKm
- **Banking**: BankAccount
- **Quality**: Rating, TotalReviews
- **Status**: IsActive, CreatedAt, UpdatedAt
- **Additional**: CertificationsLicenses, Notes

#### 2. DTOs
Located: `backend/MzansiFleet.Domain/DTOs/ProfileDtos.cs`

- `ServiceProviderDto`: Full provider information
- `CreateServiceProviderDto`: For creating new providers
- `UpdateServiceProviderDto`: For updating existing providers

#### 3. Repository & Interface
Located: 
- Interface: `backend/MzansiFleet.Domain/Interfaces/IRepositories/IProfileRepositories.cs`
- Implementation: `backend/MzansiFleet.Repository/Repositories/ProfileRepositories.cs`

Methods:
- `GetAll()`: Retrieve all service providers
- `GetById(Guid id)`: Get provider by ID
- `Add(ServiceProvider entity)`: Create new provider
- `Update(ServiceProvider entity)`: Update provider
- `Delete(Guid id)`: Delete provider
- `GetActiveProviders()`: Get only active providers
- `GetProvidersByServiceType(string serviceType)`: Filter by service type

#### 4. API Controller
Located: `backend/MzansiFleet.Api/Controllers/ServiceProvidersController.cs`

Endpoints:
- `GET /api/ServiceProviders` - Get all providers
- `GET /api/ServiceProviders/active` - Get active providers
- `GET /api/ServiceProviders/by-service-type/{serviceType}` - Filter by service type
- `GET /api/ServiceProviders/{id}` - Get specific provider
- `POST /api/ServiceProviders` - Create new provider
- `PUT /api/ServiceProviders/{id}` - Update provider
- `DELETE /api/ServiceProviders/{id}` - Delete provider
- `PATCH /api/ServiceProviders/{id}/toggle-status` - Toggle active status

### Frontend Components

#### 1. Service Provider Service
Located: `frontend/src/app/services/service-provider.service.ts`

Angular service that handles all HTTP communications with the backend API.

#### 2. Service Provider List Component
Located: `frontend/src/app/components/service-providers/service-provider-list.component.ts`

Features:
- Display all service providers in a table
- Filter by status (All, Active, Inactive)
- View provider ratings and reviews
- Quick actions: View, Edit, Toggle Status, Delete
- Service types displayed as chips
- Contact information at a glance

#### 3. Service Provider Form Component
Located: `frontend/src/app/components/service-providers/service-provider-form.component.ts`

Features:
- Create new service providers
- Edit existing providers
- Organized sections:
  - Business Information
  - Contact Information
  - Service Details (multi-select for service types and vehicle categories)
  - Banking & Certifications
  - Additional Information
- Form validation
- Success/error notifications

#### 4. Models
Located: `frontend/src/app/models/service-provider.model.ts`

TypeScript interfaces for type safety.

### Database

#### Migration Script
Located: `backend/Migrations/20260105_AddServiceProviders.sql`

Creates the `ServiceProviders` table with:
- All necessary columns
- Indexes for performance (IsActive, BusinessName, Rating)
- Timestamps for audit trail
- Optional sample data (commented out)

## Setup Instructions

### 1. Database Migration
Run the migration script to create the ServiceProviders table:
```powershell
# From backend directory
psql -U your_username -d mzansifleet -f Migrations/20260105_AddServiceProviders.sql
```

Or use Entity Framework if configured:
```powershell
dotnet ef migrations add AddServiceProviders
dotnet ef database update
```

### 2. Backend Configuration
The repository is already registered in the DI container in `Startup.cs`:
```csharp
services.AddScoped<IServiceProviderRepository, ServiceProviderRepository>();
```

### 3. Frontend Routes
Routes are configured in `app.routes.ts`:
- `/service-providers` - List view
- `/service-providers/new` - Create form
- `/service-providers/:id/edit` - Edit form

### 4. Build and Run
```powershell
# Backend
cd backend
dotnet build
dotnet run --project MzansiFleet.Api

# Frontend
cd frontend
npm install
ng serve
```

## Usage

### Adding a Service Provider
1. Navigate to `/service-providers`
2. Click "Add Service Provider"
3. Fill in the form:
   - Business details (name, registration)
   - Contact information
   - Select service types (can select multiple)
   - Select vehicle categories they service
   - Add pricing information (optional)
   - Banking and certification details
4. Click "Create Provider"

### Managing Providers
- **Edit**: Click the edit icon to modify provider details
- **Activate/Deactivate**: Use the toggle button to change provider status
- **Delete**: Remove providers that are no longer used
- **Filter**: Use chips to filter by status

### Integration with Maintenance Requests
Service providers can be linked to maintenance requests and service history records using the `ServiceProvider` field in the respective entities.

## Service Types Available
- Mechanical
- Electrical
- Bodywork
- Painting
- Towing
- Tire Service
- Air Conditioning
- Diagnostics
- Routine Service
- Glass Repair

## Vehicle Categories Supported
- Sedan
- SUV
- Truck
- Bus
- Van
- Motorcycle
- Heavy Equipment

## Future Enhancements
- [ ] Integration with service history - link service records to providers
- [ ] Rating and review system
- [ ] Provider availability calendar
- [ ] Automated quote requests
- [ ] Provider performance analytics
- [ ] SMS/Email notifications to providers
- [ ] Online booking integration
- [ ] Provider portal for self-service updates
- [ ] Geographic mapping and radius visualization
- [ ] Comparison tools for quotes from multiple providers

## API Examples

### Create a Service Provider
```json
POST /api/ServiceProviders
{
  "businessName": "Ace Auto Repairs",
  "registrationNumber": "REG123456",
  "contactPerson": "John Smith",
  "phone": "+27 11 123 4567",
  "email": "contact@aceauto.co.za",
  "address": "123 Main Street, Johannesburg, 2001",
  "serviceTypes": "Mechanical, Electrical, Routine Service",
  "vehicleCategories": "Sedan, SUV, Van",
  "operatingHours": "Mon-Fri: 8AM-5PM",
  "hourlyRate": 350.00,
  "callOutFee": 500.00,
  "serviceRadiusKm": 50,
  "bankAccount": "FNB, Acc: 62123456789, Branch: 250655",
  "taxNumber": "9876543210",
  "certificationsLicenses": "Certified Mechanic, AA Licensed",
  "notes": "Specializes in German vehicles"
}
```

### Get All Active Providers
```
GET /api/ServiceProviders/active
```

### Filter by Service Type
```
GET /api/ServiceProviders/by-service-type/Mechanical
```

## Troubleshooting

### Common Issues

1. **Repository not found error**
   - Ensure `IServiceProviderRepository` is registered in `Startup.cs`
   - Check that the namespace imports are correct

2. **Table doesn't exist**
   - Run the migration script to create the ServiceProviders table
   - Verify database connection string in `appsettings.json`

3. **Frontend routing issues**
   - Ensure routes are added to `app.routes.ts`
   - Verify component imports

4. **CORS errors**
   - Configure CORS in backend to allow frontend origin
   - Check API URL in `environment.ts`

## Security Considerations
- Only authenticated users should access provider management
- Consider role-based access control (fleet managers only)
- Validate all input data
- Sanitize data before storage
- Protect sensitive information (bank details, tax numbers)

## Testing
- Test CRUD operations via Postman/API client
- Verify form validation in frontend
- Test filtering and search functionality
- Ensure proper error handling
- Test concurrent updates

## Support
For issues or questions, contact the development team or create an issue in the project repository.
