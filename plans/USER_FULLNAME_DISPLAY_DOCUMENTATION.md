# User Full Name and Role Display Feature

## Overview
This feature displays the logged-in user's full name and role in the dashboard toolbar/header after successful login across all user types (Owner, Driver, ServiceProvider, TaxiRankAdmin, TaxiMarshal).

## Changes Made

### Backend Changes

#### 1. LoginResponseDto (IdentityDtos.cs)
**File**: `backend/MzansiFleet.Domain/DTOs/IdentityDtos.cs`

Added `FullName` property to the login response:
```csharp
public class LoginResponseDto
{
    public string Token { get; set; }
    public Guid UserId { get; set; }
    public string Email { get; set; }
    public string Role { get; set; }
    public Guid TenantId { get; set; }
    public DateTime ExpiresAt { get; set; }
    public string? FullName { get; set; }  // NEW
}
```

#### 2. LoginCommandHandler (AuthenticationHandlers.cs)
**File**: `backend/MzansiFleet.Application/Handlers/AuthenticationHandlers.cs`

Updated the login handler to fetch the user's full name from their respective profile table based on their role:

```csharp
// Get user's full name based on role
string fullName = null;
try
{
    if (user.Role == "Owner")
    {
        var ownerProfile = _context.Set<Domain.Entities.OwnerProfile>()
            .FirstOrDefault(o => o.UserId == user.Id);
        fullName = ownerProfile?.ContactName;
    }
    else if (user.Role == "Driver")
    {
        var driverProfile = _context.Set<Domain.Entities.DriverProfile>()
            .FirstOrDefault(d => d.UserId == user.Id);
        fullName = driverProfile?.Name;
    }
    else if (user.Role == "ServiceProvider")
    {
        var providerProfile = _context.Set<Domain.Entities.ServiceProviderProfile>()
            .FirstOrDefault(sp => sp.UserId == user.Id);
        fullName = providerProfile?.ContactPerson;
    }
    else if (user.Role == "TaxiRankAdmin")
    {
        var adminProfile = _context.Set<Domain.Entities.StaffProfile>()
            .FirstOrDefault(s => s.UserId == user.Id);
        fullName = adminProfile?.Name;
    }
    else if (user.Role == "TaxiMarshal")
    {
        var marshalProfile = _context.Set<Domain.Entities.TaxiMarshalProfile>()
            .FirstOrDefault(m => m.UserId == user.Id);
        fullName = marshalProfile?.FullName;
    }
}
catch { /* Ignore profile lookup errors */ }

return new LoginResponseDto
{
    // ...existing properties...
    FullName = fullName
};
```

**Profile Table Mapping**:
- **Owner** → `OwnerProfile.ContactName`
- **Driver** → `DriverProfile.Name`
- **ServiceProvider** → `ServiceProviderProfile.ContactPerson`
- **TaxiRankAdmin** → `StaffProfile.Name`
- **TaxiMarshal** → `TaxiMarshalProfile.FullName`

### Frontend Changes

#### 1. Auth Service Interfaces (auth.service.ts)
**File**: `frontend/src/app/services/auth.service.ts`

Updated both interfaces to include `fullName`:

```typescript
export interface LoginResponse {
  token: string;
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  expiresAt: string;
  fullName?: string;  // NEW
}

export interface UserInfo {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  fullName?: string;  // NEW
}
```

#### 2. Session Storage (auth.service.ts)
Updated `setSession()` method to store `fullName` in localStorage:

```typescript
private setSession(authResult: LoginResponse): void {
  localStorage.setItem('token', authResult.token);
  const userInfo: UserInfo = {
    userId: authResult.userId,
    email: authResult.email,
    role: authResult.role,
    tenantId: authResult.tenantId,
    fullName: authResult.fullName  // NEW
  };
  localStorage.setItem('user', JSON.stringify(userInfo));
  this.currentUserSubject.next(userInfo);
}
```

#### 3. Dashboard Components

Updated all dashboard components to display user full name and role:

##### Marshal Dashboard
**Files**: 
- `frontend/src/app/components/marshal-dashboard/marshal-dashboard.component.ts`
- `frontend/src/app/components/marshal-dashboard/marshal-dashboard.component.html`
- `frontend/src/app/components/marshal-dashboard/marshal-dashboard.component.scss`

**TypeScript**:
```typescript
export class MarshalDashboardComponent implements OnInit {
  userData: any;  // NEW
  
  ngOnInit(): void {
    const user = localStorage.getItem('user');
    if (user) {
      this.userData = JSON.parse(user);  // NEW
      this.loadMarshalProfile();
    }
  }
}
```

**HTML**:
```html
<mat-toolbar color="primary" class="dashboard-toolbar">
  <span>Marshal Dashboard</span>
  <span class="spacer"></span>
  <div class="user-info" *ngIf="userData">
    <span class="user-name">{{ userData.fullName || userData.email }}</span>
    <span class="user-role">{{ userData.role }}</span>
  </div>
  <button mat-icon-button (click)="logout()">
    <mat-icon>logout</mat-icon>
  </button>
</mat-toolbar>
```

**SCSS**:
```scss
.dashboard-toolbar {
  .user-info {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    margin-right: 16px;

    .user-name {
      font-weight: 500;
      font-size: 14px;
    }

    .user-role {
      font-size: 12px;
      opacity: 0.8;
    }
  }
}
```

##### Admin Dashboard
**Files**: 
- `frontend/src/app/components/admin-dashboard/admin-dashboard.component.ts`
- `frontend/src/app/components/admin-dashboard/admin-dashboard.component.html`
- `frontend/src/app/components/admin-dashboard/admin-dashboard.component.scss`

Similar pattern: Added `userData` property, load from localStorage in `ngOnInit()`, display in toolbar with same HTML/CSS structure.

##### Service Provider Dashboard
**File**: `frontend/src/app/components/service-providers/service-provider-dashboard.component.ts`

Added `userData` property and display in page header:
```typescript
export class ServiceProviderDashboardComponent implements OnInit {
  userData: any;  // NEW
  
  async ngOnInit(): Promise<void> {
    const user = localStorage.getItem('user');
    if (user) {
      this.userData = JSON.parse(user);  // NEW
    }
    await this.loadDashboardData();
  }
}
```

Template updated with user info display.

##### Driver Dashboard
**File**: `frontend/src/app/components/driver-dashboard/driver-dashboard.component.ts`

Similar changes with user info display in dashboard header.

##### Owner Dashboard
**File**: `frontend/src/app/components/owner-dashboard/owner-dashboard.component.ts`

Updated to display user full name and role in toolbar.

## Usage

After login, the user's full name and role are automatically displayed in the dashboard toolbar:

- **If full name exists**: Displays "John Doe (Owner)"
- **If full name is null**: Displays email address as fallback "user@example.com (Owner)"

## Testing

To test this feature:

1. **Login as Owner**:
   - Full name should come from `OwnerProfile.ContactName`
   - Should display in owner dashboard toolbar

2. **Login as Driver**:
   - Full name should come from `DriverProfile.Name`
   - Should display in driver dashboard header

3. **Login as Service Provider**:
   - Full name should come from `ServiceProviderProfile.ContactPerson`
   - Should display in service provider dashboard header

4. **Login as Taxi Rank Admin**:
   - Full name should come from `StaffProfile.Name`
   - Should display in admin dashboard toolbar

5. **Login as Taxi Marshal**:
   - Full name should come from `TaxiMarshalProfile.FullName`
   - Should display in marshal dashboard toolbar

## Fallback Behavior

- If no profile exists for the user, `fullName` will be `null`
- The UI displays email address as fallback when `fullName` is null
- Any errors during profile lookup are caught and ignored (fullName remains null)

## Files Modified

### Backend
1. `backend/MzansiFleet.Domain/DTOs/IdentityDtos.cs`
2. `backend/MzansiFleet.Application/Handlers/AuthenticationHandlers.cs`

### Frontend
1. `frontend/src/app/services/auth.service.ts`
2. `frontend/src/app/components/marshal-dashboard/marshal-dashboard.component.ts`
3. `frontend/src/app/components/marshal-dashboard/marshal-dashboard.component.html`
4. `frontend/src/app/components/marshal-dashboard/marshal-dashboard.component.scss`
5. `frontend/src/app/components/admin-dashboard/admin-dashboard.component.ts`
6. `frontend/src/app/components/admin-dashboard/admin-dashboard.component.html`
7. `frontend/src/app/components/admin-dashboard/admin-dashboard.component.scss`
8. `frontend/src/app/components/service-providers/service-provider-dashboard.component.ts`
9. `frontend/src/app/components/driver-dashboard/driver-dashboard.component.ts`
10. `frontend/src/app/components/owner-dashboard/owner-dashboard.component.ts`

## Future Enhancements

1. **TaxiRankAdmin Profile**: Currently uses `StaffProfile` - consider creating a dedicated `TaxiRankAdminProfile` table
2. **Profile Photos**: Add user profile photo display alongside name
3. **User Menu**: Add dropdown menu with profile settings, preferences
4. **Last Login Display**: Show last login timestamp
5. **Notification Badge**: Add notification count next to user info
