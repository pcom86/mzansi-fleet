# Taxi Rank Module - Complete Documentation

## Overview
Comprehensive module for managing taxi rank operations, capturing trip details, passenger information, earnings, and expenses.

**Implementation Date:** January 9, 2026

---

## Features Implemented

### ✅ Backend (Complete)

#### 1. Domain Entities
**File:** `MzansiFleet.Domain\Entities\TaxiRank.cs`

- **TaxiRankTrip**: Trip records with departure/arrival stations, times, financial summary
- **TripPassenger**: Passenger details, boarding station, amount paid, seat number
- **TripCost**: Driver-added expenses (fuel, tolls, parking, etc.)
- **TaxiMarshalProfile**: Marshal user profiles with marshal code, rank location

#### 2. Repository Layer
**Files:**
- `MzansiFleet.Domain\Interfaces\IRepositories\ITaxiRankRepositories.cs`
- `MzansiFleet.Repository\Repositories\TaxiRankRepositories.cs`

All repositories with full CRUD operations and specialized queries.

#### 3. API Controllers
**Files:**
- `MzansiFleet.Api\Controllers\TaxiRankTripsController.cs`
- `MzansiFleet.Api\Controllers\TaxiMarshalsController.cs`

#### 4. Database Migration
**File:** `backend\Migrations\20260109_AddTaxiRankModule.sql`

Creates 4 tables with proper indexes and foreign keys.

### ✅ Frontend (Partial)

#### 1. Marshal Registration
**File:** `frontend\src\app\components\marshal\marshal-registration.component.ts`

3-step registration wizard with personal info, work details, and account setup.

---

## Database Schema

### TaxiMarshalProfiles
```sql
- Id (UUID, PK)
- UserId (UUID, FK → Users)
- TenantId (UUID, FK → Tenants)
- MarshalCode (VARCHAR(50), UNIQUE)
- FullName, PhoneNumber, Email
- TaxiRankLocation, HireDate, Status
- IdNumber, Address
- CreatedAt, UpdatedAt
```

### TaxiRankTrips
```sql
- Id (UUID, PK)
- TenantId, VehicleId, DriverId, MarshalId
- DepartureStation, DestinationStation
- DepartureTime, ArrivalTime
- TotalAmount, TotalCosts, NetAmount
- Status, PassengerCount
- Notes, CreatedAt, UpdatedAt
```

### TripPassengers
```sql
- Id (UUID, PK)
- TaxiRankTripId (FK)
- PassengerName, PassengerPhone
- DepartureStation, ArrivalStation
- Amount, SeatNumber
- BoardedAt, Notes
```

### TripCosts
```sql
- Id (UUID, PK)
- TaxiRankTripId (FK)
- AddedByDriverId (FK)
- Category, Amount, Description
- ReceiptNumber, CreatedAt
```

---

## API Endpoints

### Taxi Rank Trips

#### Create Trip
```http
POST /api/TaxiRankTrips
Content-Type: application/json

{
  "tenantId": "guid",
  "vehicleId": "guid",
  "driverId": "guid",
  "marshalId": "guid",
  "departureStation": "Johannesburg Park Station",
  "destinationStation": "Pretoria Central",
  "departureTime": "2026-01-09T08:30:00Z",
  "notes": "Morning rush hour"
}
```

**Response:** Creates trip + initial VehicleEarnings record

#### Add Passenger
```http
POST /api/TaxiRankTrips/{tripId}/passengers
Content-Type: application/json

{
  "passengerName": "John Doe",
  "passengerPhone": "0821234567",
  "departureStation": "Johannesburg Park Station",
  "arrivalStation": "Pretoria Central",
  "amount": 45.00,
  "seatNumber": 3
}
```

**Response:** Adds passenger, updates trip totals, updates VehicleEarnings

#### Add Trip Cost (Driver)
```http
POST /api/TaxiRankTrips/{tripId}/costs
Content-Type: application/json

{
  "addedByDriverId": "guid",
  "category": "Fuel",
  "amount": 250.00,
  "description": "Filled up at Shell garage",
  "receiptNumber": "R12345"
}
```

**Response:** Adds cost, updates trip totals, creates VehicleExpense record

#### Get Trips
```http
GET /api/TaxiRankTrips?tenantId={guid}
GET /api/TaxiRankTrips/{id}
GET /api/TaxiRankTrips/vehicle/{vehicleId}
GET /api/TaxiRankTrips/driver/{driverId}
GET /api/TaxiRankTrips/marshal/{marshalId}
```

#### Update Trip Status
```http
PUT /api/TaxiRankTrips/{id}/status
Content-Type: application/json

{
  "status": "Arrived"
}
```

### Taxi Marshals

#### Register Marshal
```http
POST /api/TaxiMarshals/register
Content-Type: application/json

{
  "tenantId": "guid",
  "marshalCode": "MAR001",
  "fullName": "John Marshal",
  "phoneNumber": "0821234567",
  "email": "john.marshal@example.com",
  "password": "SecurePass123",
  "taxiRankLocation": "Johannesburg Park Station",
  "hireDate": "2026-01-01T00:00:00Z",
  "idNumber": "8501015800080",
  "address": "123 Main St, Johannesburg"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Marshal registered successfully",
  "userId": "guid",
  "marshalId": "guid",
  "marshalCode": "MAR001"
}
```

#### Get Marshals
```http
GET /api/TaxiMarshals?tenantId={guid}
GET /api/TaxiMarshals/{id}
GET /api/TaxiMarshals/user/{userId}
GET /api/TaxiMarshals/code/{marshalCode}
```

---

## Financial Integration

### Automatic Earnings Recording

When a trip is created:
```csharp
VehicleEarnings {
  VehicleId: trip.VehicleId,
  Amount: 0, // Updated as passengers added
  Source: "Taxi Rank Trip",
  Description: "Trip from {departure} to {destination}"
}
```

When a passenger is added:
- Trip.TotalAmount += passenger.Amount
- VehicleEarnings.Amount = Trip.TotalAmount

### Automatic Expense Recording

When a driver adds a trip cost:
```csharp
VehicleExpense {
  VehicleId: trip.VehicleId,
  Amount: cost.Amount,
  Category: cost.Category,
  Description: "Trip Cost: {cost.Description}",
  InvoiceNumber: cost.ReceiptNumber,
  Vendor: "Trip Expense"
}
```

---

## User Workflows

### Marshal Workflow

1. **Register** (One-time)
   - Complete 3-step registration form
   - Receive marshal code and login credentials

2. **Login**
   - Use email and password
   - Access Marshal Dashboard

3. **Capture Trip**
   - Select vehicle and driver
   - Enter departure and destination stations
   - Click "Start Trip"

4. **Add Passengers**
   - For each passenger:
     - Enter name (optional) and phone (optional)
     - Select departure and arrival stations
     - Enter amount paid
     - Assign seat number
     - Click "Add Passenger"

5. **Monitor Trip**
   - View real-time passenger count
   - See running total of earnings
   - Update trip status (Departed → InTransit → Arrived)

### Owner Workflow

1. **View All Trips**
   - See list of all trips for their fleet
   - Filter by date range, vehicle, driver, or marshal
   - Sort by departure time, earnings, status

2. **View Trip Details**
   - Click on a trip to see full details
   - View all passengers with amounts
   - See all costs added by driver
   - Review financial summary:
     * Total Earnings (from passengers)
     * Total Costs (added by driver)
     * Net Amount (profit)

3. **Generate Reports**
   - Daily/weekly/monthly trip summaries
   - Vehicle profitability analysis
   - Marshal performance metrics
   - Driver earnings vs. costs

### Driver Workflow

1. **View My Trips**
   - See trips where they were the driver
   - Filter by date range or status

2. **Add Trip Costs**
   - Select a trip
   - Click "Add Cost"
   - Choose category (Fuel, Tolls, Parking, Food, etc.)
   - Enter amount and description
   - Optional: Add receipt number
   - Submit

3. **View Trip Summary**
   - Total earnings from passengers
   - Total costs added
   - Net amount

---

## Remaining Frontend Components (To Implement)

### 1. Marshal Dashboard Component
**File:** `frontend\src\app\components\marshal\marshal-dashboard.component.ts`

**Features:**
- Create new trip form (vehicle selector, driver selector, stations)
- Active trip card showing current trip
- Passenger addition form (quick add with name, station, amount)
- Real-time passenger count and total earnings
- Recent trips list
- Trip status update buttons

**Key UI Elements:**
```typescript
// Trip Creation
selectVehicle(vehicleId)
selectDriver(driverId)
startTrip()

// Passenger Management
addPassenger(passengerData)
removePassenger(passengerId)
updatePassengerSeat(passengerId, seatNumber)

// Trip Status
updateTripStatus(status: 'Departed' | 'InTransit' | 'Arrived')
```

### 2. Owner Trips View Component
**File:** `frontend\src\app\components\owner-dashboard\owner-trips.component.ts`

**Features:**
- Data table with all trips
- Columns: Date, Vehicle, Driver, Marshal, Route, Passengers, Earnings, Costs, Net
- Click row to expand/navigate to trip details
- Date range filter
- Status filter
- Search by vehicle/driver

**Trip Details View:**
- Trip header (vehicle, driver, route, times)
- Passengers table (name, phone, stations, amount)
- Costs table (category, amount, description, receipt)
- Financial summary card (earnings, costs, net profit)

### 3. Driver Trip Costs Component
**File:** `frontend\src\app\components\driver-dashboard\driver-trip-costs.component.ts`

**Features:**
- List of driver's trips
- "Add Cost" button for each trip
- Cost addition dialog:
  * Category dropdown (Fuel, Tolls, Parking, Food, Snacks, Repairs, Other)
  * Amount input
  * Description textarea
  * Receipt number input
  * Submit button
- Trip costs history per trip
- Total costs summary

### 4. Marshal Management Component (Admin)
**File:** `frontend\src\app\components\admin\marshal-management.component.ts`

**Features:**
- List all marshals
- View marshal profile
- Edit marshal details
- Activate/Suspend marshal
- View marshal's trip history
- Marshal performance stats

---

## Code Example: Complete Trip Flow

### Backend - Create Trip with Passengers

```csharp
// 1. Create trip
var trip = new TaxiRankTrip {
    Id = Guid.NewGuid(),
    VehicleId = vehicleId,
    DriverId = driverId,
    MarshalId = marshalId,
    DepartureStation = "Johannesburg Park Station",
    DestinationStation = "Pretoria Central",
    DepartureTime = DateTime.UtcNow,
    Status = "Departed"
};
await _tripRepository.AddAsync(trip);

// 2. Add passengers
for (int i = 1; i <= 15; i++) {
    var passenger = new TripPassenger {
        Id = Guid.NewGuid(),
        TaxiRankTripId = trip.Id,
        DepartureStation = "Johannesburg Park Station",
        ArrivalStation = "Pretoria Central",
        Amount = 45.00m,
        SeatNumber = i
    };
    await _passengerRepository.AddAsync(passenger);
    
    trip.PassengerCount++;
    trip.TotalAmount += passenger.Amount;
}
await _tripRepository.UpdateAsync(trip);

// 3. Add driver costs
var fuelCost = new TripCost {
    Id = Guid.NewGuid(),
    TaxiRankTripId = trip.Id,
    AddedByDriverId = driverId,
    Category = "Fuel",
    Amount = 250.00m,
    Description = "Filled up at Shell"
};
await _costRepository.AddAsync(fuelCost);

trip.TotalCosts += fuelCost.Amount;
trip.NetAmount = trip.TotalAmount - trip.TotalCosts;
await _tripRepository.UpdateAsync(trip);

// Result:
// Total Earnings: 15 × R45 = R675
// Total Costs: R250
// Net Profit: R425
```

### Frontend - Marshal Capture Flow

```typescript
// Marshal Dashboard Component
export class MarshalDashboardComponent {
  currentTrip: any = null;
  vehicles: any[] = [];
  drivers: any[] = [];
  
  async startNewTrip() {
    const tripData = {
      tenantId: this.user.tenantId,
      vehicleId: this.selectedVehicle,
      driverId: this.selectedDriver,
      marshalId: this.user.id,
      departureStation: this.departureStation,
      destinationStation: this.destinationStation,
      departureTime: new Date()
    };
    
    this.currentTrip = await this.http.post(
      `${this.apiUrl}/TaxiRankTrips`,
      tripData
    ).toPromise();
    
    this.snackBar.open('Trip started!', 'Close', { duration: 2000 });
  }
  
  async addPassenger() {
    const passengerData = {
      passengerName: this.passengerForm.name,
      passengerPhone: this.passengerForm.phone,
      departureStation: this.passengerForm.departure,
      arrivalStation: this.passengerForm.arrival,
      amount: this.passengerForm.amount,
      seatNumber: this.passengerForm.seat
    };
    
    await this.http.post(
      `${this.apiUrl}/TaxiRankTrips/${this.currentTrip.id}/passengers`,
      passengerData
    ).toPromise();
    
    // Reload trip to get updated totals
    await this.loadCurrentTrip();
    
    // Reset form
    this.passengerForm = {};
    
    this.snackBar.open('Passenger added!', 'Close', { duration: 2000 });
  }
}
```

---

## Migration Instructions

### 1. Stop the API
```bash
# Stop MzansiFleet.Api if running
```

### 2. Apply Database Migration
```bash
psql -U your_user -d your_database -f backend/Migrations/20260109_AddTaxiRankModule.sql
```

### 3. Verify Tables Created
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('TaxiMarshalProfiles', 'TaxiRankTrips', 'TripPassengers', 'TripCosts');
```

### 4. Restart API
```bash
cd backend/MzansiFleet.Api
dotnet run
```

### 5. Test Endpoints
```bash
# Register a marshal
curl -X POST http://localhost:5000/api/TaxiMarshals/register \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "your-tenant-id",
    "marshalCode": "MAR001",
    "fullName": "Test Marshal",
    "phoneNumber": "0821234567",
    "email": "test@marshal.com",
    "password": "Test123",
    "taxiRankLocation": "Test Station"
  }'
```

---

## Testing Checklist

- [ ] Database migration applied successfully
- [ ] TaxiMarshalsController endpoints working
- [ ] TaxiRankTripsController endpoints working
- [ ] Marshal can register
- [ ] Marshal can create trip
- [ ] Marshal can add passengers
- [ ] Driver can add trip costs
- [ ] VehicleEarnings created on trip creation
- [ ] VehicleEarnings updated when passenger added
- [ ] VehicleExpense created when cost added
- [ ] Owner can view all trips for their fleet
- [ ] Owner can view trip details with passengers
- [ ] Financial totals calculated correctly
- [ ] Trip status updates work
- [ ] Passenger removal works
- [ ] Cost categories validated

---

## Future Enhancements

1. **Mobile App for Marshals**
   - Quick passenger capture on tablet/phone
   - Barcode scanning for vehicle IDs
   - Offline mode with sync

2. **Real-time Dashboard**
   - Live trip tracking
   - WebSocket updates for passenger additions
   - Heat map of active trips

3. **Advanced Analytics**
   - Peak hours analysis
   - Route profitability
   - Marshal productivity metrics
   - Driver cost patterns

4. **Automated Pricing**
   - Distance-based pricing calculator
   - Peak hour surge pricing
   - Group discounts

5. **Integration**
   - SMS notifications to passengers
   - WhatsApp boarding confirmations
   - Digital receipts via email

6. **Reporting**
   - Daily marshal reconciliation reports
   - Vehicle earnings vs. costs comparison
   - Tax authority compliance reports

---

## Support

For issues or questions:
1. Check API logs: `backend/MzansiFleet.Api/logs`
2. Verify database connection
3. Check repository registration in Program.cs
4. Review migration SQL for errors

---

**Module Status:** Backend Complete, Frontend Partial (Registration Done)
**Next Steps:** Implement remaining frontend components following the patterns established
