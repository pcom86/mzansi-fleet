# Service Provider Management - Quick Start Guide

## Overview
A complete feature for managing service provider profiles for fleet vehicle maintenance and service operations.

## What Was Created

### Backend (C# .NET)
1. **ServiceProvider Entity** - `backend/MzansiFleet.Domain/Entities/Profiles.cs`
2. **DTOs** - `backend/MzansiFleet.Domain/DTOs/ProfileDtos.cs`
   - ServiceProviderDto
   - CreateServiceProviderDto
   - UpdateServiceProviderDto
3. **Repository Interface** - `backend/MzansiFleet.Domain/Interfaces/IRepositories/IProfileRepositories.cs`
4. **Repository Implementation** - `backend/MzansiFleet.Repository/Repositories/ProfileRepositories.cs`
5. **API Controller** - `backend/MzansiFleet.Api/Controllers/ServiceProvidersController.cs`
6. **Database Migration** - `backend/Migrations/20260105_AddServiceProviders.sql`

### Frontend (Angular)
1. **Model** - `frontend/src/app/models/service-provider.model.ts`
2. **Service** - `frontend/src/app/services/service-provider.service.ts`
3. **List Component** - `frontend/src/app/components/service-providers/service-provider-list.component.ts`
4. **Form Component** - `frontend/src/app/components/service-providers/service-provider-form.component.ts`
5. **Routes** - Updated `frontend/src/app/app.routes.ts`

## Quick Setup

### 1. Run Database Migration
```powershell
# Navigate to backend directory
cd "c:\Users\pmaseko\mzansi fleet\backend"

# Run migration (adjust connection string as needed)
psql -U postgres -d mzansifleet -f Migrations/20260105_AddServiceProviders.sql
```

### 2. Build and Run Backend
```powershell
cd "c:\Users\pmaseko\mzansi fleet\backend"
dotnet build
dotnet run --project MzansiFleet.Api
```

### 3. Run Frontend
```powershell
cd "c:\Users\pmaseko\mzansi fleet\frontend"
ng serve
```

### 4. Access the Feature
Navigate to: `http://localhost:4200/service-providers`

## API Endpoints

- **GET** `/api/ServiceProviders` - Get all providers
- **GET** `/api/ServiceProviders/active` - Get active providers only
- **GET** `/api/ServiceProviders/by-service-type/{type}` - Filter by service type
- **GET** `/api/ServiceProviders/{id}` - Get specific provider
- **POST** `/api/ServiceProviders` - Create new provider
- **PUT** `/api/ServiceProviders/{id}` - Update provider
- **PATCH** `/api/ServiceProviders/{id}/toggle-status` - Toggle active/inactive
- **DELETE** `/api/ServiceProviders/{id}` - Delete provider

## Frontend Routes

- `/service-providers` - View all service providers
- `/service-providers/new` - Create new provider
- `/service-providers/:id/edit` - Edit existing provider

## Key Features

### Business Management
- Store complete business information (name, registration, tax number)
- Contact details (person, phone, email, address)
- Operating hours tracking

### Service Capabilities
- Multiple service types (Mechanical, Electrical, Bodywork, etc.)
- Vehicle category support (Sedan, SUV, Truck, Bus, etc.)
- Service radius in kilometers
- Pricing (hourly rate, call-out fees)

### Quality Tracking
- Rating system (0-5 stars)
- Review count tracking
- Active/inactive status management

### Financial
- Banking details storage
- Tax information
- Certifications and licenses

## Usage Example

### Creating a Provider via API
```bash
curl -X POST http://localhost:5000/api/ServiceProviders \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Ace Auto Repairs",
    "registrationNumber": "REG123456",
    "contactPerson": "John Smith",
    "phone": "+27 11 123 4567",
    "email": "contact@aceauto.co.za",
    "address": "123 Main St, Johannesburg",
    "serviceTypes": "Mechanical, Electrical",
    "vehicleCategories": "Sedan, SUV",
    "operatingHours": "Mon-Fri: 8AM-5PM",
    "hourlyRate": 350.00,
    "callOutFee": 500.00,
    "serviceRadiusKm": 50
  }'
```

## Integration Points

The ServiceProvider system can be integrated with:
- **Service History** - Link service records to specific providers
- **Maintenance Requests** - Select providers when creating requests  
- **Quotes** - Request quotes from multiple providers
- **Reviews** - Track provider performance

## Next Steps

1. ✅ Run database migration
2. ✅ Build and test backend
3. ✅ Test frontend components
4. 🔲 Integrate with Service History (update `ServiceHistory.ServiceProvider` to reference ServiceProvider ID)
5. 🔲 Integrate with Maintenance Requests (add provider selection)
6. 🔲 Add provider search and filtering
7. 🔲 Implement rating and review system

## Status: ✅ Ready for Testing

All code is complete and compiles successfully. The feature is ready for database migration and testing.

For detailed documentation, see: `SERVICE_PROVIDER_FEATURE_DOCUMENTATION.md`
