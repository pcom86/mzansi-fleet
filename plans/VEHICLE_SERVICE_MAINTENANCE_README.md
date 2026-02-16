# Vehicle Service and Maintenance Tracking System

## Overview

This document describes the complete vehicle service and maintenance tracking system implemented for the Mzansi Fleet application. The system provides comprehensive tracking of vehicle service history, maintenance records, and automated service alerts.

## Features

### 1. Service History Tracking
- **Complete service record management** with date, type, description, cost, and provider
- **Next service planning** with date and mileage tracking
- **Invoice tracking** for record keeping
- **Cost analysis** with total service cost calculations
- **Filterable and sortable** service records

### 2. Maintenance History Tracking
- **Detailed maintenance records** with component-level tracking
- **Priority levels**: Critical, High, Medium, Low
- **Status workflow**: Scheduled → In Progress → Completed
- **Technician tracking** with "Performed By" field
- **Scheduled vs completed date** tracking
- **Component-specific maintenance** (Engine, Brakes, Tires, Transmission, etc.)

### 3. Automated Service Alerts
- **Critical alerts** for overdue services
- **Warning alerts** for upcoming services
- **Configurable thresholds** (days and mileage)
- **Dashboard widget** for at-a-glance monitoring
- **Real-time calculations** based on current date and mileage

### 4. Vehicle Service Information
Enhanced Vehicle model with:
- Current mileage tracking
- Last service date
- Next service date
- Last maintenance date
- Next maintenance date
- Service interval (default: 10,000 km)

## Architecture

### Backend Components

#### Entities
1. **Vehicle** (Enhanced)
   - Added: `mileage`, `lastServiceDate`, `nextServiceDate`, `lastMaintenanceDate`, `nextMaintenanceDate`, `serviceIntervalKm`

2. **ServiceHistory**
   - Full service record tracking
   - 19 properties including cost, provider, next service planning

3. **MaintenanceHistory**
   - Comprehensive maintenance tracking
   - 23 properties including priority, status, component details

#### Repositories
- `IServiceHistoryRepository` / `ServiceHistoryRepository`
- `IMaintenanceHistoryRepository` / `MaintenanceHistoryRepository`
- Updated `IVehicleRepository` with async methods

#### CQRS Implementation

**Commands** (6 total):
- `CreateServiceHistoryCommand` - Auto-updates vehicle's last/next service dates
- `UpdateServiceHistoryCommand`
- `DeleteServiceHistoryCommand`
- `CreateMaintenanceHistoryCommand` - Auto-updates vehicle's last maintenance date
- `UpdateMaintenanceHistoryCommand`
- `DeleteMaintenanceHistoryCommand`

**Queries** (9 total):
- `GetServiceHistoryByIdQuery`
- `GetAllServiceHistoriesQuery`
- `GetServiceHistoryByVehicleIdQuery`
- `GetLatestServiceByVehicleIdQuery`
- `GetMaintenanceHistoryByIdQuery`
- `GetAllMaintenanceHistoriesQuery`
- `GetMaintenanceHistoryByVehicleIdQuery`
- `GetLatestMaintenanceByVehicleIdQuery`
- `GetVehiclesNeedingServiceQuery`

**Handlers** (17 total):
- Command handlers with automatic vehicle field updates
- Query handlers with proper sorting and filtering
- Alert calculation handler with configurable thresholds

#### API Controllers (3 new controllers, 23 endpoints)

**ServiceHistoryController** (7 endpoints):
- `GET /api/ServiceHistory` - Get all service records
- `GET /api/ServiceHistory/{id}` - Get single service record
- `GET /api/ServiceHistory/vehicle/{vehicleId}` - Get all for vehicle
- `GET /api/ServiceHistory/vehicle/{vehicleId}/latest` - Get most recent
- `POST /api/ServiceHistory` - Create service record
- `PUT /api/ServiceHistory/{id}` - Update service record
- `DELETE /api/ServiceHistory/{id}` - Delete service record

**MaintenanceHistoryController** (7 endpoints):
- Identical structure to ServiceHistoryController for maintenance records

**VehicleAlertsController** (1 endpoint):
- `GET /api/VehicleAlerts/service-due?daysThreshold=7&mileageThreshold=500`
- Returns alerts sorted by severity (Critical → Warning → Info)

### Frontend Components

#### TypeScript Models
1. **Vehicle** (Enhanced)
   ```typescript
   interface Vehicle {
     // ... existing fields
     mileage: number;
     lastServiceDate?: string;
     nextServiceDate?: string;
     lastMaintenanceDate?: string;
     nextMaintenanceDate?: string;
     serviceIntervalKm: number;
   }
   ```

2. **ServiceHistory**
   ```typescript
   interface ServiceHistory {
     id?: string;
     vehicleId: string;
     serviceDate: string;
     serviceType: string;
     description: string;
     mileageAtService?: number;
     cost?: number;
     serviceProvider?: string;
     nextServiceDate?: string;
     nextServiceMileage?: number;
     notes?: string;
     invoiceNumber?: string;
     createdAt?: string;
     updatedAt?: string;
   }
   ```

3. **MaintenanceHistory**
   ```typescript
   interface MaintenanceHistory {
     id?: string;
     vehicleId: string;
     maintenanceDate: string;
     maintenanceType: string;
     component?: string;
     description: string;
     priority?: 'Low' | 'Medium' | 'High' | 'Critical';
     status?: 'Scheduled' | 'In Progress' | 'Completed';
     mileageAtMaintenance?: number;
     cost?: number;
     maintenanceProvider?: string;
     performedBy?: string;
     scheduledDate?: string;
     completedDate?: string;
     notes?: string;
     invoiceNumber?: string;
     createdAt?: string;
     updatedAt?: string;
   }
   ```

4. **VehicleServiceAlert**
   ```typescript
   interface VehicleServiceAlert {
     vehicleId: string;
     registration: string;
     make: string;
     model: string;
     currentMileage: number;
     lastServiceDate?: string;
     nextServiceDate?: string;
     daysUntilService: number;
     mileageUntilService: number;
     alertLevel: 'Critical' | 'Warning' | 'Info';
     alertMessage: string;
   }
   ```

#### Angular Services

**VehicleMaintenanceService** (14 methods):

Service History Methods:
- `getAllServiceHistory(): Observable<ServiceHistory[]>`
- `getServiceHistoryById(id: string): Observable<ServiceHistory>`
- `getServiceHistoryByVehicleId(vehicleId: string): Observable<ServiceHistory[]>`
- `getLatestServiceByVehicleId(vehicleId: string): Observable<ServiceHistory>`
- `createServiceHistory(command: CreateServiceHistoryCommand): Observable<ServiceHistory>`
- `updateServiceHistory(id: string, command: UpdateServiceHistoryCommand): Observable<ServiceHistory>`
- `deleteServiceHistory(id: string): Observable<void>`

Maintenance History Methods:
- `getAllMaintenanceHistory(): Observable<MaintenanceHistory[]>`
- `getMaintenanceHistoryById(id: string): Observable<MaintenanceHistory>`
- `getMaintenanceHistoryByVehicleId(vehicleId: string): Observable<MaintenanceHistory[]>`
- `getLatestMaintenanceByVehicleId(vehicleId: string): Observable<MaintenanceHistory>`
- `createMaintenanceHistory(command: CreateMaintenanceHistoryCommand): Observable<MaintenanceHistory>`
- `updateMaintenanceHistory(id: string, command: UpdateMaintenanceHistoryCommand): Observable<MaintenanceHistory>`
- `deleteMaintenanceHistory(id: string): Observable<void>`

Alert Methods:
- `getVehicleServiceAlerts(daysThreshold?: number, mileageThreshold?: number): Observable<VehicleServiceAlert[]>`

#### UI Components

1. **ServiceAlertsComponent** (`app-service-alerts`)
   - Location: `frontend/src/app/components/shared/service-alerts/`
   - Purpose: Dashboard widget showing service alerts
   - Features:
     - Color-coded alerts (red for Critical, yellow for Warning)
     - Clickable vehicle cards to navigate to details
     - Alert count badge
     - Empty state when no alerts
   - Usage: Integrated in Dashboard sidebar

2. **VehicleServiceHistoryComponent** (`app-vehicle-service-history`)
   - Location: `frontend/src/app/components/vehicles/vehicle-service-history/`
   - Purpose: Display and manage service history for a vehicle
   - Features:
     - Table view with sorting by date
     - Search and filter by service type
     - View, edit, delete actions
     - Total cost calculation
     - Modal for detailed view
   - Input: `@Input() vehicleId: string`
   - Usage: Integrated in VehicleDetailsComponent

3. **VehicleMaintenanceHistoryComponent** (`app-vehicle-maintenance-history`)
   - Location: `frontend/src/app/components/vehicles/vehicle-maintenance-history/`
   - Purpose: Display and manage maintenance history for a vehicle
   - Features:
     - Table view with sorting
     - Filter by status and priority
     - Color-coded priority and status badges
     - View, edit, delete actions
     - Total cost calculation
   - Input: `@Input() vehicleId: string`
   - Usage: Integrated in VehicleDetailsComponent

4. **VehicleDetailsComponent** (`app-vehicle-details`)
   - Location: `frontend/src/app/components/vehicles/vehicle-details/`
   - Purpose: Comprehensive vehicle details with service/maintenance tabs
   - Features:
     - Vehicle overview with photo
     - Service alert banner (Critical/Warning)
     - Detailed vehicle information
     - Tabbed interface:
       - Service History tab
       - Maintenance History tab
       - Documents tab (placeholder)
     - Status badge
     - Back navigation
   - Route: `/vehicles/:id`

5. **DashboardComponent** (Updated)
   - Location: `frontend/src/app/components/dashboard/`
   - Changes: Added ServiceAlertsComponent in sidebar
   - Layout: Two-column grid (main content + alerts sidebar)

## Database Schema

### Vehicles Table (Enhanced)
```sql
ALTER TABLE Vehicles
ADD mileage integer NULL,
    lastServiceDate timestamp without time zone NULL,
    nextServiceDate timestamp without time zone NULL,
    lastMaintenanceDate timestamp without time zone NULL,
    nextMaintenanceDate timestamp without time zone NULL,
    serviceIntervalKm integer NOT NULL DEFAULT 10000;
```

### ServiceHistories Table (New)
```sql
CREATE TABLE ServiceHistories (
    id uuid NOT NULL PRIMARY KEY,
    vehicleId uuid NOT NULL REFERENCES Vehicles(id),
    serviceDate timestamp without time zone NOT NULL,
    serviceType text NOT NULL,
    description text NOT NULL,
    mileageAtService integer NULL,
    cost numeric(18,2) NULL,
    serviceProvider text NULL,
    nextServiceDate timestamp without time zone NULL,
    nextServiceMileage integer NULL,
    notes text NULL,
    invoiceNumber text NULL,
    createdAt timestamp without time zone NOT NULL,
    updatedAt timestamp without time zone NOT NULL
);
```

### MaintenanceHistories Table (New)
```sql
CREATE TABLE MaintenanceHistories (
    id uuid NOT NULL PRIMARY KEY,
    vehicleId uuid NOT NULL REFERENCES Vehicles(id),
    maintenanceDate timestamp without time zone NOT NULL,
    maintenanceType text NOT NULL,
    component text NULL,
    description text NOT NULL,
    priority text NULL,
    status text NULL,
    mileageAtMaintenance integer NULL,
    cost numeric(18,2) NULL,
    maintenanceProvider text NULL,
    performedBy text NULL,
    scheduledDate timestamp without time zone NULL,
    completedDate timestamp without time zone NULL,
    notes text NULL,
    invoiceNumber text NULL,
    createdAt timestamp without time zone NOT NULL,
    updatedAt timestamp without time zone NOT NULL
);
```

## Alert Logic

### Critical Alerts
Triggered when:
- Next service date has passed (`daysUntilService <= 0`)
- OR mileage has exceeded service interval (`mileageUntilService <= 0`)

Example messages:
- "Service is overdue by 15 days!"
- "Service is overdue by 1,200 km!"

### Warning Alerts
Triggered when:
- Service due within threshold days (default: 7 days)
- OR within threshold mileage (default: 500 km)

Example messages:
- "Service due in 5 days"
- "Service due in 300 km"

### Configurable Thresholds
```typescript
// Default values
daysThreshold: 7
mileageThreshold: 500

// Custom values via API
GET /api/VehicleAlerts/service-due?daysThreshold=14&mileageThreshold=1000
```

## Automatic Updates

### Service Record Creation
When a service record is created:
1. Vehicle's `lastServiceDate` is updated to the service date
2. Vehicle's `nextServiceDate` is updated to the planned next service date
3. Vehicle's `mileage` is updated to the service mileage

### Maintenance Record Creation
When a maintenance record is created:
1. Vehicle's `lastMaintenanceDate` is updated to the maintenance date
2. If status is "Completed", `nextMaintenanceDate` may be calculated

## Usage Examples

### Creating a Service Record
```typescript
const command: CreateServiceHistoryCommand = {
  vehicleId: 'vehicle-guid',
  serviceDate: '2024-01-03',
  serviceType: 'Routine',
  description: 'Oil change and filter replacement',
  mileageAtService: 25000,
  cost: 850.00,
  serviceProvider: 'QuickLube Auto',
  nextServiceDate: '2024-07-03',
  nextServiceMileage: 35000,
  invoiceNumber: 'INV-2024-001'
};

this.maintenanceService.createServiceHistory(command).subscribe({
  next: (serviceRecord) => {
    console.log('Service record created:', serviceRecord);
    // Vehicle fields automatically updated
  },
  error: (err) => console.error('Failed:', err)
});
```

### Creating a Maintenance Record
```typescript
const command: CreateMaintenanceHistoryCommand = {
  vehicleId: 'vehicle-guid',
  maintenanceDate: '2024-01-05',
  maintenanceType: 'Preventive',
  component: 'Brakes',
  description: 'Brake pad replacement - front',
  priority: 'High',
  status: 'Completed',
  mileageAtMaintenance: 25500,
  cost: 1200.00,
  maintenanceProvider: 'Brake Masters',
  performedBy: 'John Smith',
  completedDate: '2024-01-05',
  invoiceNumber: 'BM-2024-015'
};

this.maintenanceService.createMaintenanceHistory(command).subscribe({
  next: (maintenanceRecord) => {
    console.log('Maintenance record created:', maintenanceRecord);
  },
  error: (err) => console.error('Failed:', err)
});
```

### Getting Service Alerts
```typescript
// Default thresholds (7 days, 500 km)
this.maintenanceService.getVehicleServiceAlerts().subscribe({
  next: (alerts) => {
    const criticalAlerts = alerts.filter(a => a.alertLevel === 'Critical');
    const warningAlerts = alerts.filter(a => a.alertLevel === 'Warning');
    console.log(`${criticalAlerts.length} critical, ${warningAlerts.length} warnings`);
  }
});

// Custom thresholds (14 days, 1000 km)
this.maintenanceService.getVehicleServiceAlerts(14, 1000).subscribe({
  next: (alerts) => {
    // More lenient thresholds
  }
});
```

## Routing Configuration

Add to your `app.routes.ts`:
```typescript
{
  path: 'vehicles/:id',
  component: VehicleDetailsComponent
}
```

## Styling

The components use a consistent design system:
- **Primary Colors**: Black (#000000) and Gold (#FFD700)
- **Status Colors**:
  - Available: Green (#10b981)
  - In Use: Blue (#1e40af)
  - Maintenance: Yellow (#f59e0b)
  - Out of Service: Red (#ef4444)
- **Alert Colors**:
  - Critical: Red (#ef4444)
  - Warning: Orange (#f59e0b)
  - Info: Blue (#3b82f6)
- **Priority Colors**:
  - Critical: Red
  - High: Orange
  - Medium: Yellow
  - Low: Green

## Testing Checklist

### Backend
- [x] Migration applied successfully
- [x] All repositories implement interfaces correctly
- [x] Command handlers update vehicle fields
- [x] Query handlers return sorted results
- [x] Alert calculation logic works correctly
- [x] API endpoints return expected responses
- [x] Build succeeds without errors

### Frontend
- [ ] Components render without errors
- [ ] Service alerts display correctly
- [ ] Service history loads and displays
- [ ] Maintenance history loads and displays
- [ ] Vehicle details page shows all information
- [ ] Tabs switch correctly
- [ ] Filters and search work
- [ ] Sort functionality works
- [ ] Delete confirmations appear
- [ ] Modals open and close properly
- [ ] Responsive design on mobile
- [ ] Navigation works correctly

### Integration
- [ ] Service record creation updates vehicle
- [ ] Alerts reflect current data
- [ ] Dashboard widget shows real-time alerts
- [ ] Clicking alerts navigates to vehicle details
- [ ] Cost totals calculate correctly
- [ ] Dates format consistently
- [ ] API errors display user-friendly messages

## Future Enhancements

### Planned Features
1. **Service Record Forms**
   - Add/edit service records via modal forms
   - Form validation
   - Image upload for invoices

2. **Maintenance Record Forms**
   - Add/edit maintenance records
   - Status workflow transitions
   - Recurring maintenance scheduling

3. **Email Notifications**
   - Automated reminders for upcoming services
   - Critical alert emails
   - Weekly service summary

4. **Analytics Dashboard**
   - Cost analysis charts
   - Service frequency graphs
   - Maintenance trends
   - Fleet-wide statistics

5. **Document Management**
   - Upload and store invoices
   - Maintenance manuals
   - Warranty documents
   - Photo gallery

6. **Reporting**
   - Export service history to PDF/CSV
   - Generate maintenance reports
   - Cost analysis reports
   - Compliance reports

7. **Mobile App Integration**
   - Push notifications for alerts
   - Mobile-optimized forms
   - Photo capture for invoices
   - Barcode scanning for parts

## Troubleshooting

### Common Issues

**Issue**: Alerts not displaying
- **Solution**: Check that vehicles have `nextServiceDate` or `serviceIntervalKm` set
- **Solution**: Verify API endpoint is returning data

**Issue**: Service history not loading
- **Solution**: Check that `vehicleId` is passed correctly to component
- **Solution**: Verify API endpoint is accessible

**Issue**: Total costs showing 0.00
- **Solution**: Ensure cost values are provided when creating records
- **Solution**: Check that cost fields are numeric, not strings

**Issue**: Dates not formatting correctly
- **Solution**: Verify date strings are in ISO 8601 format (YYYY-MM-DD)
- **Solution**: Check timezone settings in frontend

## Support

For questions or issues:
- Check API documentation: `SERVICE_MAINTENANCE_DOCUMENTATION.md`
- Review component usage in this README
- Check browser console for errors
- Verify backend API is running and accessible

## Version History

- **v1.0.0** (2024-01-03): Initial release
  - Service history tracking
  - Maintenance history tracking
  - Automated service alerts
  - Dashboard widget
  - Vehicle details page with tabs
  - Complete backend API
  - Frontend components and services
