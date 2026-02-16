# Vehicle Service & Maintenance Tracking System

## Overview
Added comprehensive service and maintenance tracking functionality to the Mzansi Fleet system.

## Database Changes

### Vehicle Table Updates
- **Mileage** (int): Current vehicle mileage/odometer reading
- **LastServiceDate** (DateTime?): Date of last service performed
- **NextServiceDate** (DateTime?): Scheduled next service date
- **LastMaintenanceDate** (DateTime?): Date of last maintenance work
- **NextMaintenanceDate** (DateTime?): Scheduled next maintenance date
- **ServiceIntervalKm** (int): Service interval in kilometers (default: 10,000 km)

### New Tables

#### ServiceHistory
Tracks all service records for vehicles:
- **Id** (Guid): Primary key
- **VehicleId** (Guid): Foreign key to Vehicle
- **ServiceDate** (DateTime): When service was performed
- **ServiceType** (string): Type of service (Routine, Major, Minor, etc.)
- **Description** (string): Service description
- **MileageAtService** (int): Vehicle mileage at service time
- **Cost** (decimal): Service cost
- **ServiceProvider** (string): Who performed the service
- **NextServiceDate** (DateTime?): Scheduled next service
- **NextServiceMileage** (int?): Mileage for next service
- **Notes** (string): Additional notes
- **InvoiceNumber** (string): Invoice/receipt number
- **CreatedAt** (DateTime): Record creation timestamp
- **UpdatedAt** (DateTime?): Last update timestamp

#### MaintenanceHistory
Tracks all maintenance work on vehicles:
- **Id** (Guid): Primary key
- **VehicleId** (Guid): Foreign key to Vehicle
- **MaintenanceDate** (DateTime): When maintenance was performed
- **MaintenanceType** (string): Type (Repair, Replacement, Inspection, etc.)
- **Component** (string): Part/component serviced (Engine, Brakes, Tires, etc.)
- **Description** (string): Maintenance description
- **MileageAtMaintenance** (int): Vehicle mileage at maintenance time
- **Cost** (decimal): Maintenance cost
- **ServiceProvider** (string): Who performed the work
- **Priority** (string): Low, Medium, High, Critical
- **Status** (string): Completed, In Progress, Scheduled
- **ScheduledDate** (DateTime?): Scheduled date
- **CompletedDate** (DateTime?): Completion date
- **Notes** (string): Additional notes
- **InvoiceNumber** (string): Invoice number
- **PerformedBy** (string): Technician/person who performed work
- **CreatedAt** (DateTime): Record creation timestamp
- **UpdatedAt** (DateTime?): Last update timestamp

## API Endpoints

### Service History API (`/api/ServiceHistory`)

#### GET `/api/ServiceHistory`
Get all service history records
- **Returns**: `Array<ServiceHistory>`

#### GET `/api/ServiceHistory/{id}`
Get a specific service history record
- **Parameters**: `id` (Guid)
- **Returns**: `ServiceHistory`

#### GET `/api/ServiceHistory/vehicle/{vehicleId}`
Get all service history for a specific vehicle
- **Parameters**: `vehicleId` (Guid)
- **Returns**: `Array<ServiceHistory>` (ordered by date descending)

#### GET `/api/ServiceHistory/vehicle/{vehicleId}/latest`
Get the most recent service for a vehicle
- **Parameters**: `vehicleId` (Guid)
- **Returns**: `ServiceHistory`

#### POST `/api/ServiceHistory`
Create a new service history record
- **Body**: `CreateServiceHistoryCommand`
- **Returns**: `ServiceHistory`
- **Side Effect**: Updates vehicle's LastServiceDate and NextServiceDate

#### PUT `/api/ServiceHistory/{id}`
Update a service history record
- **Parameters**: `id` (Guid)
- **Body**: `UpdateServiceHistoryCommand`
- **Returns**: `ServiceHistory`

#### DELETE `/api/ServiceHistory/{id}`
Delete a service history record
- **Parameters**: `id` (Guid)
- **Returns**: 204 No Content

### Maintenance History API (`/api/MaintenanceHistory`)

#### GET `/api/MaintenanceHistory`
Get all maintenance history records
- **Returns**: `Array<MaintenanceHistory>`

#### GET `/api/MaintenanceHistory/{id}`
Get a specific maintenance history record
- **Parameters**: `id` (Guid)
- **Returns**: `MaintenanceHistory`

#### GET `/api/MaintenanceHistory/vehicle/{vehicleId}`
Get all maintenance history for a specific vehicle
- **Parameters**: `vehicleId` (Guid)
- **Returns**: `Array<MaintenanceHistory>` (ordered by date descending)

#### GET `/api/MaintenanceHistory/vehicle/{vehicleId}/latest`
Get the most recent maintenance for a vehicle
- **Parameters**: `vehicleId` (Guid)
- **Returns**: `MaintenanceHistory`

#### POST `/api/MaintenanceHistory`
Create a new maintenance history record
- **Body**: `CreateMaintenanceHistoryCommand`
- **Returns**: `MaintenanceHistory`
- **Side Effect**: If status is "Completed", updates vehicle's LastMaintenanceDate

#### PUT `/api/MaintenanceHistory/{id}`
Update a maintenance history record
- **Parameters**: `id` (Guid)
- **Body**: `UpdateMaintenanceHistoryCommand`
- **Returns**: `MaintenanceHistory`

#### DELETE `/api/MaintenanceHistory/{id}`
Delete a maintenance history record
- **Parameters**: `id` (Guid)
- **Returns**: 204 No Content

### Vehicle Alerts API (`/api/VehicleAlerts`)

#### GET `/api/VehicleAlerts/service-due`
Get vehicles that need service soon
- **Query Parameters**:
  - `daysThreshold` (int, optional): Days before service due to alert (default: 7)
  - `mileageThreshold` (int, optional): Kilometers before service due to alert (default: 500)
- **Returns**: `Array<VehicleServiceAlert>`

**VehicleServiceAlert Object**:
```json
{
  "vehicleId": "guid",
  "registration": "string",
  "make": "string",
  "model": "string",
  "currentMileage": 0,
  "lastServiceDate": "datetime",
  "nextServiceDate": "datetime",
  "daysUntilService": 0,
  "mileageUntilService": 0,
  "alertLevel": "Critical|Warning|Info",
  "alertMessage": "string"
}
```

## Alert Logic

### Critical Alerts
- Service is overdue (NextServiceDate has passed)
- Mileage has exceeded service interval

### Warning Alerts
- Service due within threshold days (default 7 days)
- Mileage within threshold km of service due (default 500 km)

### Alert Ordering
Alerts are returned ordered by:
1. Critical alerts first
2. Warning alerts second
3. Info alerts last

## Usage Examples

### Creating a Service Record
```http
POST /api/ServiceHistory
Content-Type: application/json

{
  "vehicleId": "guid",
  "serviceDate": "2026-01-03T10:00:00Z",
  "serviceType": "Routine",
  "description": "10,000 km service - oil change, filter replacement",
  "mileageAtService": 10000,
  "cost": 1500.00,
  "serviceProvider": "ABC Auto Services",
  "nextServiceDate": "2026-04-03T10:00:00Z",
  "nextServiceMileage": 20000,
  "notes": "All fluids checked and topped up",
  "invoiceNumber": "INV-2026-001"
}
```

### Creating a Maintenance Record
```http
POST /api/MaintenanceHistory
Content-Type: application/json

{
  "vehicleId": "guid",
  "maintenanceDate": "2026-01-03T14:00:00Z",
  "maintenanceType": "Repair",
  "component": "Brakes",
  "description": "Replaced front brake pads",
  "mileageAtMaintenance": 10500,
  "cost": 850.00,
  "serviceProvider": "QuickFix Auto",
  "priority": "High",
  "status": "Completed",
  "completedDate": "2026-01-03T16:00:00Z",
  "notes": "Brake fluid also flushed",
  "invoiceNumber": "MR-2026-042",
  "performedBy": "John Smith"
}
```

### Getting Service Alerts
```http
GET /api/VehicleAlerts/service-due?daysThreshold=14&mileageThreshold=1000
```

## Implementation Notes

1. **Automatic Vehicle Updates**: When creating service/maintenance records with status "Completed", the vehicle's Last*Date fields are automatically updated.

2. **Service Interval**: Each vehicle has a configurable service interval (default 10,000 km). This is used to calculate when the next service is due based on mileage.

3. **Alert Calculation**: Alerts are calculated in real-time based on:
   - Date comparison (NextServiceDate vs current date)
   - Mileage comparison (current mileage vs service interval)

4. **History Tracking**: Complete audit trail maintained with CreatedAt/UpdatedAt timestamps on all service and maintenance records.

5. **Flexibility**: Service types, maintenance types, components, and priorities are string fields allowing flexibility in categorization.

## Migration Applied

Migration: `20260103175733_AddServiceAndMaintenanceTracking`
- Added new fields to Vehicles table
- Created ServiceHistories table
- Created MaintenanceHistories table

## Next Steps for Frontend

1. Create TypeScript models for ServiceHistory and MaintenanceHistory
2. Create Angular service for API calls
3. Build vehicle service history component
4. Build maintenance history component
5. Create service alert dashboard widget
6. Add forms for creating/editing service and maintenance records
7. Implement filtering and sorting for history views
8. Add cost analytics and reporting

## Maintenance Recommendations

- Set up automated jobs to check for service due vehicles daily
- Configure email/SMS notifications for critical alerts
- Implement recurring service scheduling based on mileage tracking
- Consider adding photo upload for service invoices and maintenance work
