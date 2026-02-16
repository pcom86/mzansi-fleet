# Vehicle Financial Tracking System

## Overview
The Vehicle Financial Tracking System allows fleet owners to:
- Track vehicle earnings (daily, weekly, or monthly)
- Record vehicle expenses and costs
- Compare earnings against expenses
- Generate profitability reports for any period
- Determine if a vehicle is profitable

## Features Implemented

### Backend (API)

#### 1. Database Entities
**Location:** `backend/MzansiFleet.Domain/Entities/VehicleFinancials.cs`

- **VehicleEarnings**: Tracks income from vehicles
  - Id (Guid)
  - VehicleId (Foreign Key)
  - Date
  - Amount
  - Source (e.g., "Trip Revenue", "Lease Payment")
  - Description
  - Period (Daily/Weekly/Monthly)
  - CreatedAt

- **VehicleExpense**: Tracks vehicle costs
  - Id (Guid)
  - VehicleId (Foreign Key)
  - Date
  - Amount
  - Category (Fuel, Maintenance, Insurance, etc.)
  - Description
  - InvoiceNumber
  - Vendor
  - CreatedAt

#### 2. API Controllers

**VehicleEarningsController** (`backend/MzansiFleet.Api/Controllers/VehicleEarningsController.cs`)
- `GET /api/VehicleEarnings/vehicle/{vehicleId}` - Get all earnings for a vehicle
- `GET /api/VehicleEarnings/vehicle/{vehicleId}/period?startDate={date}&endDate={date}` - Get earnings by period
- `POST /api/VehicleEarnings` - Create new earnings record
- `PUT /api/VehicleEarnings/{id}` - Update earnings record
- `DELETE /api/VehicleEarnings/{id}` - Delete earnings record

**VehicleExpensesController** (`backend/MzansiFleet.Api/Controllers/VehicleExpensesController.cs`)
- `GET /api/VehicleExpenses/vehicle/{vehicleId}` - Get all expenses for a vehicle
- `GET /api/VehicleExpenses/vehicle/{vehicleId}/period?startDate={date}&endDate={date}` - Get expenses by period
- `POST /api/VehicleExpenses` - Create new expense record
- `PUT /api/VehicleExpenses/{id}` - Update expense record
- `DELETE /api/VehicleExpenses/{id}` - Delete expense record

**VehicleProfitabilityController** (`backend/MzansiFleet.Api/Controllers/VehicleProfitabilityController.cs`)
- `GET /api/VehicleProfitability/vehicle/{vehicleId}?startDate={date}&endDate={date}` - Get profitability report

Returns:
```json
{
  "vehicleId": "...",
  "vehicleRegistration": "CA 123 456",
  "vehicleMake": "Toyota",
  "vehicleModel": "Quantum",
  "period": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  },
  "totalEarnings": 25000.00,
  "totalExpenses": 8500.00,
  "netProfit": 16500.00,
  "profitMargin": 66.0,
  "earningsBreakdown": [
    { "source": "Trip Revenue", "amount": 20000.00, "percentage": 80.0 },
    { "source": "Lease Payment", "amount": 5000.00, "percentage": 20.0 }
  ],
  "expensesBreakdown": [
    { "category": "Fuel", "amount": 5000.00, "percentage": 58.8 },
    { "category": "Maintenance", "amount": 3500.00, "percentage": 41.2 }
  ],
  "isProfitable": true
}
```

#### 3. Database Migration
**Location:** `backend/MzansiFleet.Repository/Migrations/20260104073239_AddVehicleFinancialTracking.cs`

Creates two tables:
- `VehicleEarnings`
- `VehicleExpenses`

Both with proper foreign key constraints to the Vehicles table.

### Frontend (Angular)

#### 1. TypeScript Models
**Location:** `frontend/src/app/models/vehicle-financials.model.ts`

Interfaces:
- `VehicleEarnings`
- `VehicleExpense`
- `CreateVehicleEarnings` / `CreateVehicleEarningsCommand`
- `CreateVehicleExpense` / `CreateVehicleExpenseCommand`
- `VehicleProfitabilityReport`

#### 2. Service Layer
**Location:** `frontend/src/app/services/vehicle-financials.service.ts`

Angular service with all CRUD operations and profitability report fetching:
- `getVehicleEarnings(vehicleId)`
- `getVehicleEarningsByPeriod(vehicleId, startDate, endDate)`
- `createEarnings(earnings)`
- `updateEarnings(id, earnings)`
- `deleteEarnings(id)`
- `getVehicleExpenses(vehicleId)`
- `getVehicleExpensesByPeriod(vehicleId, startDate, endDate)`
- `createExpense(expense)`
- `updateExpense(id, expense)`
- `deleteExpense(id)`
- `getProfitabilityReport(vehicleId, startDate, endDate)`

#### 3. UI Component
**Location:** `frontend/src/app/components/vehicles/vehicle-details/vehicle-details.component.ts`

Added a new "💰 Earnings & Expenses" tab to the Vehicle Details page with:

**Period Selector:**
- Today
- This Week
- This Month
- Custom Range (with date pickers)

**Profitability Summary Cards:**
- Total Earnings (green card)
- Total Expenses (red card)
- Net Profit/Loss (blue/orange card with profit margin percentage)

**Action Buttons:**
- ➕ Add Earnings - Opens modal form
- ➕ Add Expense - Opens modal form

**Earnings History List:**
- Shows all earnings for the selected period
- Displays: Source, Date, Period, Amount
- Delete button for each record

**Expenses History List:**
- Shows all expenses for the selected period
- Displays: Category, Vendor, Invoice Number, Date, Amount
- Delete button for each record

**Add Earnings Modal:**
Form fields:
- Date (required)
- Amount (required)
- Source (required) - e.g., "Trip Revenue", "Lease Payment"
- Period (required) - Daily/Weekly/Monthly dropdown
- Description (optional)

**Add Expense Modal:**
Form fields:
- Date (required)
- Amount (required)
- Category (required) - Dropdown with:
  - Fuel
  - Maintenance
  - Insurance
  - License & Permits
  - Tires
  - Repairs
  - Parking & Tolls
  - Other
- Vendor (optional)
- Invoice Number (optional)
- Description (optional)

## How to Use

### 1. Navigate to Vehicle Details
1. Go to Vehicles page
2. Click "View Details" on any vehicle card
3. Click on the "💰 Earnings & Expenses" tab

### 2. Add Earnings
1. Select a period (default is "This Month")
2. Click "➕ Add Earnings" button
3. Fill in the form:
   - Select the date
   - Enter the amount
   - Enter the source (e.g., "Trip Revenue")
   - Select period (Daily/Weekly/Monthly)
   - Add description if needed
4. Click "Save Earnings"

### 3. Add Expenses
1. Click "➕ Add Expense" button
2. Fill in the form:
   - Select the date
   - Enter the amount
   - Select category from dropdown
   - Enter vendor name (optional)
   - Enter invoice number (optional)
   - Add description if needed
3. Click "Save Expense"

### 4. View Profitability Report
The report automatically updates when:
- You change the period selector
- You add/delete earnings or expenses
- You switch to the Financials tab

The summary shows:
- **Total Earnings**: Sum of all income for the period
- **Total Expenses**: Sum of all costs for the period
- **Net Profit/Loss**: Earnings minus Expenses
- **Profit Margin**: Percentage profit margin (Net Profit / Total Earnings * 100)
- **Profitability Status**: ✅ (profitable) or ⚠️ (loss)

### 5. Delete Records
- Each earnings/expense item has a 🗑️ delete button
- Click it to delete the record (with confirmation)
- Report updates automatically

## Database Schema

### VehicleEarnings Table
```sql
CREATE TABLE VehicleEarnings (
    Id UUID PRIMARY KEY,
    VehicleId UUID NOT NULL REFERENCES Vehicles(Id),
    Date DATE NOT NULL,
    Amount DECIMAL(18,2) NOT NULL,
    Source VARCHAR(200) NOT NULL,
    Description TEXT,
    Period VARCHAR(50) NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### VehicleExpenses Table
```sql
CREATE TABLE VehicleExpenses (
    Id UUID PRIMARY KEY,
    VehicleId UUID NOT NULL REFERENCES Vehicles(Id),
    Date DATE NOT NULL,
    Amount DECIMAL(18,2) NOT NULL,
    Category VARCHAR(100) NOT NULL,
    Description TEXT,
    InvoiceNumber VARCHAR(100),
    Vendor VARCHAR(200),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Testing

### Backend Testing
Use the following PowerShell commands to test the API:

```powershell
# Add earnings
$earnings = @{
    vehicleId = "your-vehicle-id"
    date = "2024-01-15"
    amount = 5000.00
    source = "Trip Revenue"
    period = "Daily"
    description = "Daily trips"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/VehicleEarnings" -Method Post -Body $earnings -ContentType "application/json"

# Add expense
$expense = @{
    vehicleId = "your-vehicle-id"
    date = "2024-01-15"
    amount = 800.00
    category = "Fuel"
    vendor = "Shell"
    description = "Fuel refill"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/VehicleExpenses" -Method Post -Body $expense -ContentType "application/json"

# Get profitability report
Invoke-RestMethod -Uri "http://localhost:5000/api/VehicleProfitability/vehicle/your-vehicle-id?startDate=2024-01-01&endDate=2024-01-31" -Method Get
```

### Frontend Testing
1. Start backend: `cd backend/MzansiFleet.Api; dotnet run --urls=http://localhost:5000`
2. Start frontend: `cd frontend; npm start`
3. Navigate to http://localhost:4200
4. Login and go to Vehicles → View Details → Earnings & Expenses tab

## Technical Notes

- **Currency**: All amounts are displayed in South African Rand (R)
- **Date Format**: Uses South African locale (en-ZA) for date formatting
- **Decimal Precision**: All amounts stored with 2 decimal places
- **Period Calculation**: 
  - Today: Current day only
  - This Week: Last 7 days
  - This Month: Last 30 days
  - Custom: User-defined date range
- **Profitability Calculation**: Real-time aggregation on API call
- **Data Validation**: Both client-side (Angular forms) and server-side (.NET)

## Future Enhancements

Potential improvements:
1. Export reports to PDF/Excel
2. Charts and graphs for visual analysis
3. Budget tracking and forecasting
4. Automated expense categorization
5. Recurring expense templates
6. Multi-vehicle comparison reports
7. Email alerts for low profitability
8. Integration with accounting systems

## Migration Applied

The migration `20260104073239_AddVehicleFinancialTracking` has been successfully applied to the database. The tables are ready to use.

## Status

✅ Backend API - Complete and running
✅ Database schema - Migrated
✅ Frontend models - Complete
✅ Frontend service - Complete
✅ Frontend UI - Complete
✅ Integration - Ready for testing

The system is fully functional and ready for use!
