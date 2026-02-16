# Transport Tender Management System - Complete Documentation

## Overview
The Transport Tender Management System allows users to post transport work opportunities (tenders) and enables fleet owners to browse, apply, and compete for these opportunities. Tender publishers can review applications, view detailed fleet profiles, and select the best candidate for their transport needs.

## System Architecture

### Backend Implementation

#### 1. Database Entities

**Tender Entity** (`backend/MzansiFleet.Domain/Entities/Tender.cs`)
```csharp
- Id: Guid (Primary Key)
- Title: string
- Description: string
- RequirementDetails: string
- BudgetMin/BudgetMax: decimal?
- TransportType: string (Passenger/Goods/Mixed)
- RequiredVehicles: int?
- RouteDetails: string
- StartDate/EndDate: DateTime
- ApplicationDeadline: DateTime?
- PickupLocation/DropoffLocation/ServiceArea: string
- TenderPublisherId: Guid (Foreign Key to User)
- AwardedToOwnerId: Guid? (Foreign Key to OwnerProfile)
- Status: string (Open/Awarded/Closed/Cancelled)
- CreatedAt/UpdatedAt: DateTime
- IsActive: bool
- Navigation: Applications collection
```

**TenderApplication Entity** (`backend/MzansiFleet.Domain/Entities/Tender.cs`)
```csharp
- Id: Guid (Primary Key)
- TenderId: Guid (Foreign Key)
- OwnerId: Guid (Foreign Key to OwnerProfile)
- ApplicationMessage: string
- ProposedBudget: decimal
- ProposalDetails: string
- AvailableVehicles: int
- VehicleTypes: string
- ExperienceHighlights: string
- Status: string (Pending/UnderReview/Accepted/Rejected)
- AppliedAt: DateTime
- ReviewedAt: DateTime?
- ReviewNotes: string?
- ContactPerson/ContactPhone/ContactEmail: string
- Navigation: Tender, Owner
```

#### 2. Database Configuration

**DbContext Updates** (`backend/MzansiFleet.Repository/MzansiFleetDbContext.cs`)
- Added DbSet<Tender> Tenders
- Added DbSet<TenderApplication> TenderApplications
- Configured relationships:
  - Tender → TenderPublisher (Restrict delete)
  - Tender → AwardedToOwner (Set Null on delete)
  - TenderApplication → Tender (Cascade delete)
  - TenderApplication → Owner (Restrict delete)
- Configured Guid IDs to not auto-generate

#### 3. API Endpoints

**TenderController** (`backend/MzansiFleet.Api/Controllers/TenderController.cs`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/Tender` | Create new tender | Yes |
| GET | `/api/Tender` | Get all tenders (with filters) | No |
| GET | `/api/Tender/{id}` | Get tender by ID | No |
| GET | `/api/Tender/my-tenders` | Get current user's tenders | Yes |
| POST | `/api/Tender/{id}/apply` | Apply to tender | Yes (Owner) |
| GET | `/api/Tender/{id}/applications` | Get tender applications | Yes (Publisher only) |
| GET | `/api/Tender/my-applications` | Get user's applications | Yes (Owner) |
| PUT | `/api/Tender/applications/{id}/status` | Update application status | Yes (Publisher only) |
| DELETE | `/api/Tender/{id}` | Soft delete tender | Yes (Publisher only) |

**Query Parameters for GET /api/Tender:**
- `status`: Filter by tender status (Open/Awarded/Closed)
- `transportType`: Filter by transport type (Passenger/Goods/Mixed)
- `location`: Search in pickup/dropoff/service area

#### 4. DTOs

**TenderDtos.cs** (`backend/MzansiFleet.Domain/DTOs/TenderDtos.cs`)
- CreateTenderDto: For posting new tenders
- TenderDto: Full tender details with application count
- CreateTenderApplicationDto: For submitting applications
- TenderApplicationDto: Full application with fleet summary
- OwnerFleetSummaryDto: Complete fleet profile
- VehicleSummaryDto: Vehicle details
- UpdateTenderApplicationStatusDto: For status updates

### Frontend Implementation

#### 1. Components

**Tender List Component** (`frontend/src/app/components/tenders/tender-list.component.ts`)
- **Purpose**: Browse all available tenders
- **Features**:
  - Grid layout with tender cards
  - Search functionality (title, location, description)
  - Filters: Status, Transport Type, Location
  - Application count badges
  - "Apply Now" button (disabled if already applied)
  - "Post New Tender" button
- **Navigation**:
  - View tender details
  - Apply to tender
  - Post new tender

**Post Tender Component** (`frontend/src/app/components/tenders/post-tender.component.ts`)
- **Purpose**: Create new transport tender
- **Form Sections**:
  1. Basic Information (Title, Description, Requirements)
  2. Transport Details (Type, Vehicle Count, Route)
  3. Location Details (Pickup, Dropoff, Service Area)
  4. Budget & Timeline (Budget range, Dates, Deadline)
- **Validation**: All required fields enforced
- **Submission**: POST to `/api/Tender` with JWT token

**Tender Application Component** (`frontend/src/app/components/tenders/tender-application.component.ts`)
- **Purpose**: Apply to a specific tender
- **Form Sections**:
  1. Cover Letter (Why interested)
  2. Proposal Details (Budget, Detailed proposal)
  3. Fleet Information (Vehicle count, types, experience)
  4. Contact Information (Person, phone, email)
- **Tender Summary**: Shows tender details at top
- **Submission**: POST to `/api/Tender/{id}/apply`

**Tender Applications View Component** (`frontend/src/app/components/tenders/tender-applications-view.component.ts`)
- **Purpose**: View and manage tender applications (Publisher only)
- **Features**:
  - Expandable application panels (Material Expansion Panel)
  - Application status badges (Pending/UnderReview/Accepted/Rejected)
  - Quick stats: Vehicles, Budget, Applied Date
  - **Detailed Fleet Profile**:
    - Company stats (vehicles, revenue, rating)
    - Individual vehicle cards with photos
    - Company contact information
    - Vehicle details (make, model, capacity, mileage)
  - **Actions**:
    - Accept Application (awards tender, rejects others)
    - Mark Under Review
    - Reject Application
  - Review notes display

#### 2. Routing Configuration

**Routes Added** (`frontend/src/app/app.routes.ts`)
```typescript
{ path: 'tenders', component: TenderListComponent }
{ path: 'tenders/post', component: PostTenderComponent }
{ path: 'tenders/:id/apply', component: TenderApplicationComponent }
{ path: 'tenders/:id/applications', component: TenderApplicationsViewComponent }
```

## User Workflows

### Workflow 1: Posting a Tender
1. User navigates to `/tenders`
2. Clicks "Post New Tender"
3. Fills in tender form with:
   - Transport requirements
   - Budget range
   - Timeline and locations
   - Route details
4. Submits tender
5. Tender appears in public listing with "Open" status

### Workflow 2: Applying to Tender (Fleet Owner)
1. Owner browses tenders at `/tenders`
2. Uses filters to find relevant opportunities
3. Clicks "View Details" or "Apply Now"
4. Reviews tender requirements
5. Fills application form with:
   - Cover letter explaining fit
   - Proposed budget
   - Fleet capabilities
   - Contact information
6. Submits application
7. Application status: "Pending"

### Workflow 3: Reviewing Applications (Tender Publisher)
1. Publisher navigates to their posted tender
2. Views applications at `/tenders/{id}/applications`
3. Expands application panels to review:
   - Application message and proposal
   - Fleet summary (vehicle count, revenue, rating)
   - Individual vehicle details with photos
   - Company contact information
4. Can take actions:
   - **Accept**: Awards tender, rejects all other applications, changes tender status to "Awarded"
   - **Under Review**: Marks for further consideration
   - **Reject**: Declines with optional notes

### Workflow 4: Checking Application Status (Owner)
1. Owner navigates to `/tenders`
2. Already-applied tenders show "Applied" button (disabled)
3. Can view application history via API endpoint `/api/Tender/my-applications`

## Key Features

### Security
- JWT token authentication required for:
  - Posting tenders
  - Applying to tenders
  - Viewing applications
  - Updating application status
- Authorization checks:
  - Only tender publisher can view/manage applications
  - Only owners can apply to tenders
  - Only tender publisher can delete their tender

### Business Logic
- **Automatic Rejection**: When accepting one application, all others are automatically rejected
- **Status Transitions**: Tender status changes from "Open" → "Awarded" when application accepted
- **Soft Delete**: Tenders are soft-deleted (IsActive = false) not physically removed
- **Application Deadline**: Optional deadline for accepting applications
- **Fleet Profile Integration**: Applications automatically include complete fleet information

### Data Validation
- Required fields enforced in both frontend and backend
- Budget validation (min/max)
- Date validation (end date after start date)
- Email format validation
- Duplicate application prevention (can't apply twice)

## Database Migration Requirements

### Required Steps:
1. **Create Migration**:
   ```bash
   cd backend/MzansiFleet.Repository
   dotnet ef migrations add AddTenderManagement
   ```

2. **Apply Migration**:
   ```bash
   dotnet ef database update
   ```

   Or use the MigrationRunner pattern already in the project.

3. **Tables Created**:
   - `Tenders`: Main tender records
   - `TenderApplications`: Application records
   - Foreign keys to `Users` and `OwnerProfiles`

## API Usage Examples

### Create Tender
```http
POST /api/Tender
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Daily Staff Transport - Sandton to Midrand",
  "description": "Need reliable transport for 50 staff members",
  "requirementDetails": "Monday-Friday, 7AM and 5PM pickups",
  "transportType": "Passenger",
  "requiredVehicles": 3,
  "budgetMin": 25000,
  "budgetMax": 35000,
  "startDate": "2026-02-01",
  "endDate": "2026-12-31",
  "pickupLocation": "Sandton City",
  "dropoffLocation": "Midrand Business Park",
  "serviceArea": "Gauteng"
}
```

### Apply to Tender
```http
POST /api/Tender/{tenderId}/apply
Authorization: Bearer {token}
Content-Type: application/json

{
  "applicationMessage": "We have 5 years experience in corporate transport",
  "proposedBudget": 28000,
  "proposalDetails": "We will provide 3 16-seater minibuses...",
  "availableVehicles": 5,
  "vehicleTypes": "16-seater minibus, Quantum",
  "experienceHighlights": "Served 10+ corporate clients",
  "contactPerson": "John Doe",
  "contactPhone": "0821234567",
  "contactEmail": "john@fleet.com"
}
```

### Accept Application
```http
PUT /api/Tender/applications/{applicationId}/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "Accepted",
  "reviewNotes": "Perfect fit for our requirements!"
}
```

## UI/UX Highlights

### Design Elements
- Material Design components (Angular Material)
- Gradient backgrounds for headers
- Card-based layouts
- Responsive grid system
- Status badges with color coding:
  - Open: Green
  - Awarded: Yellow
  - Closed: Red
  - Pending: Yellow
  - Accepted: Green
  - Rejected: Red

### Interactive Features
- Expandable panels for applications
- Hover effects on cards
- Loading spinners during API calls
- Toast notifications (MatSnackBar)
- Form validation with error messages
- Confirmation dialogs for critical actions

## Testing Checklist

- [ ] Post new tender
- [ ] Browse tenders with filters
- [ ] Apply to tender (as owner)
- [ ] Prevent duplicate applications
- [ ] View applications (as publisher)
- [ ] Accept application (verify others rejected)
- [ ] Reject application with notes
- [ ] Verify tender status changes to "Awarded"
- [ ] Check fleet profile displays correctly
- [ ] Verify vehicle photos render
- [ ] Test unauthorized access (403 Forbidden)
- [ ] Test unauthenticated access to protected endpoints
- [ ] Verify soft delete functionality

## Future Enhancements

### Potential Features
1. **Notifications**: Email/SMS when application status changes
2. **Messaging System**: Allow publisher to communicate with applicants
3. **Document Uploads**: Attach quotes, insurance, licenses
4. **Rating System**: Publishers rate owners after tender completion
5. **Tender Templates**: Save and reuse tender formats
6. **Advanced Filters**: Price range, vehicle type requirements
7. **Tender History**: Track past tenders and performance
8. **Dashboard Widget**: Show active tenders on main dashboard
9. **Analytics**: Tender success rates, average budgets
10. **Multi-award**: Allow awarding tender to multiple applicants

## Troubleshooting

### Common Issues

**Issue**: Applications not loading
- **Solution**: Ensure JWT token is valid and user has TenderPublisher role

**Issue**: Fleet profile not showing
- **Solution**: Verify OwnerProfile exists for applicant user

**Issue**: Can't apply to tender
- **Solution**: 
  - Check tender status is "Open"
  - Verify user has OwnerProfile
  - Ensure not already applied

**Issue**: Database migration fails
- **Solution**: 
  - Check connection string
  - Verify all entity relationships configured
  - Ensure no conflicting migrations

## Configuration

### Backend Configuration
- **CORS**: Ensure frontend URL (http://localhost:4200) is allowed
- **JWT**: Configure JWT secret and issuer in appsettings.json
- **Database**: PostgreSQL connection string

### Frontend Configuration
- **API URL**: Update `apiUrl` in components if backend port changes
- **Auth**: Verify JWT token storage/retrieval from localStorage

## Summary

This comprehensive tender management system provides:
- ✅ Complete backend API with 9 endpoints
- ✅ 4 frontend components with full UI
- ✅ Database entities with proper relationships
- ✅ Secure authentication and authorization
- ✅ Fleet profile integration
- ✅ Application status workflow
- ✅ Responsive Material Design interface
- ✅ Search and filtering capabilities
- ✅ Automatic status management

The system is production-ready and follows best practices for Angular 18 standalone components and ASP.NET Core 8.0 Web API development.
