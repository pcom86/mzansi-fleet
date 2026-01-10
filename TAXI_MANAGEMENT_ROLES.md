# Taxi Management System - Roles & Permissions

## Overview
The Mzansi Fleet Taxi Management System includes specialized roles for managing taxi rank operations. This document outlines the **Taxi Rank Admin** and **Taxi Marshal** roles and their permissions.

---

## Roles

### 1. Taxi Rank Admin
**Role Constant**: `Roles.TaxiRankAdmin`  
**Entity**: `TaxiRankAdminProfile`

#### Description
The Taxi Rank Admin is responsible for the overall management and administration of a specific taxi rank. This role has comprehensive permissions to set up and manage all aspects of taxi rank operations.

#### Responsibilities
- **Rank Setup**: Create and manage taxi rank data (location, capacity, operating hours)
- **Marshal Management**: Register and assign taxi marshals to the rank
- **Vehicle Management**: Assign and unassign vehicles to/from the rank
- **Schedule Management**: Create and manage trip schedules for different routes
- **Reporting**: View operational reports and analytics

#### Permissions
The following permissions can be individually configured per admin:

| Permission | Property | Default | Description |
|------------|----------|---------|-------------|
| Manage Marshals | `CanManageMarshals` | `true` | Create, update, and assign marshals |
| Manage Vehicles | `CanManageVehicles` | `true` | Assign/unassign vehicles to the rank |
| Manage Schedules | `CanManageSchedules` | `true` | Create and update trip schedules |
| View Reports | `CanViewReports` | `true` | Access operational reports |

#### API Endpoints

**Registration**
```http
POST /api/TaxiRankAdmin/register
Content-Type: application/json

{
  "tenantId": "uuid",
  "taxiRankId": "uuid",
  "adminCode": "ADMIN001",
  "fullName": "John Doe",
  "email": "admin@example.com",
  "password": "SecurePass123",
  "phoneNumber": "+27123456789",
  "idNumber": "1234567890123",
  "address": "123 Admin St"
}
```

**Assign Marshal to Rank**
```http
POST /api/TaxiRankAdmin/{adminId}/assign-marshal
Content-Type: application/json

{
  "marshalId": "uuid"
}
```

**Assign Vehicle to Rank**
```http
POST /api/TaxiRankAdmin/{adminId}/assign-vehicle
Content-Type: application/json

{
  "vehicleId": "uuid",
  "notes": "Regular taxi for route A"
}
```

**Create Trip Schedule**
```http
POST /api/TaxiRankAdmin/{adminId}/create-schedule
Content-Type: application/json

{
  "routeName": "JHB to PTA",
  "departureStation": "Johannesburg Park Station",
  "destinationStation": "Pretoria Central",
  "departureTime": "08:00:00",
  "frequencyMinutes": 30,
  "daysOfWeek": "Mon,Tue,Wed,Thu,Fri",
  "standardFare": 45.00,
  "expectedDurationMinutes": 60,
  "maxPassengers": 15
}
```

**Get Admin's Vehicles**
```http
GET /api/TaxiRankAdmin/{adminId}/vehicles
```

**Get Admin's Marshals**
```http
GET /api/TaxiRankAdmin/{adminId}/marshals
```

**Get Admin's Schedules**
```http
GET /api/TaxiRankAdmin/{adminId}/schedules
```

---

### 2. Taxi Marshal
**Role Constant**: `Roles.TaxiMarshal`  
**Entity**: `TaxiMarshalProfile`

#### Description
The Taxi Marshal is an on-ground staff member responsible for capturing trip information, managing passenger boarding, and ensuring smooth taxi rank operations at their assigned rank.

#### Responsibilities
- **Trip Capture**: Record trip details (vehicle, driver, passengers, costs)
- **Passenger Management**: Manage passenger boarding and seating
- **Cost Recording**: Track trip costs (fuel, tolls, etc.)
- **Real-time Operations**: Monitor and facilitate day-to-day taxi rank activities

#### Key Properties
- `MarshalCode`: Unique identifier for the marshal
- `TaxiRankId`: The specific rank where the marshal is assigned
- `Status`: Active, Suspended, Inactive
- `ShiftStartTime` / `ShiftEndTime`: Working hours
- `ContactNumber`: For operational communication

#### API Endpoints

**Registration**
```http
POST /api/TaxiMarshals/register
Content-Type: application/json

{
  "tenantId": "uuid",
  "taxiRankId": "uuid",
  "marshalCode": "MARSHAL001",
  "fullName": "Jane Smith",
  "email": "marshal@example.com",
  "password": "SecurePass123",
  "phoneNumber": "+27987654321",
  "idNumber": "9876543210987",
  "address": "456 Marshal Ave",
  "hireDate": "2026-01-09T00:00:00Z"
}
```

**Get Marshal by Code**
```http
GET /api/TaxiMarshals/code/{marshalCode}
```

**Get Marshals by Rank**
```http
GET /api/TaxiMarshals/rank/{taxiRankId}
```

**Update Marshal Profile**
```http
PUT /api/TaxiMarshals/{id}
Content-Type: application/json

{
  "fullName": "Jane Smith Updated",
  "phoneNumber": "+27111222333",
  "status": "Active"
}
```

---

## Database Schema

### TaxiRankAdmins Table
```sql
CREATE TABLE "TaxiRankAdmins" (
    "Id" UUID PRIMARY KEY,
    "UserId" UUID NOT NULL,
    "TenantId" UUID NOT NULL,
    "TaxiRankId" UUID NOT NULL,
    "AdminCode" VARCHAR(50) NOT NULL UNIQUE,
    "FullName" VARCHAR(200) NOT NULL,
    "PhoneNumber" VARCHAR(20) NOT NULL,
    "Email" VARCHAR(100),
    "HireDate" TIMESTAMP NOT NULL,
    "Status" VARCHAR(20) NOT NULL DEFAULT 'Active',
    "IdNumber" VARCHAR(50),
    "Address" TEXT,
    "CanManageMarshals" BOOLEAN NOT NULL DEFAULT TRUE,
    "CanManageVehicles" BOOLEAN NOT NULL DEFAULT TRUE,
    "CanManageSchedules" BOOLEAN NOT NULL DEFAULT TRUE,
    "CanViewReports" BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP,
    FOREIGN KEY ("UserId") REFERENCES "Users"("Id"),
    FOREIGN KEY ("TenantId") REFERENCES "Tenants"("Id"),
    FOREIGN KEY ("TaxiRankId") REFERENCES "TaxiRanks"("Id")
);
```

### TaxiMarshalProfiles Table
```sql
CREATE TABLE "TaxiMarshalProfiles" (
    "Id" UUID PRIMARY KEY,
    "UserId" UUID NOT NULL,
    "TenantId" UUID NOT NULL,
    "TaxiRankId" UUID NOT NULL,
    "MarshalCode" VARCHAR(50) NOT NULL UNIQUE,
    "FullName" VARCHAR(200) NOT NULL,
    "PhoneNumber" VARCHAR(20) NOT NULL,
    "Email" VARCHAR(100),
    "HireDate" TIMESTAMP NOT NULL,
    "Status" VARCHAR(20) NOT NULL DEFAULT 'Active',
    "IdNumber" VARCHAR(50),
    "Address" TEXT,
    "ShiftStartTime" TIME,
    "ShiftEndTime" TIME,
    "ContactNumber" VARCHAR(20),
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP,
    FOREIGN KEY ("UserId") REFERENCES "Users"("Id"),
    FOREIGN KEY ("TenantId") REFERENCES "Tenants"("Id"),
    FOREIGN KEY ("TaxiRankId") REFERENCES "TaxiRanks"("Id")
);
```

---

## Authorization

### Using Roles in Controllers

To restrict endpoints to specific roles, use the `[Authorize]` attribute:

```csharp
using Microsoft.AspNetCore.Authorization;
using MzansiFleet.Domain.Constants;

[Authorize(Roles = Roles.TaxiRankAdmin)]
[HttpPost("admin-only-endpoint")]
public async Task<ActionResult> AdminOnlyAction()
{
    // Only Taxi Rank Admins can access this
}

[Authorize(Roles = $"{Roles.TaxiRankAdmin},{Roles.TaxiMarshal}")]
[HttpGet("rank-staff-endpoint")]
public async Task<ActionResult> RankStaffAction()
{
    // Both Admins and Marshals can access this
}
```

### Role Validation

Use the `Roles.IsValidRole()` method to validate roles:

```csharp
using MzansiFleet.Domain.Constants;

if (!Roles.IsValidRole(userRole))
{
    return BadRequest("Invalid role specified");
}
```

---

## Workflow Example

### Setting Up a New Taxi Rank

1. **Create Taxi Rank** (Owner/Admin)
   ```http
   POST /api/TaxiRanks
   ```

2. **Register Taxi Rank Admin**
   ```http
   POST /api/TaxiRankAdmin/register
   ```

3. **Admin Registers Marshals**
   ```http
   POST /api/TaxiMarshals/register
   ```

4. **Admin Assigns Vehicles to Rank**
   ```http
   POST /api/TaxiRankAdmin/{adminId}/assign-vehicle
   ```

5. **Admin Creates Trip Schedules**
   ```http
   POST /api/TaxiRankAdmin/{adminId}/create-schedule
   ```

6. **Marshal Captures Trips**
   ```http
   POST /api/TaxiRankTrips
   ```

---

## Frontend Integration

### Role-Based Navigation (Angular)

```typescript
export class NavigationComponent {
  userRole: string;

  get isTaxiRankAdmin(): boolean {
    return this.userRole === 'TaxiRankAdmin';
  }

  get isTaxiMarshal(): boolean {
    return this.userRole === 'TaxiMarshal';
  }
}
```

```html
<!-- Admin-only menu items -->
<li *ngIf="isTaxiRankAdmin">
  <a routerLink="/admin/manage-marshals">Manage Marshals</a>
</li>

<!-- Marshal-only menu items -->
<li *ngIf="isTaxiMarshal">
  <a routerLink="/marshal/capture-trip">Capture Trip</a>
</li>
```

---

## Migration Scripts

Execute these SQL scripts to create the necessary tables:

1. `20260109_AddTaxiRankEntity.sql` - Creates TaxiRanks, updates related entities
2. `20260110_AddTaxiRankAdminModule.sql` - Creates TaxiRankAdmins, VehicleTaxiRanks, TripSchedules

```bash
psql -h localhost -U postgres -d mzansifleet -f Migrations/20260109_AddTaxiRankEntity.sql
psql -h localhost -U postgres -d mzansifleet -f Migrations/20260110_AddTaxiRankAdminModule.sql
```

---

## Summary

### Taxi Rank Admin
- **Purpose**: Overall rank management and administration
- **Code**: `Roles.TaxiRankAdmin`
- **Key Features**: Configurable permissions, marshal/vehicle/schedule management
- **Access Level**: High - can configure rank operations

### Taxi Marshal
- **Purpose**: On-ground trip capture and passenger management
- **Code**: `Roles.TaxiMarshal`
- **Key Features**: Trip recording, passenger tracking, cost logging
- **Access Level**: Operational - focused on day-to-day activities

Both roles are essential for efficient taxi rank operations and are integrated throughout the system with proper authentication and authorization.
