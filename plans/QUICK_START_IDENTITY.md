# Quick Start Guide - Identity Module

## Running the Application

### 1. Start the Backend API (if not already running)
```powershell
cd "c:\Users\pmaseko\mzansi fleet\backend\MzansiFleet.Api"
dotnet run --urls "http://localhost:5000"
```

The API should be accessible at: http://localhost:5000
Swagger UI at: http://localhost:5000/swagger

### 2. Start the Frontend Application
```powershell
cd "c:\Users\pmaseko\mzansi fleet\frontend"
npm install  # Only needed first time or after package changes
npm start
```

The Angular app will start at: http://localhost:4200

### 3. Access the Identity Module

Open your browser and navigate to:
- **Identity Home**: http://localhost:4200/identity
- **Tenants**: http://localhost:4200/identity/tenants
- **Users**: http://localhost:4200/identity/users
- **Owner Profiles**: http://localhost:4200/identity/owner-profiles

## Testing the Components

### Test Tenants
1. Navigate to http://localhost:4200/identity/tenants
2. Click "Add Tenant"
3. Fill in:
   - Name: "Test Fleet Company"
   - Contact Email: "contact@testfleet.com"
   - Contact Phone: "+27 11 123 4567"
4. Click "Save"
5. Click "Edit" to modify
6. Click on the tenant row to view details

### Test Users
1. Navigate to http://localhost:4200/identity/users
2. Click "Add User"
3. Fill in:
   - Email: "driver@testfleet.com"
   - Phone: "+27 82 555 1234"
   - Role: Select "Driver"
   - Active: Check the box
4. Click "Save"
5. Click "Edit" to modify
6. Click on the user row to view details

### Test Owner Profiles
1. Navigate to http://localhost:4200/identity/owner-profiles
2. Click "Add Owner Profile"
3. Fill in:
   - User ID: (Copy a user ID from the Users page)
   - Company Name: "ABC Transport Ltd"
   - Contact Name: "John Doe"
   - Contact Email: "john@abctransport.com"
   - Contact Phone: "+27 11 987 6543"
   - Address: "123 Main Street, Johannesburg, 2000"
4. Click "Save"
5. Click "Edit" to modify
6. Click on the profile row to view details

## Features to Test

### CRUD Operations
- ✅ **Create**: Add new records using the forms
- ✅ **Read**: View lists and individual details
- ✅ **Update**: Edit existing records
- ✅ **Delete**: Remove records (with confirmation)

### UI Features
- ✅ **Navigation**: Switch between Tenants, Users, and Owner Profiles
- ✅ **Forms**: Toggle forms on/off with "Add" button
- ✅ **Validation**: Try submitting empty forms
- ✅ **Loading States**: Watch for "Loading..." messages
- ✅ **Error Handling**: Test with API disconnected
- ✅ **Empty States**: View pages with no data

## Troubleshooting

### Backend Not Running
**Error**: "Failed to load [entity]: Http failure..."
**Solution**: Make sure the backend API is running on port 5000

### CORS Issues
**Error**: "Access to XMLHttpRequest has been blocked by CORS policy"
**Solution**: Ensure the backend has CORS configured for http://localhost:4200

### Port Already in Use
**Error**: "Port 4200 is already in use"
**Solution**: Either stop the other process or run on a different port:
```powershell
ng serve --port 4201
```

### Module Not Found
**Error**: "Cannot find module..."
**Solution**: Run `npm install` in the frontend directory

## API Verification

Test the API directly using Swagger:
1. Navigate to http://localhost:5000/swagger
2. Expand the "Identity" section
3. Try the endpoints:
   - GET /api/Identity/tenants
   - POST /api/Identity/tenants
   - GET /api/Identity/users
   - etc.

## Component URLs

| Component | URL |
|-----------|-----|
| Identity Home | http://localhost:4200/identity |
| Tenants List | http://localhost:4200/identity/tenants |
| Tenant Detail | http://localhost:4200/identity/tenants/:id |
| Users List | http://localhost:4200/identity/users |
| User Detail | http://localhost:4200/identity/users/:id |
| Owner Profiles List | http://localhost:4200/identity/owner-profiles |
| Owner Profile Detail | http://localhost:4200/identity/owner-profiles/:id |

## Browser Console

Open browser developer tools (F12) to:
- View network requests to the API
- Check for any JavaScript errors
- Monitor HTTP responses

## Next Steps

After testing the Identity module:
1. Integrate with authentication/authorization
2. Add user profile pictures
3. Implement search and filtering
4. Add pagination for large datasets
5. Create dashboard widgets
6. Add audit logging
7. Implement bulk operations

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify the backend API is running and accessible
3. Check the [README.md](frontend/src/app/components/identity/README.md) for detailed documentation
4. Review the API responses in Swagger UI
5. Ensure environment.ts has the correct API URL

## Success Indicators

✅ No console errors
✅ Data loads in tables
✅ Forms submit successfully
✅ Edit and delete operations work
✅ Navigation works smoothly
✅ Detail pages display correctly
✅ Loading and error states appear appropriately
