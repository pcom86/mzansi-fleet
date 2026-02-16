# Taxi Rank Admin Dashboard - Rank Overview Feature

## Overview
Added a comprehensive Rank Overview component to the Taxi Rank Admin Dashboard that displays:
1. **Vehicles assigned to each taxi rank** for the association
2. **Trips grouped by route** for each taxi rank

## Changes Made

### Frontend Components

#### 1. Rank Overview Component
**Location:** `frontend/src/app/components/admin-dashboard/rank-overview/`

**Files Created:**
- `rank-overview.component.ts` - Main component logic
- `rank-overview.component.html` - Template with tabs for vehicles and trips
- `rank-overview.component.scss` - Styling

**Features:**
- **Rank Selector**: Dropdown to select taxi ranks within the admin's association
- **Vehicles Tab**: 
  - Table showing all vehicles assigned to the selected rank
  - Displays: Registration, Make, Model, Year, Capacity, Assignment Date, Status
  - Shows vehicle count badge
- **Trips by Route Tab**:
  - Groups trips by route (Departure → Destination)
  - Shows route-level statistics: Trip count, Total passengers, Total revenue
  - Expandable trip details for each route
  - Displays: Vehicle, Driver, Departure Time, Passengers, Revenue, Net Amount, Status
  - Color-coded status chips

**Data Loading:**
- Auto-loads admin profile from localStorage
- Fetches taxi ranks for the tenant
- Loads vehicles via `/TaxiRankAdmin/{adminId}/vehicles`
- Loads trips via `/TaxiRankTrips/rank/{taxiRankId}`

### Backend Updates

#### 2. TaxiRankTrips Controller Enhancement
**File:** `backend/MzansiFleet.Api/Controllers/TaxiRankTripsController.cs`

**New Endpoint:**
```csharp
// GET: api/TaxiRankTrips/rank/{taxiRankId}
[HttpGet("rank/{taxiRankId}")]
public async Task<ActionResult<IEnumerable<TaxiRankTrip>>> GetByTaxiRank(Guid taxiRankId)
```

This endpoint returns all trips for a specific taxi rank, including:
- Vehicle details
- Driver information
- Passenger count
- Financial totals (Revenue, Costs, Net)
- Trip status

**Repository:** The `ITaxiRankTripRepository.GetByTaxiRankIdAsync()` method was already implemented.

### Navigation Updates

#### 3. Admin Dashboard Menu
**File:** `frontend/src/app/components/admin-dashboard/admin-dashboard.component.ts`

**Changes:**
- Added "Overview" as the first menu item (icon: dashboard)
- Set as default route when accessing `/admin`

#### 4. App Routing
**File:** `frontend/src/app/app.routes.ts`

**Changes:**
- Added route: `/admin/overview` → `RankOverviewComponent`
- Changed default redirect from 'routes' to 'overview'

## User Experience

### Navigation Flow
1. Admin logs in and navigates to Admin Dashboard
2. Default view shows Rank Overview
3. Admin selects a taxi rank from dropdown
4. Two tabs available:
   - **Vehicles**: View all vehicles assigned to the rank
   - **Trips by Route**: View trips grouped by routes

### Key Features
- **Responsive Design**: Works on desktop and mobile
- **Material Design**: Consistent with existing UI
- **Real-time Data**: Loads current data from backend
- **Route Grouping**: Intelligent grouping of trips by departure-destination pairs
- **Financial Summary**: Clear revenue and cost breakdown per trip
- **Status Indicators**: Color-coded chips for trip status
- **Empty States**: Helpful messages when no data available

## Technical Details

### Data Flow
```
Admin Dashboard
    ↓
Rank Overview Component
    ↓
Select Taxi Rank
    ↓
Parallel API Calls:
    - GET /TaxiRankAdmin/{adminId}/vehicles
    - GET /TaxiRankTrips/rank/{taxiRankId}
    ↓
Display in Tabs:
    - Vehicles Table
    - Trips Grouped by Route
```

### API Endpoints Used
1. **GET /TaxiRanks** - Load all taxi ranks
2. **GET /TaxiRankAdmin/{adminId}/vehicles** - Get vehicles assigned to admin's rank
3. **GET /TaxiRankTrips/rank/{taxiRankId}** - Get all trips for a specific rank

### Data Models

**Vehicle Assignment:**
```typescript
interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  capacity: number;
  assignedSince: string;
  isActive: boolean;
  notes?: string;
}
```

**Trip Summary:**
```typescript
interface TripSummary {
  id: string;
  vehicleRegistration: string;
  driverName: string;
  departureStation: string;
  destinationStation: string;
  departureTime: string;
  arrivalTime?: string;
  passengerCount: number;
  totalAmount: number;
  totalCosts: number;
  netAmount: number;
  status: string;
}
```

**Route Grouping:**
```typescript
interface RouteGrouping {
  routeName: string;          // "JHB → PTA"
  tripCount: number;
  totalPassengers: number;
  totalRevenue: number;
  trips: TripSummary[];
}
```

## Testing

### Manual Testing Steps
1. Log in as Taxi Rank Admin
2. Navigate to Admin Dashboard (should land on Overview)
3. Select a taxi rank from dropdown
4. Verify Vehicles tab shows assigned vehicles
5. Verify Trips by Route tab shows trips grouped by routes
6. Check that statistics are calculated correctly
7. Verify responsive design on different screen sizes

### Expected Results
- ✅ Overview is the default dashboard view
- ✅ Taxi ranks load from API
- ✅ Vehicles display in table format
- ✅ Trips are grouped by departure-destination
- ✅ Route statistics are accurate
- ✅ Status colors are correct
- ✅ Empty states display when no data

## Future Enhancements
- Add date range filters for trips
- Export vehicle/trip data to Excel
- Add vehicle performance metrics
- Show route profitability analysis
- Add real-time trip status updates
- Include charts/graphs for visual analytics

## Summary
The Rank Overview feature provides taxi rank administrators with a comprehensive view of their operations, including vehicle assignments and trip performance grouped by routes. This enables better fleet management and operational decision-making.
