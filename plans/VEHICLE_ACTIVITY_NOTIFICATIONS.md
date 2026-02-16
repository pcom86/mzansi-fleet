# Vehicle Activity Notifications System

## Overview
Automatic notification system that sends messages to vehicle owners when activities occur against their vehicles, including maintenance events and financial transactions.

## Features Implemented

### 1. Notification Service
**File:** `backend/MzansiFleet.Application/Services/VehicleNotificationService.cs`

The service handles automatic message delivery to vehicle owners for:
- Maintenance requests
- Maintenance scheduling
- Maintenance completion
- Vehicle expenses
- Vehicle earnings

### 2. Notification Types

#### Maintenance Notifications

**a) Maintenance Requested**
- Triggered when: A new maintenance request is created with status "Pending" or "Requested"
- Message includes: Vehicle registration, maintenance type, description
- Example: "A new maintenance request has been submitted for your vehicle ABC123GP."

**b) Maintenance Scheduled**
- Triggered when: Maintenance status changes to "Scheduled" or is created with scheduled date
- Message includes: Vehicle registration, maintenance type, scheduled date/time
- Example: "Maintenance has been scheduled for your vehicle ABC123GP. Scheduled Date: 2026-01-25 09:00"

**c) Maintenance Completed**
- Triggered when: Maintenance status changes to "Completed" or is created as completed
- Message includes: Vehicle registration, maintenance type, cost, completion date
- Example: "Maintenance has been completed for your vehicle ABC123GP. Cost: R1,500.00"

#### Financial Notifications

**a) Expense Recorded**
- Triggered when: A new expense is added to a vehicle
- Message includes: Vehicle registration, category, amount, date, description
- Example: "A new expense has been recorded for your vehicle ABC123GP. Category: Fuel, Amount: R850.00"

**b) Earning Recorded**
- Triggered when: A new earning is recorded for a vehicle
- Message includes: Vehicle registration, source, amount, date, description
- Example: "A new earning has been recorded for your vehicle ABC123GP. Source: Trip, Amount: R2,450.00"

### 3. Technical Implementation

#### Backend Integration

**Controllers Updated:**
1. **MaintenanceHistoryController** (`backend/MzansiFleet.Api/Controllers/MaintenanceHistoryController.cs`)
   - Injects `VehicleNotificationService`
   - Sends notifications on Create and Update operations
   - Detects status changes to trigger appropriate notifications

2. **VehicleExpensesController** (`backend/MzansiFleet.Api/Controllers/VehicleExpensesController.cs`)
   - Injects `VehicleNotificationService`
   - Sends expense notifications when expenses are created

3. **VehicleEarningsController** (`backend/MzansiFleet.Api/Controllers/VehicleEarningsController.cs`)
   - Injects `VehicleNotificationService`
   - Sends earning notifications when earnings are recorded

#### Dependency Injection
**File:** `backend/MzansiFleet.Api/Startup.cs`
```csharp
services.AddScoped<VehicleNotificationService>();
```

### 4. Message Metadata
All notifications include:
- `RelatedEntityType`: "Vehicle"
- `RelatedEntityId`: Vehicle GUID
- This allows for future filtering and linking in the UI

### 5. Owner Resolution
The system automatically:
1. Retrieves vehicle by ID
2. Finds owner using `Vehicle.TenantId` → `OwnerProfile.Id` mapping
3. Gets owner's `UserId` to send the message
4. Creates message with system as sender (SenderId = Guid.Empty)

### 6. Error Handling
- Notification failures are logged but don't fail the main operations
- Ensures financial/maintenance transactions always complete successfully
- Uses try-catch to prevent notification issues from affecting core functionality

## Usage

### For Developers

**Adding new notification types:**
1. Add method to `VehicleNotificationService`
2. Call the method from appropriate controller/handler
3. Follow the existing pattern for message formatting

**Example:**
```csharp
public async Task NotifyNewEventType(Guid vehicleId, string eventDetails)
{
    var vehicle = await _context.Vehicles.FindAsync(vehicleId);
    var subject = $"Event: {vehicle?.Registration ?? "Unknown Vehicle"}";
    var body = $"Event details for {vehicle?.Registration}...\n\n{eventDetails}";
    
    await SendMessageToOwner(vehicleId, subject, body);
}
```

### For End Users

**Vehicle owners automatically receive messages when:**
- A maintenance request is submitted for their vehicle
- Maintenance is scheduled or completed
- Expenses are logged against their vehicle
- Earnings are recorded for their vehicle

**Accessing notifications:**
- Click the messages icon (with badge count) on any dashboard
- View all messages in the inbox
- Messages are marked as read when opened
- Messages link back to the related vehicle (future enhancement)

## Database Schema

### Messages Table
Already exists with fields:
- `Id`: Unique identifier
- `SenderId`: User who sent (Guid.Empty for system messages)
- `ReceiverId`: Owner's UserId
- `Subject`: Notification title
- `Content`: Detailed message content
- `CreatedAt`: Timestamp
- `IsRead`: Read status
- `RelatedEntityType`: "Vehicle"
- `RelatedEntityId`: Vehicle GUID
- `IsDeletedBySender`, `IsDeletedByReceiver`: Soft delete support

## Testing

### Manual Testing Steps

1. **Test Maintenance Request Notification:**
   ```
   POST /api/MaintenanceHistory
   {
     "vehicleId": "<vehicle-guid>",
     "maintenanceType": "Oil Change",
     "description": "Regular service",
     "status": "Requested"
   }
   ```
   - Verify owner receives message with maintenance details

2. **Test Maintenance Scheduled Notification:**
   ```
   PUT /api/MaintenanceHistory/{id}
   {
     "status": "Scheduled",
     "scheduledDate": "2026-01-25T09:00:00Z"
   }
   ```
   - Verify owner receives scheduling confirmation

3. **Test Maintenance Completed Notification:**
   ```
   PUT /api/MaintenanceHistory/{id}
   {
     "status": "Completed",
     "completedDate": "2026-01-22T15:30:00Z",
     "cost": 1500.00
   }
   ```
   - Verify owner receives completion notification with cost

4. **Test Expense Notification:**
   ```
   POST /api/VehicleExpenses
   {
     "vehicleId": "<vehicle-guid>",
     "category": "Fuel",
     "amount": 850.00,
     "date": "2026-01-22",
     "description": "Full tank"
   }
   ```
   - Verify owner receives expense notification

5. **Test Earning Notification:**
   ```
   POST /api/VehicleEarnings
   {
     "vehicleId": "<vehicle-guid>",
     "source": "Trip",
     "amount": 2450.00,
     "date": "2026-01-22",
     "description": "Daily route earnings"
   }
   ```
   - Verify owner receives earning notification

### Verification
- Log in as vehicle owner
- Check message count badge on dashboard
- Open messages inbox
- Verify notification details are correct
- Confirm notifications for all activity types

## Future Enhancements

### Potential Improvements:
1. **Message Priority Levels**: High/medium/low for different notification types
2. **Email Integration**: Send email notifications in addition to in-app messages
3. **SMS Notifications**: For critical maintenance or high-value transactions
4. **Notification Preferences**: Allow owners to customize which events trigger notifications
5. **Batch Notifications**: Daily/weekly summary of all vehicle activities
6. **Click-through Links**: Navigate directly from message to related entity (vehicle/expense/maintenance)
7. **Rich Formatting**: HTML emails with better formatting and branding
8. **Push Notifications**: Real-time mobile notifications
9. **Notification Templates**: Customizable message templates per organization
10. **Multi-language Support**: Translate notifications based on user preferences

## API Endpoints Affected

### Endpoints that now send notifications:
- `POST /api/MaintenanceHistory` - Creates maintenance and sends notification
- `PUT /api/MaintenanceHistory/{id}` - Updates maintenance status and notifies on changes
- `POST /api/VehicleExpenses` - Records expense and notifies owner
- `POST /api/VehicleEarnings` - Records earning and notifies owner

### No breaking changes:
- All endpoints maintain backward compatibility
- Notifications are fire-and-forget (don't affect response)
- API responses remain unchanged

## Configuration

### Environment Variables
None required - uses existing database connection

### Dependencies
- Uses existing MessagingService infrastructure
- Requires Messages table (already created)
- Requires OwnerProfiles table with UserId mapping

## Troubleshooting

### Common Issues:

**1. Owner not receiving notifications:**
- Verify Vehicle.TenantId points to valid OwnerProfile
- Check OwnerProfile.UserId is not null
- Confirm Messages table exists and is accessible

**2. Notifications failing silently:**
- Check application logs for exception details
- Verify database connectivity
- Ensure VehicleNotificationService is registered in DI

**3. Wrong owner receiving notifications:**
- Verify Vehicle.TenantId is correctly set
- Check OwnerProfile associations are correct

## Summary

The Vehicle Activity Notifications System provides automatic, real-time notifications to vehicle owners for all critical activities:
- **Maintenance**: Request → Schedule → Complete workflow
- **Financial**: Expenses and earnings as they occur
- **Reliable**: Fire-and-forget with error handling
- **Integrated**: Uses existing messaging infrastructure
- **Extensible**: Easy to add new notification types

Vehicle owners now stay informed about all activities affecting their vehicles without needing to constantly check dashboards or reports.
