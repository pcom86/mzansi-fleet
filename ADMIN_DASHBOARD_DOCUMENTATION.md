# Taxi Rank Admin Dashboard Documentation

## Overview
A comprehensive admin dashboard for Taxi Rank Administrators to manage daily operations, routes, vehicles, marshals, and trip earnings.

## Features Implemented

### 1. **Main Dashboard** 
- Component: `admin-dashboard.component.ts`
- Location: `frontend/src/app/components/admin-dashboard/`
- **Features:**
  - Side navigation menu with all admin features
  - User profile display with taxi rank name
  - Logout functionality
  - Material Design UI with gradient branding

### 2. **Route Management**
- Component: `route-management.component.ts`
- Location: `frontend/src/app/components/admin-dashboard/route-management/`
- **Features:**
  - Create taxi routes with origin, destination, and stops
  - Auto-generate route codes (format: `RT-{NAME}-{TIMESTAMP}`)
  - Specify distance, estimated duration, and fare amount
  - Add multiple stops along the route
  - Edit and delete existing routes
  - View all routes in a table
  - Apply default fare to all passengers

### 3. **Owner Assignment**
- Component: `owner-assignment.component.ts`
- Location: `frontend/src/app/components/admin-dashboard/owner-assignment/`
- **Features:**
  - Assign vehicle owners to the taxi rank
  - Select from existing owners
  - View all current assignments
  - Remove owner assignments
  - Display vehicle count per owner

### 4. **Vehicle-to-Route Assignment**
- Component: `vehicle-assignment.component.ts`
- Location: `frontend/src/app/components/admin-dashboard/vehicle-assignment/`
- **Features:**
  - Assign vehicles to specific routes
  - Select from available vehicles and routes
  - View all vehicle-route assignments
  - Remove assignments
  - Display vehicle registration and route details

### 5. **Marshal Profile Management**
- Component: `marshal-management.component.ts`
- Location: `frontend/src/app/components/admin-dashboard/marshal-management/`
- **Features:**
  - Create new marshal profiles
  - Auto-generate marshal codes (format: `MAR-{INITIALS}{LASTNAME}{TIMESTAMP}`)
  - Set shift start and end times
  - Create marshal accounts with email and password
  - Edit existing marshal profiles
  - Delete marshals
  - View all marshals in a table

### 6. **Trip Schedule/Roster Management**
- Component: `trip-schedule.component.ts`
- Location: `frontend/src/app/components/admin-dashboard/trip-schedule/`
- **Features:**
  - Create daily trip schedules
  - Assign vehicle, route, driver, and marshal to each trip
  - Set scheduled date and departure time
  - Estimate arrival time
  - Track trip status (Scheduled, Completed, Cancelled)
  - Edit and delete schedules
  - View complete roster in a table

### 7. **Trip Details Capture** (⭐ Key Feature)
- Component: `trip-details.component.ts`
- Location: `frontend/src/app/components/admin-dashboard/trip-details/`
- **Features:**
  - **Passenger List Management:**
    - Add multiple passengers dynamically
    - Capture passenger name and contact number
    - Set individual fare per passenger
    - Apply default fare to all passengers with one click
    - Remove passengers
  - **Trip Information:**
    - Select vehicle, route, and driver
    - Set trip date, departure time, and arrival time
    - Add trip notes
  - **Fare Tracking:**
    - Real-time calculation of total fare
    - Display passenger count
    - Beautiful gradient summary card showing totals
  - **Vehicle Earnings Integration:**
    - Automatically records total fare as vehicle earnings when saved
    - Links earnings to specific trip
    - Updates vehicle's earnings history
  - **User Experience:**
    - Table-based passenger entry for easy data entry
    - Input validation
    - Success notifications
    - Reset form capability

## Backend Structure

### Entities
File: `backend/MzansiFleet.Domain/Entities/AdminDashboardEntities.cs`

1. **Route** - Taxi routes with stops and fare information
2. **OwnerAssignment** - Links owners to taxi ranks
3. **VehicleRouteAssignment** - Links vehicles to routes
4. **Trip** - Trip records with passenger list
5. **Passenger** - Individual passenger details within a trip
6. **VehicleEarning** - Financial tracking for each vehicle
7. **TripSchedule** - Daily trip roster scheduling

### DTOs
File: `backend/MzansiFleet.Application/DTOs/AdminDashboardDTOs.cs`

- `CreateRouteDto`, `UpdateRouteDto`
- `CreateOwnerAssignmentDto`
- `CreateVehicleRouteAssignmentDto`
- `CreateTripDto`, `PassengerDto`
- `CreateVehicleEarningDto`
- `CreateTripScheduleDto`, `UpdateTripScheduleDto`
- `CreateMarshalDto`, `UpdateMarshalDto`

### API Controllers
File: `backend/MzansiFleet.Api/Controllers/AdminDashboardControllers.cs`

1. **RoutesController** - CRUD operations for routes
2. **OwnerAssignmentsController** - Manage owner-rank assignments
3. **VehicleRouteAssignmentsController** - Manage vehicle-route assignments
4. **TripsController** - Record completed trips
5. **VehicleEarningsController** - Track vehicle earnings
6. **TripSchedulesController** - Manage trip schedules
7. **MarshalsController** - Manage marshal profiles

## Data Flow: Trip to Earnings

### 1. User Captures Trip Details
```typescript
// User fills form with:
- Vehicle selection
- Route selection
- Driver selection
- Trip date and times
- Multiple passengers with individual fares
```

### 2. Calculate Totals
```typescript
get totalFare(): number {
  return this.passengers.controls.reduce((total, passenger) => {
    return total + (parseFloat(passenger.get('fareAmount')?.value) || 0);
  }, 0);
}
```

### 3. Save Trip
```typescript
// POST to /api/Trips
const tripData = {
  vehicleId, routeId, driverId,
  tripDate, departureTime, arrivalTime,
  passengers: [{name, contactNumber, fareAmount}, ...],
  totalFare,
  passengerCount,
  status: 'Completed'
};
```

### 4. Record Vehicle Earnings
```typescript
// POST to /api/VehicleEarnings
const earningsData = {
  vehicleId: tripData.vehicleId,
  amount: this.totalFare,
  tripId: response.id,
  date: tripData.tripDate,
  description: `Trip earnings - ${this.passengerCount} passengers`
};
```

### 5. Backend Processing
```csharp
// TripsController creates trip record
var trip = new Trip { /* ... trip data ... */ };
await _repository.AddAsync(trip);

// VehicleEarningsController adds earnings
var earning = new VehicleEarning {
    VehicleId = dto.VehicleId,
    TripId = dto.TripId,
    Amount = dto.Amount,
    Date = dto.Date,
    Description = dto.Description
};
await _earningsRepository.AddAsync(earning);

// Update vehicle's total earnings
vehicle.TotalEarnings += earning.Amount;
await _vehicleRepository.UpdateAsync(vehicle);
```

## Navigation Structure

```
/admin
├── /overview (Dashboard home)
├── /routes (Route Management)
├── /owners (Owner Assignment)
├── /vehicle-assignment (Vehicle-to-Route Assignment)
├── /marshals (Marshal Management)
├── /trip-schedule (Trip Schedule/Roster)
├── /trip-details (Trip Details Capture) ⭐
└── /reports (Reports)
```

## Code Auto-Generation

All code fields use auto-generation with timestamps for uniqueness:

- **Route Code:** `RT-{NAME}-{4DIGITS}` (e.g., `RT-JHBPTA-3456`)
- **Marshal Code:** `MAR-{INITIALS}{LASTNAME}{6DIGITS}` (e.g., `MAR-JSSMITH123456`)

## Key Features Summary

✅ Complete dashboard with side navigation
✅ Route management with stops and fare
✅ Owner assignment to taxi rank
✅ Vehicle-to-route assignment
✅ Marshal profile creation and management
✅ Daily trip schedule/roster management
✅ **Trip details capture with passenger list**
✅ **Individual fare tracking per passenger**
✅ **Automatic calculation of total fare**
✅ **Vehicle earnings recording on trip save**
✅ Backend DTOs and entities
✅ API controller stubs for all features

## Next Steps

1. **Implement Backend Repositories:**
   - Create repositories for Route, Trip, VehicleEarning, etc.
   - Add to DbContext

2. **Database Migrations:**
   - Create migration for new tables
   - Run migration against PostgreSQL

3. **Complete API Controllers:**
   - Replace TODO comments with actual implementation
   - Add proper error handling
   - Implement joins for display data

4. **Add Routing Configuration:**
   - Update Angular app routing module
   - Add lazy loading for dashboard modules

5. **Add Authentication Guards:**
   - Protect admin routes with role-based auth
   - Ensure only TaxiRankAdmin can access

6. **Testing:**
   - Test all CRUD operations
   - Verify earnings calculation
   - Test passenger list management
   - Verify vehicle earnings updates correctly

## File Structure

```
frontend/src/app/components/
└── admin-dashboard/
    ├── admin-dashboard.component.ts/html/scss
    ├── route-management/
    │   └── route-management.component.ts/html/scss
    ├── owner-assignment/
    │   └── owner-assignment.component.ts/html/scss
    ├── vehicle-assignment/
    │   └── vehicle-assignment.component.ts/html/scss
    ├── marshal-management/
    │   └── marshal-management.component.ts/html/scss
    ├── trip-schedule/
    │   └── trip-schedule.component.ts/html/scss
    └── trip-details/
        └── trip-details.component.ts/html/scss ⭐

backend/
├── MzansiFleet.Domain/Entities/
│   └── AdminDashboardEntities.cs
├── MzansiFleet.Application/DTOs/
│   └── AdminDashboardDTOs.cs
└── MzansiFleet.Api/Controllers/
    └── AdminDashboardControllers.cs
```

## Dependencies Required

### Frontend
```json
{
  "@angular/material": "^18.0.0",
  "@angular/cdk": "^18.0.0",
  "@angular/common/http": "^18.0.0"
}
```

### Backend
```xml
<PackageReference Include="Microsoft.AspNetCore.Mvc" Version="2.2.0" />
<PackageReference Include="Microsoft.EntityFrameworkCore" Version="8.0.0" />
```

## Notes

- All components are standalone Angular components
- Material Design UI with consistent styling
- Auto-generated codes ensure uniqueness
- Comprehensive error handling with MatSnackBar
- Real-time fare calculation in trip details
- **Vehicle earnings automatically linked to trips**
- Backend controllers have TODO markers for implementation
- Ready for database integration

---

**Created:** January 9, 2026
**Version:** 1.0
**Status:** Frontend Complete, Backend Stubs Ready
