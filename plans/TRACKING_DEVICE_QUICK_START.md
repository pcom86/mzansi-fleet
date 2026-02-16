# Tracking Device Installation - Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### Step 1: Apply Database Migration
```powershell
# Open PowerShell in the backend directory
cd "c:\Users\pmaseko\mzansi fleet\backend"

# Run the migration script
.\apply-tracking-device-migration.ps1
```

This creates two tables:
- `TrackingDeviceRequests`
- `TrackingDeviceOffers`

### Step 2: Register a Tracking Company (Testing)

1. **Create a new account** or use existing service provider
2. **Navigate to Service Provider Registration**
3. **Fill in the form:**
   - Business Name: "GPS Tracking Solutions"
   - Service Types: "Tracking, GPS Installation" *(Include "Tracking")*
   - Vehicle Categories: "Sedan, SUV, Minibus, Truck"
   - Other required fields

4. **Submit registration**

### Step 3: Add Routes to Owner Dashboard

Add to `owner-dashboard.routes.ts` or wherever owner routes are defined:

```typescript
{
  path: 'tracking-device',
  component: RequestTrackingDeviceComponent
},
{
  path: 'tracking-offers/:id',
  component: TrackingDeviceOffersComponent
}
```

### Step 4: Add Routes to Service Provider Dashboard

Add to service provider routes:

```typescript
{
  path: 'tracking-marketplace',
  component: TrackingMarketplaceComponent
}
```

### Step 5: Update Navigation Menus

**Owner Dashboard Menu:**
```typescript
{
  title: 'Tracking Device',
  icon: 'gps_fixed',
  route: 'tracking-device',
  description: 'Request tracking device installation'
}
```

**Service Provider Dashboard Menu (Conditional):**
```typescript
// Only show if serviceProvider.serviceTypes includes "Tracking"
{
  title: 'Installation Requests',
  icon: 'gps_fixed',
  route: 'tracking-marketplace',
  description: 'Browse and respond to installation requests'
}
```

## 📝 Test the Complete Flow

### As Vehicle Owner:

1. **Login** as a vehicle owner
2. **Navigate** to "Tracking Device" section
3. **Fill the form:**
   - Select Vehicle: Choose from your fleet
   - Location: "Johannesburg, Sandton"
   - Preferred Date: "This week"
   - Features: "Real-time GPS, Geofencing, Speed alerts"
   - Budget: Min R2000, Max R5000
4. **Submit Request**
5. **Wait for offers** (you'll see the offer count update)

### As Tracking Company:

1. **Login** as service provider with "Tracking" in service types
2. **Navigate** to "Installation Requests" (marketplace)
3. **Browse requests** - You'll see all open installation requests
4. **Click "Submit Offer"** on a request
5. **Fill offer form:**
   - Device: "Cartrack Pro 5"
   - Features: "GPS, Geofencing, Speed alerts, Engine immobilizer"
   - Device Cost: R3500
   - Installation: R800
   - Monthly Fee: R149
   - Warranty: "24 months"
   - Support: "24/7 phone support"
   - Available: Select date
   - Time: "2 hours"
6. **Submit Offer**

### Back as Owner:

1. **View your request** - See "1 offer" badge
2. **Click "View Offers"**
3. **Compare offers** (pricing, features, warranty)
4. **Accept the best offer**
5. **Contact the provider** to schedule installation

## 📂 Files Created

### Backend:
- ✅ `MzansiFleet.Domain/Entities/TrackingDevice.cs`
- ✅ `MzansiFleet.Domain/DTOs/TrackingDeviceDtos.cs`
- ✅ `MzansiFleet.Domain/Interfaces/IRepositories/ITrackingDeviceRepositories.cs`
- ✅ `MzansiFleet.Repository/Repositories/TrackingDeviceRepositories.cs`
- ✅ `MzansiFleet.Api/Controllers/TrackingDeviceController.cs`
- ✅ Updated `MzansiFleetDbContext.cs`
- ✅ `add-tracking-device-tables.sql`
- ✅ `apply-tracking-device-migration.ps1`

### Frontend:
- ✅ `models/tracking-device.model.ts`
- ✅ `services/tracking-device.service.ts`
- ✅ `components/tracking-device/request-tracking-device.component.ts`
- ✅ `components/tracking-device/tracking-device-offers.component.ts`
- ✅ `components/tracking-device/tracking-marketplace.component.ts`
- ✅ Updated `services/index.ts`

### Documentation:
- ✅ `TRACKING_DEVICE_INSTALLATION_FEATURE.md` (Comprehensive guide)
- ✅ `TRACKING_DEVICE_QUICK_START.md` (This file)

## 🎯 API Endpoints

All endpoints require authentication (`Bearer token`):

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/api/TrackingDevice/request` | Create installation request | Owner |
| GET | `/api/TrackingDevice/my-requests` | Get my requests | Owner |
| GET | `/api/TrackingDevice/marketplace-requests` | Browse open requests | Service Provider |
| POST | `/api/TrackingDevice/offer` | Submit an offer | Service Provider |
| GET | `/api/TrackingDevice/request/{id}/offers` | Get offers for request | Owner |
| GET | `/api/TrackingDevice/my-offers` | Get my submitted offers | Service Provider |
| POST | `/api/TrackingDevice/accept-offer/{id}` | Accept an offer | Owner |
| DELETE | `/api/TrackingDevice/request/{id}` | Delete request | Owner |

## 🔐 Authorization Rules

- ✅ Owners can only view/manage their own requests
- ✅ Service providers must have "Tracking" in `serviceTypes` to access marketplace
- ✅ Service providers can't submit multiple offers for same request
- ✅ Only request owner can accept offers
- ✅ Accepting an offer auto-rejects other pending offers

## 💡 Features Included

### For Owners:
- ✅ Select vehicle from fleet with dropdown
- ✅ Specify installation requirements
- ✅ Set budget range (optional)
- ✅ View all requests with status badges
- ✅ See offer count for each request
- ✅ Compare multiple offers side-by-side
- ✅ View provider ratings/reviews
- ✅ Accept/reject offers
- ✅ Delete open requests

### For Service Providers:
- ✅ Browse all open installation requests
- ✅ See vehicle details (make, model, year, registration)
- ✅ View owner requirements and budget
- ✅ Submit competitive offers
- ✅ Specify device details and pricing
- ✅ Track offer status (Pending/Accepted/Rejected)
- ✅ Manage offer pipeline
- ✅ Can't submit duplicate offers

## 🐛 Troubleshooting

**Migration fails:**
```powershell
# Check if PostgreSQL is running
# Check connection string in appsettings.json
# Ensure you have CREATE TABLE permissions
```

**"Service provider not found" error:**
- Ensure user has a ServiceProviderProfile
- Verify "Tracking" is in the serviceTypes field

**Can't see marketplace:**
- Check if logged in as service provider
- Verify "Tracking" is included in service types
- Check navigation menu configuration

**No vehicles in dropdown:**
- Ensure you have vehicles registered in your fleet
- Check vehicle service/API is working

## 📞 Support

For issues or questions:
1. Check `TRACKING_DEVICE_INSTALLATION_FEATURE.md` for detailed documentation
2. Review API responses in browser DevTools
3. Check backend logs for errors
4. Verify database tables were created successfully

## ✨ Next Steps (Optional Enhancements)

- [ ] Add email notifications when offers are received/accepted
- [ ] Integrate payment processing for device purchases
- [ ] Add installation scheduling calendar
- [ ] Implement review/rating system after installation
- [ ] Add photo upload for installation proof
- [ ] Create dashboard analytics for tracking companies
- [ ] Add search/filter functionality to marketplace
- [ ] Implement real-time notifications with SignalR

---

**Ready to go! 🚀** The complete tracking device installation marketplace is now implemented and ready to use.
