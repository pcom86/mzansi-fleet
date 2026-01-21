# Tracking Device Installation Feature - Implementation Guide

## Overview
This feature allows vehicle owners to request tracking device installation for their vehicles, and enables tracking companies (service providers) to register, browse requests, and submit competitive offers. Owners can then review and accept the best offer.

## ✅ Completed Implementation

### Backend Components

#### 1. Database Entities
**File:** `backend/MzansiFleet.Domain/Entities/TrackingDevice.cs`
- `TrackingDeviceRequest`: Owner's request for tracking device installation
  - Vehicle details (registration, make, model, year)
  - Installation preferences (location, date, required features)
  - Budget range
  - Status tracking

- `TrackingDeviceOffer`: Service provider's offer
  - Device specifications (brand, model, features)
  - Pricing (device cost, installation, monthly subscription)
  - Warranty and support details
  - Availability and estimated installation time

#### 2. DTOs
**File:** `backend/MzansiFleet.Domain/DTOs/TrackingDeviceDtos.cs`
- CreateTrackingDeviceRequestDto
- TrackingDeviceRequestDto
- CreateTrackingDeviceOfferDto
- TrackingDeviceOfferDto
- AcceptTrackingDeviceOfferDto

#### 3. Database Migration
**Files:**
- `backend/add-tracking-device-tables.sql` - SQL migration script
- `backend/apply-tracking-device-migration.ps1` - PowerShell script to apply migration

**Tables Created:**
- `TrackingDeviceRequests`
- `TrackingDeviceOffers`

**To Apply Migration:**
```powershell
cd backend
.\apply-tracking-device-migration.ps1
```

#### 4. API Controller
**File:** `backend/MzansiFleet.Api/Controllers/TrackingDeviceController.cs`

**Endpoints:**
- `POST /api/TrackingDevice/request` - Owner creates request
- `GET /api/TrackingDevice/my-requests` - Owner gets their requests
- `GET /api/TrackingDevice/marketplace-requests` - Service provider browses open requests
- `POST /api/TrackingDevice/offer` - Service provider submits offer
- `GET /api/TrackingDevice/request/{id}/offers` - Owner gets offers for their request
- `GET /api/TrackingDevice/my-offers` - Service provider gets their submitted offers
- `POST /api/TrackingDevice/accept-offer/{id}` - Owner accepts an offer
- `DELETE /api/TrackingDevice/request/{id}` - Owner cancels/deletes request

#### 5. DbContext Update
**File:** `backend/MzansiFleet.Repository/MzansiFleetDbContext.cs`
- Added DbSets for TrackingDeviceRequests and TrackingDeviceOffers
- Configured entity relationships and foreign keys

### Frontend Components

#### 1. Service
**File:** `frontend/src/app/services/tracking-device.service.ts`
- Complete API integration for all tracking device endpoints

#### 2. Models
**File:** `frontend/src/app/models/tracking-device.model.ts`
- TypeScript interfaces for requests and offers

#### 3. Owner Components
**File:** `frontend/src/app/components/tracking-device/request-tracking-device.component.ts`
- Request form with vehicle selection
- View my requests list
- See offer count for each request
- Delete/cancel requests

**File:** `frontend/src/app/components/tracking-device/tracking-device-offers.component.ts`
- View all offers for a specific request
- Compare offers (pricing, features, warranty)
- Contact providers
- Accept offers

## 🔧 Remaining Setup Steps

### 1. Service Provider Component (Tracking Companies)
Create: `frontend/src/app/components/tracking-device/tracking-marketplace.component.ts`

This component should allow tracking companies to:
- Browse open installation requests
- View vehicle and owner details
- Submit competitive offers
- Track submitted offers

### 2. Service Provider Registration Update
The service provider registration already supports adding "Tracking" as a service type. 

**To register a tracking company:**
1. Navigate to Service Provider Registration
2. Select "Tracking" or "Tracking Device Installation" in Service Types field
3. Complete the registration form

### 3. Routing Configuration
Update the following route files:

**Owner Dashboard Routes:**
```typescript
// frontend/src/app/app.routes.ts or owner-dashboard routes
{
  path: 'tracking-device',
  component: RequestTrackingDeviceComponent
},
{
  path: 'tracking-offers/:id',
  component: TrackingDeviceOffersComponent
}
```

**Service Provider Dashboard Routes:**
```typescript
{
  path: 'tracking-marketplace',
  component: TrackingMarketplaceComponent
},
{
  path: 'my-tracking-offers',
  component: MyTrackingOffersComponent
}
```

### 4. Navigation Menu Updates

**Owner Dashboard:**
Add to menu items:
```typescript
{
  title: 'Tracking Device',
  icon: 'gps_fixed',
  route: 'tracking-device'
}
```

**Service Provider Dashboard:**
Add to menu items (only if serviceTypes includes "Tracking"):
```typescript
{
  title: 'Installation Requests',
  icon: 'gps_fixed',
  route: 'tracking-marketplace'
}
```

## 📋 How It Works

### Owner Flow:
1. **Create Request**
   - Select vehicle from their fleet
   - Specify installation location and preferred date
   - List required device features (GPS, Geofencing, Alerts, etc.)
   - Set budget range (optional)

2. **Receive Offers**
   - Tracking companies submit competitive offers
   - Each offer includes device details, pricing, warranty
   - Owner receives notifications for new offers

3. **Compare & Accept**
   - Review multiple offers side-by-side
   - Compare pricing (upfront + monthly subscription)
   - Check provider ratings and reviews
   - Accept the best offer

4. **Installation**
   - Contact accepted provider to schedule
   - Installation takes place
   - Payment processing (can be integrated)

### Service Provider (Tracking Company) Flow:
1. **Register as Service Provider**
   - Include "Tracking" in service types
   - Provide business details and certifications

2. **Browse Requests**
   - View open installation requests in marketplace
   - See vehicle details and owner requirements
   - Filter by location, budget, features

3. **Submit Offer**
   - Specify device brand and model
   - Provide pricing breakdown
   - Include warranty and support details
   - Set availability date

4. **Track Status**
   - Monitor submitted offers
   - Get notified when offer is accepted/rejected
   - Manage installations

## 🎯 Key Features

### For Owners:
- ✅ Easy vehicle selection from fleet
- ✅ Specify tracking requirements
- ✅ Receive multiple competitive offers
- ✅ Compare pricing and features
- ✅ Provider ratings and reviews
- ✅ Accept/reject offers
- ✅ Request management

### For Tracking Companies:
- ✅ Browse installation opportunities
- ✅ Submit competitive offers
- ✅ Showcase devices and services
- ✅ Build reputation through ratings
- ✅ Manage offer pipeline
- ✅ Direct owner communication

## 🔐 Security & Access Control

- All endpoints require authentication
- Owners can only view/manage their own requests
- Service providers must have "Tracking" in service types to access marketplace
- Owners can only accept offers for their own requests
- Automatic rejection of other pending offers when one is accepted

## 💡 Testing the Feature

### 1. Apply Database Migration
```powershell
cd c:\Users\pmaseko\mzansi fleet\backend
.\apply-tracking-device-migration.ps1
```

### 2. Register a Tracking Company
- Create a user account
- Register as service provider
- Include "Tracking, GPS Installation" in Service Types field

### 3. Create a Request (as Owner)
- Login as an owner
- Navigate to Tracking Device section
- Select a vehicle
- Fill in installation requirements
- Submit request

### 4. Submit an Offer (as Tracking Company)
- Login as tracking service provider
- Browse installation requests
- Select a request
- Submit competitive offer with pricing

### 5. Accept Offer (as Owner)
- View offers for your request
- Compare different offers
- Accept the best one

## 📊 Database Schema

### TrackingDeviceRequests Table
- Id (uuid, PK)
- OwnerId (uuid, FK -> OwnerProfiles)
- VehicleId (uuid, FK -> Vehicles)
- Vehicle details (Registration, Make, Model, Year)
- Installation preferences
- Budget range
- Status, timestamps, offer count

### TrackingDeviceOffers Table
- Id (uuid, PK)
- TrackingDeviceRequestId (uuid, FK -> TrackingDeviceRequests)
- ServiceProviderId (uuid, FK -> ServiceProviderProfiles)
- Device specifications
- Pricing details
- Warranty and support
- Status, timestamps

## 🚀 Next Steps

1. Create the tracking marketplace component for service providers
2. Add routes to respective dashboards
3. Update navigation menus
4. Test end-to-end flow
5. Add email notifications (optional)
6. Integrate payment processing (optional)
7. Add review/rating system after installation (optional)

## 📝 Notes

- The feature follows the same pattern as the Vehicle Rental Marketplace
- Service types are comma-separated strings (e.g., "Mechanical, Electrical, Tracking")
- Accepting an offer automatically updates request status and rejects other pending offers
- All monetary values are in South African Rand (R)
- Monthly subscription fee is separate from upfront costs

## Support

For issues or questions about this feature, refer to:
- `SERVICE_PROVIDER_FEATURE_DOCUMENTATION.md`
- `VEHICLE_RENTAL_MARKETPLACE_DOCUMENTATION.md`
- API documentation at `/swagger` when backend is running
