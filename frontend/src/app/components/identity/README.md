# Identity Module - MzansiFleet Frontend

This module provides complete Identity management functionality for the MzansiFleet application, including Tenants, Users, and Owner Profiles management.

## Components Overview

### 1. Tenants Management
- **TenantsComponent** (`/identity/tenants`)
  - List all tenants
  - Create new tenant
  - Edit existing tenant
  - Delete tenant
  
- **TenantDetailComponent** (`/identity/tenants/:id`)
  - View tenant details
  - Display associated users
  - View tenant information

### 2. Users Management
- **UsersComponent** (`/identity/users`)
  - List all users
  - Create new user
  - Edit existing user
  - Delete user
  - Manage user roles and status
  
- **UserDetailComponent** (`/identity/users/:id`)
  - View user details
  - Display associated tenant information
  - View user status and role

### 3. Owner Profiles Management
- **OwnerProfilesComponent** (`/identity/owner-profiles`)
  - List all owner profiles
  - Create new owner profile
  - Edit existing owner profile
  - Delete owner profile
  
- **OwnerProfileDetailComponent** (`/identity/owner-profiles/:id`)
  - View owner profile details
  - Display associated user information
  - View company and contact details

### 4. Identity Module Container
- **IdentityComponent** (`/identity`)
  - Main container for Identity module
  - Navigation between Tenants, Users, and Owner Profiles
  - Consistent layout and styling

## API Integration

All components use the `IdentityService` which connects to the following API endpoints:

### Tenants
- `GET /api/Identity/tenants` - Get all tenants
- `GET /api/Identity/tenants/:id` - Get tenant by ID
- `POST /api/Identity/tenants` - Create tenant
- `PUT /api/Identity/tenants/:id` - Update tenant
- `DELETE /api/Identity/tenants/:id` - Delete tenant

### Users
- `GET /api/Identity/users` - Get all users
- `GET /api/Identity/users/:id` - Get user by ID
- `POST /api/Identity/users` - Create user
- `PUT /api/Identity/users/:id` - Update user
- `DELETE /api/Identity/users/:id` - Delete user

### Owner Profiles
- `GET /api/Identity/ownerprofiles` - Get all owner profiles
- `GET /api/Identity/ownerprofiles/:id` - Get owner profile by ID
- `POST /api/Identity/ownerprofiles` - Create owner profile
- `PUT /api/Identity/ownerprofiles/:id` - Update owner profile
- `DELETE /api/Identity/ownerprofiles/:id` - Delete owner profile

## Models

### Tenant
```typescript
interface Tenant {
  id: string;
  name?: string;
  contactEmail?: string;
  contactPhone?: string;
  users?: User[];
}
```

### User
```typescript
interface User {
  id: string;
  tenantId: string;
  email?: string;
  phone?: string;
  passwordHash?: string;
  role?: string;
  isActive: boolean;
  tenant?: Tenant;
}
```

### OwnerProfile
```typescript
interface OwnerProfile {
  id: string;
  userId: string;
  companyName?: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  user?: User;
}
```

## Routing Structure

```
/identity
  ├── /tenants              - List all tenants
  │   └── /:id              - Tenant details
  ├── /users                - List all users
  │   └── /:id              - User details
  └── /owner-profiles       - List all owner profiles
      └── /:id              - Owner profile details
```

## Features

### Common Features (All Components)
- ✅ CRUD operations (Create, Read, Update, Delete)
- ✅ Form validation
- ✅ Error handling and display
- ✅ Loading states
- ✅ Responsive design
- ✅ Inline editing
- ✅ Confirmation dialogs for delete operations

### Tenant-Specific Features
- View all users associated with a tenant
- Manage tenant contact information

### User-Specific Features
- Role-based user management (Admin, Driver, Owner, Passenger, Staff)
- Active/Inactive status toggle
- View associated tenant information

### Owner Profile-Specific Features
- Company and contact information management
- Address management
- Link to user account

## Usage

### Accessing the Identity Module
Navigate to `/identity` in your application to access the Identity management interface.

### Creating a New Tenant
1. Go to `/identity/tenants`
2. Click "Add Tenant" button
3. Fill in the form with tenant information
4. Click "Save"

### Creating a New User
1. Go to `/identity/users`
2. Click "Add User" button
3. Fill in the form with user information
4. Select a role from the dropdown
5. Toggle active status if needed
6. Click "Save"

### Creating a New Owner Profile
1. Go to `/identity/owner-profiles`
2. Click "Add Owner Profile" button
3. Enter the User ID for the associated user
4. Fill in company and contact information
5. Click "Save"

## Configuration

### Environment Setup
Make sure your `environment.ts` file has the correct API URL:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000/api'
};
```

### HttpClient Configuration
The `HttpClient` is configured in `app.config.ts` with `provideHttpClient()`.

## Styling

All components use consistent styling with:
- Clean, modern card-based layouts
- Responsive tables
- Color-coded buttons and badges
- Smooth transitions and hover effects
- Form validation indicators
- Error and loading states

## Dependencies

- **@angular/core** (v17+)
- **@angular/common**
- **@angular/forms**
- **@angular/router**
- **rxjs**

## File Structure

```
src/app/
├── components/
│   ├── identity/
│   │   ├── identity.component.ts
│   │   ├── identity.routes.ts
│   │   └── index.ts
│   ├── tenants/
│   │   ├── tenants.component.ts
│   │   ├── tenant-detail.component.ts
│   │   └── index.ts
│   ├── users/
│   │   ├── users.component.ts
│   │   ├── user-detail.component.ts
│   │   └── index.ts
│   └── owner-profiles/
│       ├── owner-profiles.component.ts
│       ├── owner-profile-detail.component.ts
│       └── index.ts
├── models/
│   ├── tenant.model.ts
│   ├── user.model.ts
│   └── owner-profile.model.ts
└── services/
    └── identity.service.ts
```

## Future Enhancements

Potential improvements for the Identity module:
- [ ] Search and filter functionality
- [ ] Pagination for large datasets
- [ ] Bulk operations (import/export)
- [ ] Advanced user permissions management
- [ ] Audit log integration
- [ ] Profile picture upload
- [ ] Email verification
- [ ] Password reset functionality
- [ ] Multi-tenant switching
- [ ] Activity history tracking

## Support

For issues or questions regarding the Identity module, please refer to the main project documentation or contact the development team.
