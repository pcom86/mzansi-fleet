# Quick Test Guide - Service Provider Forms

## 1. Start the Application

### Backend (Terminal 1):
```powershell
cd backend/MzansiFleet.Api
dotnet run
```

### Frontend (Terminal 2):
```powershell
cd frontend
npm start
# or
ng serve
```

## 2. Test the Fixed Form Controls

### Option A: Admin Form (Existing Providers Management)
**URL**: http://localhost:4200/service-providers/new

**What to Check**:
- ✅ All input fields display correctly
- ✅ Material design styling is applied
- ✅ Dropdowns work for service types and vehicle categories
- ✅ Save button functions properly

### Option B: Public Registration Form (New Service Providers)
**URL**: http://localhost:4200/service-provider-registration

**What to Check**:
- ✅ Email and password fields work
- ✅ Password visibility toggle works
- ✅ All business information fields display
- ✅ Multi-select dropdowns work
- ✅ Form validation works
- ✅ Submit creates new account and profile

## 3. Sample Test Data

```json
{
  "email": "test@autoshop.com",
  "password": "Test123!",
  "phone": "+27 11 123 4567",
  "businessName": "Test Auto Repairs",
  "registrationNumber": "REG123456",
  "contactPerson": "John Smith",
  "address": "123 Main St, Johannesburg",
  "serviceTypes": ["Mechanical", "Electrical"],
  "vehicleCategories": ["Sedan", "SUV", "Truck"],
  "operatingHours": "Mon-Fri: 8AM-5PM",
  "hourlyRate": 350.00,
  "callOutFee": 500.00,
  "serviceRadiusKm": 50
}
```

## 4. Common Issues and Solutions

### Issue: Form controls not displaying
**Solution**: ✅ Fixed! Changed `<mat-input>` to `<input matInput>`

### Issue: Dropdowns not working
**Check**: 
- Material modules are imported
- `MatSelectModule` is in the imports array

### Issue: Submit button disabled
**Check**:
- All required fields are filled
- Form validation passes
- `registrationForm.valid` is true

### Issue: Backend connection error
**Check**:
- Backend is running on port 5000
- CORS is enabled
- Database connection is working

## 5. Verify Backend API

Test the registration endpoint directly:
```powershell
cd backend
.\test-register-service-provider.ps1
```

Expected output:
- ✅ Tenant obtained/created
- ✅ Service provider registered
- ✅ Login tested

## 6. Browser Console Checks

Open browser DevTools (F12) and check:
1. **Console Tab**: No errors should appear
2. **Network Tab**: 
   - POST request to `/api/Identity/register-service-provider` returns 200
   - Response includes `profileId` and `userId`
3. **Application Tab**: 
   - Token stored after login
   - User info stored in localStorage

## 7. Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Form fields empty/missing | Clear browser cache, refresh page |
| Material styles not applied | Check `material-theme.scss` is loaded |
| Submit fails silently | Check browser console for errors |
| CORS error | Verify backend CORS settings in Program.cs |
| 409 Conflict error | Email already exists, use different email |

## 8. Success Indicators

### Form Successfully Fixed:
- ✅ Input fields visible with Material styling
- ✅ Labels float when fields are focused
- ✅ Validation messages display
- ✅ Submit button responds

### Registration Successful:
- ✅ Success message appears
- ✅ Redirect to login page
- ✅ Can log in with new credentials
- ✅ Service provider dashboard accessible

## Need Help?

Check documentation:
- [SERVICE_PROVIDER_FORM_FIX.md](SERVICE_PROVIDER_FORM_FIX.md)
- [SERVICE_PROVIDER_REGISTRATION_DOCUMENTATION.md](SERVICE_PROVIDER_REGISTRATION_DOCUMENTATION.md)
