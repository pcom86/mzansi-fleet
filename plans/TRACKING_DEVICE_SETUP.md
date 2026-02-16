# Tracking Device Installation Feature - Setup Guide

## ✅ What's Already Done

- ✅ Database tables created (TrackingDeviceRequests, TrackingDeviceOffers)
- ✅ Backend API controller with 8 endpoints
- ✅ Frontend components created
- ✅ Routes configured in app.routes.ts

## 🚀 How to Use the Feature

### Step 1: Add Navigation Menu Items

#### For Owner Dashboard
Add this menu item to your owner dashboard navigation:

```html
<a mat-list-item routerLink="/owner-dashboard/tracking-device" routerLinkActive="active">
  <mat-icon>gps_fixed</mat-icon>
  <span>Tracking Device</span>
</a>
```

#### For Service Provider Dashboard
Add this menu item (only show for tracking companies):

```html
<a mat-list-item routerLink="/tracking-device/marketplace" routerLinkActive="active" 
   *ngIf="isTrackingProvider()">
  <mat-icon>local_shipping</mat-icon>
  <span>Installation Requests</span>
</a>
```

### Step 2: Register a Tracking Company

1. **Go to Service Provider Registration**
   - Navigate to: `/service-provider-registration`
   
2. **Fill in Company Details**
   - Company Name: "TrackGuard Solutions"
   - Contact Person: "John Doe"
   - Email: "tracking@example.com"
   - Phone: "+27 11 123 4567"
   
3. **Select Service Types**
   - ✅ Check "Tracking" (or add "Tracking Device Installation")
   
4. **Complete Registration**
   - System creates tracking provider profile

### Step 3: As Vehicle Owner - Request Installation

1. **Navigate to Tracking Device Page**
   - URL: `/owner-dashboard/tracking-device`
   - Or click "Tracking Device" in owner dashboard menu
   
2. **Fill Request Form**
   - **Select Vehicle**: Choose from your vehicles dropdown
   - **Installation Location**: e.g., "Johannesburg, Sandton"
   - **Preferred Date**: e.g., "This week" or "2026-01-25"
   - **Device Features**: e.g., "Real-time GPS tracking, Geofencing, Speed alerts"
   - **Special Requirements** (optional): Any specific needs
   - **Budget Range** (optional): Min/Max budget in Rands
   
3. **Submit Request**
   - Click "Submit Request"
   - Request appears in "My Requests" section
   - Status: "Open"

### Step 4: As Tracking Company - View & Submit Offers

1. **Navigate to Marketplace**
   - URL: `/tracking-device/marketplace`
   - Or click "Installation Requests" in service provider menu
   
2. **Browse Open Requests**
   - See all installation requests from vehicle owners
   - View vehicle details, location, requirements
   - Check budget ranges
   
3. **Submit an Offer**
   - Click "Make Offer" on a request
   - Fill in offer details:
     - **Device Model**: e.g., "TrackGuard Pro X500"
     - **Installation Cost**: e.g., "2500"
     - **Monthly Fee**: e.g., "299"
     - **Installation Timeline**: e.g., "2 business days"
     - **Features**: e.g., "Real-time tracking, 3-year warranty"
     - **Terms**: Contract terms and conditions
   
4. **Submit Offer**
   - Offer sent to vehicle owner
   - Request status changes to "OfferReceived"

### Step 5: As Owner - Compare & Accept Offers

1. **View Offers**
   - Click "View X Offer(s)" on your request
   - URL: `/owner-dashboard/tracking-offers/{requestId}`
   
2. **Compare Offers**
   - See all offers side-by-side
   - Compare:
     - Device models and features
     - Installation costs
     - Monthly fees
     - Timelines
     - Total cost calculations
     - Provider ratings
   
3. **Accept an Offer**
   - Click "Accept Offer" on preferred option
   - Confirm acceptance
   - Request status changes to "Accepted"
   - Other offers are automatically rejected

### Step 6: Track Installation

After acceptance:
- Owner sees accepted offer details
- Tracking company receives notification
- Installation can be scheduled
- Status updates: Open → OfferReceived → Accepted → Scheduled → Completed

## 📍 Available URLs

### For Vehicle Owners
- **Request Page**: `/owner-dashboard/tracking-device`
- **View Offers**: `/owner-dashboard/tracking-offers/{requestId}`

### For Tracking Companies
- **Marketplace**: `/tracking-device/marketplace`

### Standalone Routes
- **Request Form**: `/tracking-device/request`
- **Marketplace**: `/tracking-device/marketplace`

## 🎯 Testing Workflow

### Quick Test (5 minutes)

1. **Start Backend & Frontend**
   ```bash
   # Terminal 1 - Backend
   cd backend/MzansiFleet.Api
   dotnet run

   # Terminal 2 - Frontend
   cd frontend
   npm start
   ```

2. **Register Tracking Provider**
   - Go to `/service-provider-registration`
   - Create "TrackGuard Solutions" with "Tracking" service type

3. **Login as Vehicle Owner**
   - Must have at least one vehicle registered

4. **Create Installation Request**
   - Navigate to `/owner-dashboard/tracking-device`
   - Select vehicle, fill details, submit

5. **Login as Tracking Provider**
   - Go to `/tracking-device/marketplace`
   - Find the request, click "Make Offer"

6. **Submit Offer**
   - Fill offer details (device, costs, timeline)
   - Submit

7. **Back to Owner Account**
   - View the request (should show "1 Offer")
   - Click "View Offers"
   - Compare and accept

8. **Verify Status**
   - Request status should be "Accepted"
   - Other offers rejected
   - Installation can proceed

## 🔑 API Endpoints

All endpoints under `/api/TrackingDevice`:

- `POST /request` - Create installation request (Owner)
- `GET /my-requests` - Get owner's requests (Owner)
- `GET /marketplace-requests` - Browse all requests (Tracking Companies)
- `POST /offer` - Submit offer (Tracking Company)
- `GET /request/{id}/offers` - Get offers for request (Owner)
- `GET /my-offers` - Get provider's offers (Tracking Company)
- `POST /accept-offer/{id}` - Accept offer (Owner)
- `DELETE /request/{id}` - Delete request (Owner)

## 🎨 UI Features

### Request Form
- Vehicle dropdown (owner's vehicles only)
- Location autocomplete-ready
- Feature requirements textarea
- Optional budget range
- Form validation

### My Requests List
- Card-based layout
- Status badges (color-coded)
- Offer count badges
- Click to view offers
- Delete for open requests

### Marketplace (Provider View)
- Filter by status
- Search by location
- Vehicle details preview
- Budget visibility
- Quick offer submission

### Offers Comparison (Owner View)
- Side-by-side comparison
- Cost breakdown
- Provider information
- Feature highlights
- One-click acceptance

## 🔐 Security & Permissions

- All endpoints require authentication (`[Authorize]`)
- Owner role: Create requests, view own requests, accept offers
- Service Provider role: View marketplace, submit offers
- Request ownership validation (can only view/modify own requests)
- Offer ownership validation (providers see own offers)

## 💡 Tips

1. **Add menu items** to dashboards for easy access
2. **Test with real vehicle data** for best experience
3. **Multiple providers** can submit offers for same request
4. **Budget is optional** - owners can leave it blank
5. **Status tracking** - requests flow through states automatically
6. **Offer rejection** - happens automatically when another offer is accepted

## 📱 Mobile Responsive

All components are mobile-responsive with:
- Responsive grid layouts
- Touch-friendly buttons
- Mobile-optimized forms
- Collapsible sections

## 🎉 You're Ready!

The feature is fully functional. Just add the navigation menu items to your dashboards and start testing!
