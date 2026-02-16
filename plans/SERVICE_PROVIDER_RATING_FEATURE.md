# Service Provider Rating Feature

## Overview
Added the ability to rate service providers (1-5 stars) when completing maintenance requests. This feature allows drivers and owners to provide feedback on the quality of service received from service providers.

## Implementation Date
January 9, 2026

## Changes Made

### Backend Changes

#### 1. Domain Entities

**File: `MzansiFleet.Domain\Entities\Marketplace.cs`**
- Added `ServiceProviderRating` property (nullable int) to `MechanicalRequest` entity
- Rating range: 1-5 stars (nullable to support optional rating)

**File: `MzansiFleet.Domain\Entities\MaintenanceHistory.cs`**
- Added `ServiceProviderRating` property (nullable int) to `MaintenanceHistory` entity
- Ensures rating is preserved in maintenance history records

#### 2. API Controller

**File: `MzansiFleet.Api\Controllers\MechanicalRequestsController.cs`**

**CompleteServiceDto:**
```csharp
public class CompleteServiceDto
{
    public DateTime? CompletedDate { get; set; }
    public string CompletionNotes { get; set; }
    public int? MileageAtService { get; set; }
    public decimal? ServiceCost { get; set; }
    public string InvoiceNumber { get; set; }
    public int? ServiceProviderRating { get; set; } // 1-5 stars rating
}
```

**Complete Action Updates:**
- Modified `PUT /api/MechanicalRequests/{id}/complete` endpoint
- Saves `ServiceProviderRating` to `MechanicalRequest` entity
- Includes rating in `MaintenanceHistory` record creation
- **Creates `VehicleExpense` record for all completions** (even if cost is $0)
- Links expense to vehicle for financial tracking
- Updates vehicle's last service date
- Rating is optional - can be null if not provided

#### 3. Database Migration

**File: `backend\Migrations\20260109_AddServiceProviderRating.sql`**

Adds columns to both tables:
- `MechanicalRequests.ServiceProviderRating` (INTEGER NULL)
- `MaintenanceHistories.ServiceProviderRating` (INTEGER NULL)

Includes check constraints to ensure ratings are between 1 and 5 when provided.

**To Apply Migration:**
```bash
# Stop the API if running
# Then run the SQL script against your PostgreSQL database
psql -U your_user -d your_database -f backend/Migrations/20260109_AddServiceProviderRating.sql
```

### Frontend Changes

#### 1. Driver Dashboard - Complete Service Dialog

**File: `frontend\src\app\components\driver-dashboard\driver-maintenance-request.component.ts`**

**CompleteServiceDialogComponent Updates:**

Added interactive star rating UI:
- 5 clickable stars with hover effects
- Visual feedback with filled/unfilled stars
- Rating text labels: Poor, Fair, Good, Very Good, Excellent
- MatIconModule imported for star icons

**New Methods:**
```typescript
setRating(rating: number): void {
    this.data.serviceProviderRating = rating;
}

getRatingText(rating: number): string {
    const texts = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
    return texts[rating] || '';
}
```

**Styling:**
- Gold star color (#ffa000) for filled stars
- Hover effect with scale transformation
- Responsive 32px star size
- Gray unfilled stars (#ccc)

**Payload Update:**
The complete request now includes:
```typescript
{
    completedDate: result.completedDate || new Date(),
    completionNotes: result.completionNotes || 'Service completed',
    mileageAtService: result.mileageAtService || null,
    serviceCost: result.serviceCost || null,
    invoiceNumber: result.invoiceNumber || null,
    serviceProviderRating: result.serviceProviderRating || null  // NEW
}
```

#### 2. Owner Dashboard

**File: `frontend\src\app\components\owner-dashboard\owner-dashboard-enhanced.component.ts`**

**completeRequest Method Updates:**
- Added prompt for service provider rating (1-5 stars)
- Validates rating is between 1-5
- Rating is optional - can be skipped
- Includes rating in completion API call

## User Experience

### Driver Flow
1. Driver clicks "Mark as Complete" on a scheduled maintenance request
2. Dialog opens with completion details form
3. Driver can optionally rate the service provider by clicking stars (1-5)
4. Star rating provides immediate visual feedback
5. Rating text appears below stars (e.g., "Excellent" for 5 stars)
6. Driver fills other fields (date, cost, mileage, notes)
7. Clicks "Mark Complete" to save

### Owner Flow
1. Owner clicks "Complete" on a scheduled maintenance request
2. System prompts for completion details via dialogs
3. After entering cost, mileage, invoice, and notes
4. System prompts: "Rate the service provider (1-5 stars, optional):"
5. Owner enters rating (1-5) or leaves empty to skip
6. Rating is validated (must be 1-5 if provided)
7. Request is marked complete with rating saved

## Rating Scale

| Stars | Label | Description |
|-------|-------|-------------|
| ⭐ | Poor | Unsatisfactory service |
| ⭐⭐ | Fair | Below expectations |
| ⭐⭐⭐ | Good | Meets expectations |
| ⭐⭐⭐⭐ | Very Good | Exceeds expectations |
| ⭐⭐⭐⭐⭐ | Excellent | Outstanding service |

## Data Flow

```
User completes maintenance request
    ↓
Frontend captures rating (1-5 or null)
    ↓
POST to /api/MechanicalRequests/{id}/complete
    ↓
Controller saves rating to MechanicalRequest.ServiceProviderRating
    ↓
Controller creates MaintenanceHistory with rating
    ↓
Controller creates VehicleExpense record (all completions, even $0)
    ↓
Controller updates Vehicle.LastServiceDate
    ↓
Rating & expense data stored for reporting
```

## Database Schema

### MechanicalRequests Table
```sql
ServiceProviderRating INTEGER NULL
CHECK (ServiceProviderRating IS NULL OR 
       (ServiceProviderRating >= 1 AND ServiceProviderRating <= 5))
```

### MaintenanceHistories Table
```sql
ServiceProviderRating INTEGER NULL
CHECK (ServiceProviderRating IS NULL OR 
       (ServiceProviderRating >= 1 AND ServiceProviderRating <= 5))
```

## Vehicle Expense Tracking

When a maintenance request is completed, the system **automatically creates a `VehicleExpense` record** for financial tracking.

### Expense Record Details

**Created for:** All completed maintenance requests (even if cost is $0)

**VehicleExpense Fields:**
- `VehicleId`: Links to the vehicle being maintained
- `Date`: Completion date of the maintenance
- `Amount`: Service cost (defaults to $0 if not provided)
- `Category`: Always set to "Maintenance"
- `Description`: Combines maintenance category and description (e.g., "Brake Service - Replaced brake pads and rotors")
- `InvoiceNumber`: Invoice number if provided
- `Vendor`: Service provider name (defaults to "Unknown" if not set)
- `CreatedAt`: Timestamp of expense record creation

### Why Track $0 Expenses?

The system tracks all maintenance completions, even with $0 cost, because:
- **Warranty work** - Free repairs under warranty
- **Promotional services** - Free initial inspections or services
- **Internal maintenance** - Work done by in-house mechanics
- **Complete history** - Full audit trail of all maintenance activities
- **Cost analysis** - Identify which services are typically free vs paid

### Example Expense Records

**Paid Service:**
```json
{
  "vehicleId": "guid",
  "date": "2026-01-09T10:30:00Z",
  "amount": 2500.00,
  "category": "Maintenance",
  "description": "Brake Service - Replaced brake pads and rotors",
  "invoiceNumber": "INV-12345",
  "vendor": "AutoCare Plus"
}
```

**Warranty Service ($0):**
```json
{
  "vehicleId": "guid",
  "date": "2026-01-09T14:00:00Z",
  "amount": 0,
  "category": "Maintenance",
  "description": "Engine Issue - Repaired under warranty",
  "invoiceNumber": "WARR-567",
  "vendor": "Toyota Service Center"
}
```

## Future Enhancements

1. **Service Provider Dashboard**
   - Display average rating for each service provider
   - Show rating trends over time
   - List individual ratings with comments

2. **Rating Analytics**
   - Calculate average ratings per service provider
   - Generate reports on service quality
   - Filter service providers by minimum rating

3. **Rating History**
   - Display rating on maintenance history cards
   - Show stars in maintenance history table
   - Filter maintenance records by rating

4. **Service Provider Selection**
   - Sort service providers by rating when scheduling
   - Display average rating when choosing provider
   - Highlight top-rated providers

5. **Mandatory Ratings**
   - Option to make ratings required for completion
   - Enforce minimum rating thresholds
   - Automated follow-up for low ratings

## Testing Checklist

- [x] Backend builds successfully
- [x] Frontend compiles without errors
- [x] Rating field added to entities
- [x] API accepts rating in complete endpoint
- [x] Database migration script created
- [ ] Migration applied to database (manual step)
- [ ] Driver can rate service via dialog
- [ ] Owner can rate service via prompts
- [ ] Rating saves to MechanicalRequest
- [ ] Rating saves to MaintenanceHistory
- [ ] Rating validation works (1-5 range)
- [ ] Null rating accepted (optional field)
- [ ] Star UI displays correctly
- [ ] Star hover effects work
- [ ] Rating text labels display
- [ ] API returns rating in response
- [ ] VehicleExpense record created on completion
- [ ] Expense record created even with $0 cost
- [ ] Expense linked to correct vehicle
- [ ] Expense includes correct details (date, amount, vendor)
- [ ] Multiple completions create separate expense records

## API Documentation

### Complete Maintenance Request
**Endpoint:** `PUT /api/MechanicalRequests/{id}/complete`

**Request Body:**
```json
{
  "completedDate": "2026-01-09T10:30:00Z",
  "completionNotes": "Replaced brake pads and rotors",
  "mileageAtService": 85000,
  "serviceCost": 2500.00,
  "invoiceNumber": "INV-12345",
  "serviceProviderRating": 5
}
```

**Response:**
```json
{
  "id": "guid",
  "state": "Completed",
  "completedDate": "2026-01-09T10:30:00Z",
  "serviceProviderRating": 5,
  ...other fields
}
```

**Validation Rules:**
- `serviceProviderRating` is optional (can be null)
- If provided, must be integer between 1 and 5 (inclusive)
- Database constraint enforces range validation

## Rollback Instructions

If needed to rollback this feature:

1. **Remove database columns:**
```sql
ALTER TABLE "MechanicalRequests" DROP COLUMN IF EXISTS "ServiceProviderRating";
ALTER TABLE "MaintenanceHistories" DROP COLUMN IF EXISTS "ServiceProviderRating";
```

2. **Revert code changes:**
   - Remove `ServiceProviderRating` property from entities
   - Remove rating field from `CompleteServiceDto`
   - Remove rating logic from controller
   - Remove star rating UI from frontend dialog
   - Remove rating from API payloads

## Notes

- Rating is **optional** - users can complete requests without rating
- Rating is stored for historical tracking and analytics
- No impact on existing maintenance records (null ratings)
- Backward compatible - old clients can complete without rating
- Database constraints ensure data integrity

## Related Documentation

- See `SERVICE_MAINTENANCE_DOCUMENTATION.md` for overall maintenance system
- See `DRIVER_MAINTENANCE_STATUS_UPDATE.md` for driver dashboard features
- See `SERVICE_PROVIDER_FEATURE_DOCUMENTATION.md` for service provider features

## Migration Status

⚠️ **Manual Migration Required**

The SQL migration script has been created but **not yet applied** because the API is currently running. 

**To apply the migration:**
1. Stop the MzansiFleet.Api application
2. Run the SQL script: `backend\Migrations\20260109_AddServiceProviderRating.sql`
3. Restart the application
4. Test the rating feature

The application will work with the new code, but ratings will fail to save until the database migration is applied.
