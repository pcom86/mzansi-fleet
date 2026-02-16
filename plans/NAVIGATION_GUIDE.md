# Navigation Guide - Service Provider Forms

## How to Access the Service Provider Forms

### 📍 From Login Page (Public Access)

**URL**: http://localhost:4200/login

The login page now has a **"Register as Service Provider"** button:

```
┌─────────────────────────────────┐
│         Mzansi Fleet            │
│    Fleet Management System      │
│                                 │
│  Email: [_____________]         │
│  Password: [_____________]      │
│  [        Login        ]        │
│                                 │
│  Don't have an account?         │
│  [Register as Owner/Staff]      │ ← Existing
│  [Join as Driver]               │ ← Existing  
│  [Register as Service Provider] │ ← NEW!
└─────────────────────────────────┘
```

**Steps**:
1. Go to http://localhost:4200/login
2. Click **"Register as Service Provider"** button (blue button at bottom)
3. Fill in the registration form
4. Submit to create your account

---

### 📍 From Main Navigation (Admin/Staff Access)

**After logging in**, the main navigation menu includes:

```
Dashboard | Drivers | Vehicles | Trips | Service Providers | Identity
                                              ↑
                                            NEW!
```

**Steps**:
1. Log in with admin/staff credentials
2. Click **"Service Providers"** in the navigation menu
3. Click **"Add Service Provider"** button
4. Fill in the form

---

## Direct URLs

### Public Registration Form
```
http://localhost:4200/service-provider-registration
```
- For new service providers to self-register
- Creates user account + profile
- No login required

### Admin Management Form (New Provider)
```
http://localhost:4200/service-providers/new
```
- For admin/staff to add service providers
- Requires authentication
- No account creation

### Admin Management List
```
http://localhost:4200/service-providers
```
- View all service providers
- Edit existing providers
- Requires authentication

### Edit Existing Provider
```
http://localhost:4200/service-providers/{id}/edit
```
- Replace `{id}` with the provider's ID
- Requires authentication

---

## Visual Navigation Map

```
┌─────────────────────────────────────────────────┐
│                  Login Page                     │
│  http://localhost:4200/login                    │
└──────────────┬──────────────────────────────────┘
               │
               ├─► [Register as Service Provider]
               │    └─► http://localhost:4200/service-provider-registration
               │        ✓ No login required
               │        ✓ Creates account
               │        ✓ Public access
               │
               └─► [Login] ──► Dashboard
                                    │
                                    ├─► Click "Service Providers" menu
                                    │    └─► http://localhost:4200/service-providers
                                    │         └─► Click "Add Service Provider"
                                    │              └─► /service-providers/new
                                    │                   ✓ Admin form
                                    │                   ✓ No account creation
                                    │
                                    └─► Direct URL access
                                         • /service-provider-registration (public)
                                         • /service-providers (list)
                                         • /service-providers/new (add)
                                         • /service-providers/{id}/edit
```

---

## Quick Reference

| What You Want | Where to Go | URL |
|--------------|-------------|-----|
| Register new service provider (public) | Login page → Register button | `/service-provider-registration` |
| Manage existing providers (admin) | Main menu → Service Providers | `/service-providers` |
| Add provider (admin) | Service Providers page → Add button | `/service-providers/new` |
| Edit provider (admin) | Service Providers list → Edit icon | `/service-providers/{id}/edit` |

---

## Testing Navigation

### Test Public Registration
```bash
# 1. Start the app
cd frontend
npm start

# 2. Open browser to:
http://localhost:4200/login

# 3. Look for the blue button:
"Register as Service Provider"

# 4. Or directly:
http://localhost:4200/service-provider-registration
```

### Test Admin Navigation
```bash
# 1. Log in as admin/staff
http://localhost:4200/login
Email: admin@example.com
Password: [your password]

# 2. Check top navigation bar for:
Service Providers

# 3. Click to view list, then "Add Service Provider"
```

---

## Troubleshooting Navigation

### Issue: "Register as Service Provider" button not visible
**Solution**: 
- Clear browser cache
- Refresh page (Ctrl+F5)
- Check you're on the login page, not already logged in

### Issue: "Service Providers" not in navigation menu
**Solution**:
- Make sure you're logged in
- Verify you're not on a public page (login, registration)
- Check user role has appropriate permissions

### Issue: Form controls not loading
**Solution**: 
- ✅ Already fixed! Controls use proper Material directives
- Clear browser cache if still seeing issues
- Check browser console for errors

---

## Mobile/Responsive Access

On mobile devices:
- Login page buttons stack vertically
- All three registration options are visible
- Forms are mobile-responsive
- Easy thumb access to buttons

---

## Next Steps After Registration

After registering as a service provider:
1. ✅ Account created automatically
2. ✅ Redirected to login page
3. ✅ Log in with your email/password
4. ✅ Access service provider dashboard

After admin adds a provider:
1. ✅ Provider added to system
2. ✅ Visible in providers list
3. ✅ Can be assigned to maintenance requests
4. ✅ Contact information available to fleet managers

---

## Related Documentation

- [SERVICE_PROVIDER_FORM_FIX.md](SERVICE_PROVIDER_FORM_FIX.md) - Technical fix details
- [SERVICE_PROVIDER_REGISTRATION_DOCUMENTATION.md](SERVICE_PROVIDER_REGISTRATION_DOCUMENTATION.md) - Backend API docs
- [QUICK_TEST_GUIDE.md](QUICK_TEST_GUIDE.md) - Testing instructions
