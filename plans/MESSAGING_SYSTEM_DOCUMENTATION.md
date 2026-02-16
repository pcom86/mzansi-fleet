# Messaging System Documentation

## Overview
The messaging system enables user-to-user communication throughout the Mzansi Fleet application, particularly for maintenance requests, tender applications, vehicle rentals, and service provider interactions.

## Components

### Backend

#### Message Entity (`Message.cs`)
- **Location**: `backend/MzansiFleet.Domain/Entities/Message.cs`
- **Properties**:
  - `Id`: Unique identifier
  - `SenderId`, `ReceiverId`: User IDs for sender and receiver
  - `Subject`, `Content`: Message details
  - `IsRead`, `ReadAt`: Read tracking
  - `RelatedEntityType`, `RelatedEntityId`: Links messages to maintenance requests, tenders, rentals, etc.
  - `ParentMessageId`: For threading/replies
  - `IsDeletedBySender`, `IsDeletedByReceiver`: Soft delete flags

#### Messages Controller (`MessagesController.cs`)
- **Location**: `backend/MzansiFleet.Api/Controllers/MessagesController.cs`
- **Endpoints**:
  - `GET /api/Messages/inbox/{userId}` - Get received messages
  - `GET /api/Messages/sent/{userId}` - Get sent messages
  - `GET /api/Messages/conversation/{userId}/{otherUserId}` - Get conversation between two users
  - `GET /api/Messages/{id}` - Get single message
  - `GET /api/Messages/unread-count/{userId}` - Get unread message count
  - `POST /api/Messages` - Send new message
  - `PUT /api/Messages/{id}/mark-as-read` - Mark message as read
  - `DELETE /api/Messages/{id}/sender` - Delete by sender (soft delete)
  - `DELETE /api/Messages/{id}/receiver` - Delete by receiver (soft delete)
  - `GET /api/Messages/related/{entityType}/{entityId}` - Get messages related to an entity

### Frontend

#### Messaging Service (`messaging.service.ts`)
- **Location**: `frontend/src/app/services/messaging.service.ts`
- **Functions**: Wraps all API endpoints with typed responses

#### Messages Inbox Component
- **Location**: `frontend/src/app/components/messages-inbox/`
- **Features**:
  - Two tabs: Inbox and Sent
  - Unread message count badge
  - View, reply, and delete messages
  - Click to open full message thread
  - Automatic mark as read

#### Compose Message Dialog
- **Location**: `frontend/src/app/components/compose-message/`
- **Features**:
  - Subject and content fields with validation
  - Character counter (5000 max)
  - Automatic linking to related entities
  - Pre-filled subject for replies

#### Message Thread Component
- **Location**: `frontend/src/app/components/message-thread/`
- **Features**:
  - Full message view with sender/receiver details
  - Related entity information display
  - Read receipt display
  - Reply and delete actions

#### Send Message Button Component
- **Location**: `frontend/src/app/components/send-message-button/`
- **Purpose**: Reusable button for embedding in other components
- **Usage**: See examples below

## Database Migration

### Apply Migration
```powershell
cd backend
.\apply-messages-migration.ps1
```

### SQL Script
- **Location**: `backend/add-messages-table.sql`
- **Creates**: Messages table with proper indexes and foreign keys

## Integration Examples

### 1. Maintenance Requests

Add messaging to maintenance request views:

```typescript
// In maintenance request component
<app-send-message-button
  [receiverId]="maintenanceRequest.ownerId"
  [receiverName]="maintenanceRequest.ownerName"
  [subject]="'Maintenance Request: ' + maintenanceRequest.vehicleRegistration"
  [relatedEntityType]="'Maintenance'"
  [relatedEntityId]="maintenanceRequest.id"
  buttonText="Message Owner"
  icon="support_agent">
</app-send-message-button>
```

### 2. Tender Applications

Add messaging to tender applications:

```typescript
// In tender application component
<app-send-message-button
  [receiverId]="tender.createdByUserId"
  [receiverName]="tender.createdByName"
  [subject]="'Tender Application: ' + tender.title"
  [relatedEntityType]="'Tender'"
  [relatedEntityId]="tender.id"
  buttonText="Message Tender Creator"
  icon="description">
</app-send-message-button>
```

### 3. Vehicle Rentals

Add messaging to rental offers:

```typescript
// In rental component
<app-send-message-button
  [receiverId]="rental.ownerId"
  [receiverName]="rental.ownerName"
  [subject]="'Vehicle Rental: ' + rental.vehicleName"
  [relatedEntityType]="'Rental'"
  [relatedEntityId]="rental.id"
  buttonText="Message Owner"
  icon="directions_car">
</app-send-message-button>
```

### 4. Service Provider Requests

Add messaging to service provider interactions:

```typescript
// In service provider profile component
<app-send-message-button
  [receiverId]="serviceProvider.userId"
  [receiverName]="serviceProvider.businessName"
  [subject]="'Service Request'"
  [relatedEntityType]="'ServiceRequest'"
  [relatedEntityId]="requestId"
  buttonText="Message Service Provider"
  icon="build">
</app-send-message-button>
```

## Adding Messages to Navigation

### Driver Dashboard
```typescript
// In driver-dashboard.component.ts
menuItems = [
  // ... existing items
  { label: 'Messages', icon: 'inbox', route: '/driver-dashboard/messages' }
];
```

### Owner Dashboard
```typescript
// In owner-dashboard-enhanced.component.ts
menuItems = [
  // ... existing items
  { label: 'Messages', icon: 'inbox', route: '/owner-dashboard/messages' }
];
```

### Admin Dashboards
```typescript
// In admin-dashboard.component.ts
menuItems = [
  // ... existing items
  { label: 'Messages', icon: 'inbox', route: '/admin/messages' }
];
```

## Route Configuration

Add to `app.routes.ts`:

```typescript
// Messages routes for each role
{
  path: 'driver-dashboard',
  component: DriverDashboardComponent,
  children: [
    // ... existing routes
    { path: 'messages', component: MessagesInboxComponent }
  ]
},
{
  path: 'owner-dashboard',
  component: OwnerDashboardEnhancedComponent,
  children: [
    // ... existing routes
    { path: 'messages', component: MessagesInboxComponent }
  ]
},
{
  path: 'admin',
  component: AdminDashboardComponent,
  children: [
    // ... existing routes
    { path: 'messages', component: MessagesInboxComponent }
  ]
}
```

## Notification Badge

To show unread message count in navigation:

```typescript
// In parent component
unreadCount = 0;

ngOnInit() {
  const userId = this.getCurrentUserId();
  this.messagingService.getUnreadCount(userId).subscribe(count => {
    this.unreadCount = count;
  });
  
  // Refresh every 30 seconds
  setInterval(() => {
    this.messagingService.getUnreadCount(userId).subscribe(count => {
      this.unreadCount = count;
    });
  }, 30000);
}
```

```html
<!-- In navigation template -->
<a routerLink="/messages" [matBadge]="unreadCount" matBadgeColor="warn">
  <mat-icon>inbox</mat-icon>
  Messages
</a>
```

## Best Practices

1. **Always provide context**: Use `relatedEntityType` and `relatedEntityId` to link messages to their source
2. **Pre-fill subjects**: Make subjects descriptive, e.g., "Maintenance Request: ABC123"
3. **Handle permissions**: Ensure users can only message relevant parties
4. **Soft deletes**: Messages are soft-deleted, allowing both parties to delete independently
5. **Mark as read**: Messages automatically mark as read when opened by receiver
6. **Threading**: Use `parentMessageId` for reply chains (optional, not implemented in UI yet)

## Testing

1. **Apply migration**:
   ```powershell
   cd backend
   .\apply-messages-migration.ps1
   ```

2. **Test endpoints**:
   - Use Postman or similar to test API endpoints
   - Verify user name lookup works across all profile types

3. **Test UI**:
   - Send messages between different user roles
   - Verify inbox/sent tabs work correctly
   - Test mark as read functionality
   - Test soft delete from both sender and receiver
   - Verify unread count updates

4. **Test integrations**:
   - Add send message buttons to maintenance requests
   - Test related entity linking
   - Verify messages show correct context

## Future Enhancements

1. **Real-time notifications**: Add SignalR for instant message notifications
2. **Message threading**: Implement full conversation threading UI
3. **Attachments**: Allow file attachments to messages
4. **Push notifications**: Mobile push notifications for new messages
5. **Search**: Add message search functionality
6. **Archive**: Add archive functionality separate from delete
7. **Templates**: Pre-defined message templates for common scenarios
