# Stuff Request Feature Documentation

## Overview
The Stuff Request feature allows passengers to request transportation for items/goods and receive competitive quotes from vehicle owners. This is a logistics/delivery request system where:

1. **Passengers** create requests for transporting items
2. **Owners** view available requests and submit quotes
3. **Passengers** review quotes and approve the best one
4. System tracks the entire process from request to delivery

## Backend Implementation

### Database Entities

#### StuffRequest Entity
**Location:** `backend/MzansiFleet.Domain/Entities/StuffRequest.cs`

Properties:
- `Id` - Unique identifier
- `PassengerId` - User making the request
- `ItemDescription` - Description of items to transport
- `ItemCategory` - Furniture, Electronics, Food, Documents, etc.
- `EstimatedWeight` - Weight in kg
- `Size` - Small, Medium, Large
- `PickupLocation` - Where to collect items
- `DeliveryLocation` - Where to deliver items
- `EstimatedDistance` - Distance in km
- `RequestedPickupDate` - When passenger wants pickup
- `RequestedDeliveryDate` - When passenger wants delivery
- `Priority` - Urgent, Normal, Flexible
- `SpecialInstructions` - Any special handling requirements
- `Status` - Pending, QuotesReceived, Approved, InTransit, Delivered, Cancelled
- `ApprovedQuoteId` - ID of approved quote (if any)
- `Quotes` - Collection of quotes received

#### StuffQuote Entity
**Location:** `backend/MzansiFleet.Domain/Entities/StuffRequest.cs`

Properties:
- `Id` - Unique identifier
- `StuffRequestId` - Request being quoted for
- `OwnerId` - Owner submitting the quote
- `VehicleId` - Vehicle to be used (optional)
- `QuotedPrice` - Price offered
- `Notes` - Additional information
- `EstimatedPickupTime` - When owner can pick up
- `EstimatedDeliveryTime` - When owner can deliver
- `Status` - Pending, Approved, Rejected, Expired

### API Endpoints

#### StuffRequestsController
**Location:** `backend/MzansiFleet.Api/Controllers/StuffRequestsController.cs`

**Endpoints:**
- `GET /api/StuffRequests` - Get all stuff requests
- `GET /api/StuffRequests/{id}` - Get specific request with all quotes
- `GET /api/StuffRequests/passenger/{passengerId}` - Get passenger's requests
- `GET /api/StuffRequests/available` - Get requests accepting quotes (status: Pending or QuotesReceived)
- `POST /api/StuffRequests` - Create new stuff request
- `PUT /api/StuffRequests/{id}` - Update stuff request
- `PUT /api/StuffRequests/{id}/approve-quote/{quoteId}` - Approve a quote (marks request as Approved, rejects other quotes)
- `PUT /api/StuffRequests/{id}/cancel` - Cancel request
- `DELETE /api/StuffRequests/{id}` - Delete request

#### StuffQuotesController
**Location:** `backend/MzansiFleet.Api/Controllers/StuffQuotesController.cs`

**Endpoints:**
- `GET /api/StuffQuotes` - Get all quotes
- `GET /api/StuffQuotes/{id}` - Get specific quote
- `GET /api/StuffQuotes/request/{requestId}` - Get all quotes for a request (sorted by price)
- `GET /api/StuffQuotes/owner/{ownerId}` - Get owner's quotes
- `POST /api/StuffQuotes` - Submit new quote
- `PUT /api/StuffQuotes/{id}` - Update quote (only if still pending)
- `DELETE /api/StuffQuotes/{id}` - Delete quote (only if still pending)

### Database Migration
**Migration:** `20260104074344_AddStuffRequestsAndQuotes`

Creates tables:
- `StuffRequests` - Stores all stuff transportation requests
- `StuffQuotes` - Stores quotes from owners

## Frontend Implementation

### TypeScript Models
**Location:** `frontend/src/app/models/stuff-request.model.ts`

Interfaces:
- `StuffRequest` - Complete request with all fields
- `StuffQuote` - Quote details
- `CreateStuffRequest` - DTO for creating requests
- `CreateStuffQuote` - DTO for submitting quotes

### Service Layer
**Location:** `frontend/src/app/services/stuff-request.service.ts`

Methods:
- Request management: `getAllRequests()`, `getRequest()`, `getRequestsByPassenger()`, `getAvailableRequests()`
- Request actions: `createRequest()`, `updateRequest()`, `approveQuote()`, `cancelRequest()`, `deleteRequest()`
- Quote management: `getAllQuotes()`, `getQuotesByRequest()`, `getQuotesByOwner()`
- Quote actions: `createQuote()`, `updateQuote()`, `deleteQuote()`

### Passenger UI Component
**Location:** `frontend/src/app/components/stuff-requests/passenger-stuff-requests.component.ts`

**Features:**
1. **Request List View:**
   - Shows all passenger's requests
   - Color-coded status badges
   - Quick view of pickup/delivery locations
   - Shows number of quotes received
   - Action buttons: View Details, Cancel

2. **Create Request Modal:**
   - Item description (required)
   - Category dropdown (Furniture, Electronics, Food, etc.)
   - Size selector (Small, Medium, Large)
   - Weight input
   - Priority selector (Flexible, Normal, Urgent)
   - Pickup location (required)
   - Delivery location (required)
   - Pickup date (required)
   - Delivery date (optional)
   - Special instructions textarea

3. **Request Details View:**
   - Complete request information
   - All received quotes displayed
   - Quote comparison (sorted by price)
   - Approve quote button for each pending quote
   - Shows approved quote if exists

4. **Quotes Display:**
   - Price prominently displayed
   - Quote status badge
   - Owner's notes/comments
   - Estimated pickup/delivery times
   - One-click approval

## User Workflow

### For Passengers:

1. **Create Request:**
   - Click "➕ New Request"
   - Fill in item details, locations, dates
   - Submit request
   - Request status: Pending

2. **Receive Quotes:**
   - Owners see the request and submit quotes
   - Request status changes to: QuotesReceived
   - Passenger gets notified (multiple quotes can be received)

3. **Review and Approve:**
   - View all quotes in request details
   - Compare prices, notes, and timing
   - Click "✓ Approve" on preferred quote
   - Request status: Approved
   - All other quotes: Rejected

4. **Track Delivery:**
   - Request status updates: InTransit → Delivered
   - (Future: Real-time tracking)

### For Owners:

1. **View Available Requests:**
   - Browse pending stuff requests
   - Filter by category, location, date
   - See item details and requirements

2. **Submit Quote:**
   - Enter competitive price
   - Add notes (e.g., "I have a covered truck")
   - Specify pickup/delivery times
   - Select vehicle to use
   - Submit quote

3. **Track Quotes:**
   - View all submitted quotes
   - See quote status (Pending/Approved/Rejected)
   - Update quotes if still pending
   - Get notified when quote is approved

4. **Complete Delivery:**
   - Pick up items at specified time
   - Update status to InTransit
   - Deliver items
   - Mark as Delivered

## API Usage Examples

### Create a Stuff Request (Passenger)
```powershell
$request = @{
    passengerId = "passenger-guid"
    itemDescription = "3-seater couch and coffee table"
    itemCategory = "Furniture"
    size = "Large"
    estimatedWeight = 150
    pickupLocation = "123 Main St, Johannesburg"
    deliveryLocation = "456 Oak Ave, Pretoria"
    requestedPickupDate = "2026-01-10T10:00:00Z"
    priority = "Normal"
    specialInstructions = "Please use blankets to protect furniture"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/StuffRequests" -Method Post -Body $request -ContentType "application/json"
```

### Get Available Requests (Owner)
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/StuffRequests/available" -Method Get
```

### Submit Quote (Owner)
```powershell
$quote = @{
    stuffRequestId = "request-guid"
    ownerId = "owner-guid"
    vehicleId = "vehicle-guid"
    quotedPrice = 800.00
    notes = "I have a covered truck suitable for furniture. Can deliver same day."
    estimatedPickupTime = "2026-01-10T09:00:00Z"
    estimatedDeliveryTime = "2026-01-10T14:00:00Z"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/StuffQuotes" -Method Post -Body $quote -ContentType "application/json"
```

### Approve Quote (Passenger)
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/StuffRequests/{requestId}/approve-quote/{quoteId}" -Method Put
```

## Status Flow

```
Passenger Creates Request
         ↓
   Status: Pending
         ↓
Owners Submit Quotes
         ↓
Status: QuotesReceived
         ↓
Passenger Approves Quote
         ↓
   Status: Approved
         ↓
Owner Picks Up Items
         ↓
  Status: InTransit
         ↓
  Owner Delivers
         ↓
  Status: Delivered
```

## Business Rules

1. **Quote Submission:**
   - Owners can only submit one quote per request
   - Quotes can only be submitted for Pending or QuotesReceived requests
   - Cannot quote on Approved, Cancelled, or completed requests

2. **Quote Approval:**
   - Only the passenger who created the request can approve quotes
   - Approving a quote automatically rejects all other quotes
   - Once approved, request cannot receive new quotes

3. **Request Cancellation:**
   - Passenger can cancel anytime before approval
   - After approval, cancellation requires coordination with owner

4. **Quote Updates:**
   - Owners can update their quotes while status is Pending
   - Cannot update after approval or rejection

## Integration Points

### With Existing Systems:

1. **User Management:**
   - Links to User table for PassengerId and OwnerId
   - Uses existing authentication

2. **Vehicle Management:**
   - Optional link to Vehicle table
   - Owners can specify which vehicle they'll use

3. **Payment System:**
   - Can integrate with existing PaymentIntents
   - Quote price becomes payment amount

4. **Notifications:**
   - Can integrate with notification system
   - Notify passengers of new quotes
   - Notify owners when quote is approved

## Future Enhancements

1. **Real-time Tracking:**
   - GPS tracking during transit
   - Live location updates

2. **Photos:**
   - Upload photos of items
   - Proof of delivery photos

3. **Insurance:**
   - Optional insurance coverage
   - Damage claims

4. **Ratings:**
   - Rate owner after delivery
   - Rate passenger cooperation

5. **Recurring Requests:**
   - Template for frequent shipments
   - Scheduled pickups

6. **Multi-stop Deliveries:**
   - Pick up from multiple locations
   - Deliver to multiple destinations

7. **Package Size Calculator:**
   - Visual size guide
   - Weight estimator

8. **Route Optimization:**
   - Owners can combine multiple requests
   - Optimize delivery routes

## Testing

### Manual Testing Steps:

**As Passenger:**
1. Navigate to Stuff Requests page
2. Click "New Request"
3. Fill in all details
4. Submit request
5. Verify request appears in list
6. Wait for quotes or mock them via API
7. View request details
8. Approve a quote
9. Verify status changes

**As Owner:**
1. View available requests
2. Select a request
3. Submit competitive quote
4. View your quotes list
5. Check if quote gets approved

### API Testing:
```powershell
# Test create request
$request = @{passengerId="test-id"; itemDescription="Test"; pickupLocation="A"; deliveryLocation="B"; requestedPickupDate=(Get-Date).AddDays(1).ToString("o")} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5000/api/StuffRequests" -Method Post -Body $request -ContentType "application/json"

# Test get available requests
Invoke-RestMethod -Uri "http://localhost:5000/api/StuffRequests/available" -Method Get

# Test submit quote
$quote = @{stuffRequestId="request-id"; ownerId="owner-id"; quotedPrice=500} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5000/api/StuffQuotes" -Method Post -Body $quote -ContentType "application/json"
```

## Status

✅ Backend API - Complete
✅ Database schema - Migrated
✅ Frontend models - Complete
✅ Frontend service - Complete
✅ Passenger UI - Complete
⏳ Owner UI - Pending (next step)
⏳ Route integration - Pending
⏳ Navigation menu update - Pending

The Stuff Request feature is functional for passengers. Next steps:
1. Create Owner UI component for viewing requests and submitting quotes
2. Add navigation links to app routing
3. Update menus to show Stuff Requests option
4. Test end-to-end workflow
